import { createTranslator, type Translate } from "@/lib/i18n/translate";
import { round2, sum } from "./money";
import type { RuleParams } from "./rule-params";
import { clampToYear, optionalRule, requireRule, toRuleUse } from "./rule-set";
import type {
  IncomeItem,
  Line,
  ResolvedRule,
  RuleSet,
  RuleUse,
  TaxInputs,
  TaxResult,
  TaxWarning,
  WithholdingKind,
} from "./types";

export const ENGINE_VERSION = "1.0.0";

/** Size of the probe used to measure the marginal rate. */
const MARGINAL_PROBE = 1000;

type Bands = RuleParams<"TAX_BANDS">["bands"];

interface BandSlice {
  base: number;
  rate: number;
  tax: number;
}

/**
 * Taxes `amount` on a progressive schedule, starting `offset` rupees into it.
 * `maxRate` caps each band's rate (used for foreign-currency income stacked on local income).
 */
export function taxOnBands(amount: number, bands: Bands, offset = 0, maxRate?: number): BandSlice[] {
  const slices: BandSlice[] = [];
  let remaining = round2(Math.max(amount, 0));
  let skip = round2(Math.max(offset, 0));

  for (const band of bands) {
    if (remaining <= 0) break;
    let room = band.width === null ? Infinity : band.width;
    if (skip > 0) {
      const skipped = Math.min(skip, room);
      skip = round2(skip - skipped);
      room -= skipped;
    }
    if (room <= 0) continue;
    const base = round2(Math.min(remaining, room));
    const rate = maxRate === undefined ? band.rate : Math.min(band.rate, maxRate);
    const last = slices[slices.length - 1];
    if (last && last.rate === rate) {
      last.base = round2(last.base + base);
      last.tax = round2(last.base * rate);
    } else {
      slices.push({ base, rate, tax: round2(base * rate) });
    }
    remaining = round2(remaining - base);
  }
  return slices;
}

const pct = (rate: number) => `${round2(rate * 100)}%`;
const rs = (amount: number) => `Rs. ${amount.toLocaleString("en-LK")}`;

function defaultWithholdingKind(item: IncomeItem): WithholdingKind {
  switch (item.kind) {
    case "SALARY":
    case "TERMINAL_BENEFIT":
      return "APIT";
    case "CAPITAL_GAIN":
      return "CGT_PAID";
    case "DIVIDEND_RESIDENT_COMPANY":
      return "FINAL_WHT";
    default:
      return "AIT";
  }
}

function categoryOf(kind: IncomeItem["kind"]): keyof TaxResult["incomeByCategory"] {
  switch (kind) {
    case "SALARY":
    case "TERMINAL_BENEFIT":
      return "employment";
    case "BUSINESS":
    case "SPECIAL_RATE_BUSINESS":
      return "business";
    case "OTHER":
      return "other";
    default:
      return "investment";
  }
}

function computeCore(inputs: TaxInputs, ruleSet: RuleSet, t: Translate): TaxResult {
  const used = new Map<string, RuleUse>();
  // Records every rule version the calculation relies on, for the snapshot and the "Why?" panels.
  const track = (rule: ResolvedRule) => {
    used.set(rule.id, toRuleUse(rule));
    return rule.id;
  };
  const warnings: TaxWarning[] = [];
  const warn = (code: string, message: string, severity: TaxWarning["severity"] = "warning") => {
    if (!warnings.some((w) => w.code === code && w.message === message)) warnings.push({ code, severity, message });
  };

  const { residency } = inputs;
  const isNonResident = residency !== "RESIDENT";
  if (isNonResident) {
    warn(
      "NON_RESIDENT_SIMPLIFIED",
      t("Non-resident calculations are simplified: only Sri Lanka-source income is included and treaty relief is not modelled. Confirm with a tax professional."),
      "info",
    );
  }

  const incomeLines: Line[] = [];
  const excludedLines: Line[] = [];
  const taxLines: Line[] = [];
  const incomeByCategory = { employment: 0, business: 0, investment: 0, other: 0 };

  // Pools of income that are taxed differently.
  let localOrdinary = 0; // progressive rates
  let foreignRemitted = 0; // progressive rates capped at the foreign-income maximum
  let terminal = 0; // concessionary bands
  const business = { LOCAL: 0, FOREIGN_REMITTED: 0, SPECIAL_RATE: 0 };
  let rentTotal = 0;
  let localForeignSourceGross = 0; // foreign-source income taxed in the local pool
  const taxableGains: { item: IncomeItem; gain: number }[] = [];

  let finalWithholdingTax = 0;
  const credit = { APIT: 0, AIT: 0, CGT_PAID: 0 };
  let foreignTaxOnRemitted = 0;
  let foreignTaxOnLocalPool = 0;

  const foreignCap = optionalRule(ruleSet, "FOREIGN_INCOME_CAP", "remitted");

  const exclude = (item: IncomeItem, why: string, ruleId?: string) => {
    excludedLines.push({ code: `EXCLUDED_${item.kind}`, label: item.label, amount: round2(item.amount), why, ruleId });
    const withheld = item.withholding ?? 0;
    if (withheld > 0 && item.kind !== "DIVIDEND_RESIDENT_COMPANY") {
      warn(
        "WITHHOLDING_ON_EXCLUDED_INCOME",
        t("Tax of {amount} was withheld on \"{label}\", which is not included in assessable income. It is not claimed as a credit here; check whether a refund applies.", { amount: rs(withheld), label: item.label }),
      );
    }
  };

  // ── 1. Capital gains need the whole year's picture for the small-gains exemption.
  const gainItems = inputs.income.filter((i) => i.kind === "CAPITAL_GAIN");
  const cgExemption = optionalRule(ruleSet, "CAPITAL_GAINS_EXEMPTION", "small_gains");
  const candidateGains = gainItems.filter(
    (i) => !i.exemptReason && (i.capitalGainExemption ?? "NONE") === "NONE" && i.amount > 0 && !(isNonResident && i.foreignSource),
  );
  const totalCandidateGains = sum(candidateGains.map((i) => i.amount));
  const smallGainsApply =
    cgExemption !== null && residency === "RESIDENT" && totalCandidateGains <= cgExemption.params.annualGainsLimit;

  // ── 2. Classify every income item.
  for (const item of inputs.income) {
    const amount = round2(item.amount);
    if (amount < 0 && item.kind !== "CAPITAL_GAIN") {
      throw new RangeError(`Income amount cannot be negative: ${item.label}`);
    }
    const withheld = round2(item.withholding ?? 0);
    const withholdingKind = item.withholdingKind ?? defaultWithholdingKind(item);

    if (isNonResident && item.foreignSource) {
      exclude(item, t("Non-residents are taxed only on income arising in or derived from a source in Sri Lanka."));
      continue;
    }
    if (item.exemptReason) {
      exclude(item, t("Declared exempt: {reason}", { reason: item.exemptReason }));
      continue;
    }

    if (item.kind === "DIVIDEND_RESIDENT_COMPANY") {
      const dividend = requireRule(ruleSet, "DIVIDEND_TREATMENT", "resident_company");
      if (dividend.params.finalWithholding) {
        const ruleId = track(dividend.rule);
        exclude(
          item,
          t("Dividends from a resident company are subject to {rate} final withholding tax and are not added to assessable income.", { rate: pct(dividend.params.rate) }),
          ruleId,
        );
        finalWithholdingTax = round2(finalWithholdingTax + withheld);
        if (withheld === 0 && amount > 0) {
          const tax = round2(amount * dividend.params.rate);
          taxLines.push({
            code: "FINAL_WHT_NOT_DEDUCTED",
            label: t("Final withholding tax not deducted — {label}", { label: item.label }),
            amount: tax,
            base: amount,
            rate: dividend.params.rate,
            ruleId,
            why: t("No withholding tax was recorded on this dividend. Where the payer failed to deduct final withholding tax, the recipient pays it through the return."),
          });
        }
        continue;
      }
    }

    if (item.kind === "CAPITAL_GAIN") {
      const exemption = item.capitalGainExemption ?? "NONE";
      if (exemption === "LISTED_SHARES") {
        exclude(item, t("Gains on shares quoted on a stock exchange licensed by the SEC of Sri Lanka are exempt."));
        continue;
      }
      if (exemption === "PRINCIPAL_RESIDENCE") {
        exclude(item, t("Gain on a principal residence owned for three years and lived in for two of them is exempt."));
        continue;
      }
      if (amount <= 0) {
        if (amount < 0) {
          exclude(item, t("Loss on realisation. Investment losses are not offset in this estimate."));
          warn(
            "CAPITAL_LOSS_NOT_OFFSET",
            t("A loss on an investment asset is recorded. Investment losses may be deductible against investment income and carried forward; this estimate does not offset them."),
          );
        }
        continue;
      }
      if (smallGainsApply && cgExemption && amount <= cgExemption.params.perGainLimit) {
        exclude(
          item,
          t("Gain does not exceed {perGain} and total gains for the year do not exceed {annual}.", { perGain: rs(cgExemption.params.perGainLimit), annual: rs(cgExemption.params.annualGainsLimit) }),
          track(cgExemption.rule),
        );
        continue;
      }
      taxableGains.push({ item, gain: amount });
      incomeByCategory.investment = round2(incomeByCategory.investment + amount);
      incomeLines.push({ code: "CAPITAL_GAIN", label: item.label, amount });
      credit.CGT_PAID = round2(credit.CGT_PAID + withheld);
      continue;
    }

    const remittedForeign = Boolean(item.foreignCurrencyRemitted) && item.kind !== "TERMINAL_BENEFIT";
    if (remittedForeign) {
      if (!foreignCap) {
        warn(
          "FOREIGN_RULE_MISSING",
          t("No rule covers foreign-currency income for {year}; \"{label}\" is taxed at normal rates. This needs verification.", { year: ruleSet.taxYear.code, label: item.label }),
        );
      } else if (foreignCap.params.treatment === "EXEMPT") {
        exclude(
          item,
          t("Service-export and foreign-source income received in foreign currency and remitted through a bank was exempt for this year of assessment."),
          track(foreignCap.rule),
        );
        continue;
      }
    }
    const toForeignPool = remittedForeign && foreignCap?.params.treatment === "CAPPED";
    if (toForeignPool && foreignCap) track(foreignCap.rule);

    // Included income.
    if (withholdingKind === "APIT") credit.APIT = round2(credit.APIT + withheld);
    else if (withholdingKind === "AIT") credit.AIT = round2(credit.AIT + withheld);
    else if (withholdingKind === "FINAL_WHT") finalWithholdingTax = round2(finalWithholdingTax + withheld);

    const foreignTax = round2(item.foreignTaxPaid ?? 0);
    if (toForeignPool) foreignTaxOnRemitted = round2(foreignTaxOnRemitted + foreignTax);
    else if (item.foreignSource) {
      foreignTaxOnLocalPool = round2(foreignTaxOnLocalPool + foreignTax);
      localForeignSourceGross = round2(localForeignSourceGross + amount);
    }

    incomeLines.push({ code: item.kind, label: item.label, amount });

    if (item.kind === "TERMINAL_BENEFIT") {
      terminal = round2(terminal + amount);
      incomeByCategory.employment = round2(incomeByCategory.employment + amount);
      continue;
    }
    if (item.kind === "SPECIAL_RATE_BUSINESS") {
      business.SPECIAL_RATE = round2(business.SPECIAL_RATE + amount);
      continue;
    }
    if (item.kind === "BUSINESS") {
      const pool = toForeignPool ? "FOREIGN_REMITTED" : "LOCAL";
      business[pool] = round2(business[pool] + amount);
      continue;
    }
    if (item.kind === "RENT") rentTotal = round2(rentTotal + amount);

    const category = categoryOf(item.kind);
    incomeByCategory[category] = round2(incomeByCategory[category] + amount);
    if (toForeignPool) foreignRemitted = round2(foreignRemitted + amount);
    else localOrdinary = round2(localOrdinary + amount);
  }

  // ── 3. Business income: receipts less deductible expenses, per pool, losses spilling over.
  const expenses = { LOCAL: 0, FOREIGN_REMITTED: 0, SPECIAL_RATE: 0 };
  for (const expense of inputs.deductibleExpenses) {
    if (expense.amount < 0) throw new RangeError(`Expense amount cannot be negative: ${expense.label}`);
    expenses[expense.pool] = round2(expenses[expense.pool] + expense.amount);
  }
  if (foreignCap?.params.treatment === "EXEMPT" && expenses.FOREIGN_REMITTED > 0) {
    warn("EXPENSES_AGAINST_EXEMPT_INCOME", t("Expenses linked to exempt foreign-currency income are not deducted."));
    expenses.FOREIGN_REMITTED = 0;
  }
  const totalBusinessExpenses = sum(Object.values(expenses));
  const grossBusiness = sum(Object.values(business));
  const pools = ["LOCAL", "FOREIGN_REMITTED", "SPECIAL_RATE"] as const;
  const net = {
    LOCAL: round2(business.LOCAL - expenses.LOCAL),
    FOREIGN_REMITTED: round2(business.FOREIGN_REMITTED - expenses.FOREIGN_REMITTED),
    SPECIAL_RATE: round2(business.SPECIAL_RATE - expenses.SPECIAL_RATE),
  };
  let shortfall = 0;
  for (const pool of pools) {
    if (net[pool] < 0) {
      shortfall = round2(shortfall - net[pool]);
      net[pool] = 0;
    }
  }
  for (const pool of pools) {
    if (shortfall <= 0) break;
    const absorbed = Math.min(shortfall, net[pool]);
    net[pool] = round2(net[pool] - absorbed);
    shortfall = round2(shortfall - absorbed);
  }
  if (shortfall > 0) {
    warn(
      "BUSINESS_LOSS",
      t("Deductible business expenses exceed business income by {amount}. The loss is not deducted from other income in this estimate; business losses may be carried forward for up to six years — ask a tax professional.", { amount: rs(shortfall) }),
    );
  }
  if (totalBusinessExpenses > 0) {
    incomeLines.push({
      code: "BUSINESS_EXPENSES",
      label: t("Less: deductible business expenses"),
      amount: -round2(grossBusiness - sum(Object.values(net))),
      why: t("Expenses classified as deductible and linked to a business, professional or freelance income source reduce business income. Expenses cannot be deducted from employment income."),
    });
  }
  incomeByCategory.business = sum(Object.values(net));
  localOrdinary = round2(localOrdinary + net.LOCAL);
  foreignRemitted = round2(foreignRemitted + net.FOREIGN_REMITTED);
  const special = net.SPECIAL_RATE;

  const totalGains = sum(taxableGains.map((g) => g.gain));
  const ordinary = round2(localOrdinary + foreignRemitted + special);
  const assessableIncome = round2(ordinary + terminal + totalGains);

  // ── 4. Reliefs and qualifying payments.
  const reliefLines: Line[] = [];
  const qualifyingPaymentLines: Line[] = [];

  const rentRelief = optionalRule(ruleSet, "RENT_RELIEF", "investment_asset");
  if (rentRelief && rentTotal > 0 && rentRelief.params.appliesTo.includes(residency)) {
    reliefLines.push({
      code: "RENT_RELIEF",
      label: t("Rent relief ({percent} of rental income)", { percent: pct(rentRelief.params.percent) }),
      amount: round2(rentTotal * rentRelief.params.percent),
      base: rentTotal,
      rate: rentRelief.params.percent,
      ruleId: track(rentRelief.rule),
      why: t("An individual with rental income from an investment asset may deduct {percent} of the total rental income for the year.", { percent: pct(rentRelief.params.percent) }),
    });
  }

  const personalRelief = requireRule(ruleSet, "PERSONAL_RELIEF", "individual");
  if (personalRelief.params.appliesTo.includes(residency)) {
    reliefLines.push({
      code: "PERSONAL_RELIEF",
      label: t("Personal relief"),
      amount: personalRelief.params.amount,
      ruleId: track(personalRelief.rule),
      why: t("Every resident individual, and every non-resident citizen of Sri Lanka, may deduct the personal relief from assessable income. It cannot be set against gains on the realisation of investment assets."),
    });
  } else {
    warn("NO_PERSONAL_RELIEF", t("Personal relief is not available to a non-resident who is not a citizen of Sri Lanka."), "info");
  }

  const paid = (kind: TaxInputs["qualifyingPayments"][number]["kind"]) =>
    sum(inputs.qualifyingPayments.filter((q) => q.kind === kind).map((q) => q.amount));

  const solarPaid = paid("SOLAR_PANEL");
  const solar = optionalRule(ruleSet, "SOLAR_RELIEF", "grid_connected");
  if (solarPaid > 0 && solar && solar.params.appliesTo.includes(residency)) {
    reliefLines.push({
      code: "SOLAR_RELIEF",
      label: t("Solar panel relief"),
      amount: round2(Math.min(solarPaid, solar.params.annualCap)),
      ruleId: track(solar.rule),
      why: t("Expenditure on solar panels fixed to your premises and connected to the national grid is deductible up to {amount} for each year of assessment.", { amount: rs(solar.params.annualCap) }),
    });
  }

  const governmentPaid = paid("GOVERNMENT_DONATION");
  const government = optionalRule(ruleSet, "GOVERNMENT_DONATION", "government");
  if (governmentPaid > 0 && government?.params.fullyDeductible) {
    qualifyingPaymentLines.push({
      code: "GOVERNMENT_DONATION",
      label: t("Donations to the Government / specified institutions"),
      amount: governmentPaid,
      ruleId: track(government.rule),
      why: t("Donations made in money or otherwise to the Government of Sri Lanka or a specified institution are qualifying payments deductible in full."),
    });
  }

  const samurdhiPaid = paid("SAMURDHI_SHOP");
  if (samurdhiPaid > 0 && residency === "RESIDENT") {
    qualifyingPaymentLines.push({
      code: "SAMURDHI_SHOP",
      label: t("Contribution to establish a shop for a Samurdhi beneficiary"),
      amount: samurdhiPaid,
      why: t("A contribution by a resident individual to establish a shop for a female individual from a Samurdhi beneficiary family, as confirmed by the Department of Samurdhi Development, is a qualifying payment."),
    });
  }

  const charityPaid = paid("CHARITY_DONATION");
  const charity = optionalRule(ruleSet, "CHARITY_DONATION", "approved_charity");
  if (charityPaid > 0 && charity) {
    const before = sum([...reliefLines, ...qualifyingPaymentLines].map((l) => l.amount));
    const taxableBeforeCharity = Math.max(round2(assessableIncome - before), 0);
    const allowed = round2(
      Math.min(charityPaid, charity.params.cap, taxableBeforeCharity * charity.params.taxableIncomeFraction),
    );
    qualifyingPaymentLines.push({
      code: "CHARITY_DONATION",
      label: t("Donations to approved charitable institutions"),
      amount: allowed,
      base: charityPaid,
      ruleId: track(charity.rule),
      why: t("Donations in money to an approved charitable institution are deductible up to the lowest of the amount donated, {cap}, and one-third of taxable income. You donated {paid}.", { cap: rs(charity.params.cap), paid: rs(charityPaid) }),
    });
  }

  const claimed = sum([...reliefLines, ...qualifyingPaymentLines].map((l) => l.amount));
  // Deductions reduce ordinary income only: never capital gains, and (conservatively) not terminal benefits.
  const totalDeductions = round2(Math.min(claimed, ordinary));
  const otherThanPersonal = sum(
    [...reliefLines, ...qualifyingPaymentLines].filter((l) => l.code !== "PERSONAL_RELIEF").map((l) => l.amount),
  );
  if (otherThanPersonal > ordinary) {
    warn("UNUSED_DEDUCTIONS", t("Reliefs and qualifying payments exceed the income they can be set against; the excess gives no benefit this year."), "info");
  }

  // Local income first: under the stacking model below this is never worse for the taxpayer.
  let remaining = totalDeductions;
  const takeFrom = (amount: number) => {
    const taken = Math.min(remaining, amount);
    remaining = round2(remaining - taken);
    return round2(amount - taken);
  };
  const taxableLocal = takeFrom(localOrdinary);
  const taxableForeign = takeFrom(foreignRemitted);
  const taxableSpecial = takeFrom(special);
  const taxableIncome = round2(taxableLocal + taxableForeign + taxableSpecial + terminal + totalGains);

  // ── 5. Tax.
  const bands = requireRule(ruleSet, "TAX_BANDS", "individual");
  const bandsRuleId = track(bands.rule);

  let localTax = 0;
  for (const slice of taxOnBands(taxableLocal, bands.params.bands)) {
    localTax = round2(localTax + slice.tax);
    taxLines.push({
      code: "PROGRESSIVE",
      label: t("Taxable income at {rate}", { rate: pct(slice.rate) }),
      amount: slice.tax,
      base: slice.base,
      rate: slice.rate,
      ruleId: bandsRuleId,
      why: t("Taxable income is taxed in bands at progressively higher rates. Only the part of your income that falls inside a band is taxed at that band's rate."),
    });
  }

  let foreignTax = 0;
  if (taxableForeign > 0 && foreignCap?.params.treatment === "CAPPED") {
    const { maxRate } = foreignCap.params;
    for (const slice of taxOnBands(taxableForeign, bands.params.bands, taxableLocal, maxRate)) {
      foreignTax = round2(foreignTax + slice.tax);
      taxLines.push({
        code: "FOREIGN_CAPPED",
        label: t("Foreign-currency income at {rate} (maximum {max})", { rate: pct(slice.rate), max: pct(maxRate) }),
        amount: slice.tax,
        base: slice.base,
        rate: slice.rate,
        ruleId: foreignCap.rule.id,
        why: t("Income earned in foreign currency and remitted to Sri Lanka through a bank — including service exports — is taxed at the normal rates but never above {max}.", { max: pct(maxRate) }),
      });
    }
  }

  if (taxableSpecial > 0) {
    const specialRate = requireRule(ruleSet, "SPECIAL_RATE", "betting_liquor_tobacco");
    taxLines.push({
      code: "SPECIAL_RATE",
      label: t("Betting, gaming, liquor or tobacco business at {rate}", { rate: pct(specialRate.params.rate) }),
      amount: round2(taxableSpecial * specialRate.params.rate),
      base: taxableSpecial,
      rate: specialRate.params.rate,
      ruleId: track(specialRate.rule),
    });
  }

  if (terminal > 0) {
    const terminalBands = requireRule(ruleSet, "TERMINAL_BENEFIT_BANDS", "concessionary");
    const ruleId = track(terminalBands.rule);
    for (const slice of taxOnBands(terminal, terminalBands.params.bands)) {
      taxLines.push({
        code: "TERMINAL_BENEFIT",
        label: t("Terminal benefits at {rate}", { rate: pct(slice.rate) }),
        amount: slice.tax,
        base: slice.base,
        rate: slice.rate,
        ruleId,
        why: t("Commuted pensions, retiring gratuities, approved compensation for loss of office and ETF payments are taxed at concessionary rates, separately from other income."),
      });
    }
  }

  // Capital gains: the rate in force on the day each asset was realised.
  const gainsByRule = new Map<string, { rule: ResolvedRule; rate: number; base: number }>();
  for (const { item, gain } of taxableGains) {
    if (!item.date) {
      warn("CAPITAL_GAIN_UNDATED", t("\"{label}\" has no disposal date; the rate at the end of the year of assessment was used.", { label: item.label }));
    }
    const picked = requireRule(ruleSet, "CAPITAL_GAINS_RATE", "individual", clampToYear(ruleSet, item.date));
    track(picked.rule);
    const bucket = gainsByRule.get(picked.rule.id) ?? { rule: picked.rule, rate: picked.params.rate, base: 0 };
    bucket.base = round2(bucket.base + gain);
    gainsByRule.set(picked.rule.id, bucket);
  }
  for (const { rule, rate, base } of gainsByRule.values()) {
    taxLines.push({
      code: "CAPITAL_GAINS",
      label: t("Gains on investment assets at {rate}", { rate: pct(rate) }),
      amount: round2(base * rate),
      base,
      rate,
      ruleId: rule.id,
      why: rule.effectiveTo
        ? t("Gains on the realisation of investment assets are taxed at a flat rate, not at the progressive rates. {rate} applied to realisations {from} to {to}.", { rate: pct(rate), from: rule.effectiveFrom, to: rule.effectiveTo })
        : t("Gains on the realisation of investment assets are taxed at a flat rate, not at the progressive rates. {rate} applied to realisations from {from}.", { rate: pct(rate), from: rule.effectiveFrom }),
    });
  }

  const totalTax = sum(taxLines.map((l) => l.amount));

  // ── 6. Credits.
  const creditLines: Line[] = [];
  const addCredit = (code: string, label: string, amount: number, why?: string) => {
    if (amount > 0) creditLines.push({ code, label, amount: round2(amount), why });
  };
  const payments = (kind: TaxInputs["payments"][number]["kind"]) =>
    sum(inputs.payments.filter((p) => p.kind === kind).map((p) => p.amount));

  addCredit(
    "APIT",
    t("APIT deducted by employers"),
    credit.APIT + payments("APIT"),
    t("Advance Personal Income Tax your employer deducted from your pay is credited against your tax for the year. Keep the T.10 certificate."),
  );
  addCredit(
    "AIT",
    t("AIT / WHT deducted at source"),
    credit.AIT + payments("WITHHOLDING"),
    t("Advance Income Tax withheld on interest, rent and service fees is not a final tax for residents: the income is assessed and the tax withheld is credited."),
  );

  const foreignCreditRemitted = Math.min(foreignTaxOnRemitted, foreignTax);
  const localShare = localOrdinary > 0 ? Math.min(localForeignSourceGross / localOrdinary, 1) : 0;
  const foreignCreditLocal = Math.min(foreignTaxOnLocalPool, round2(localTax * localShare));
  const foreignCredit = round2(foreignCreditRemitted + foreignCreditLocal);
  addCredit(
    "FOREIGN_TAX_CREDIT",
    "Foreign tax credit",
    foreignCredit,
    t("Foreign income tax paid is credited only up to the Sri Lankan tax on that foreign income. Any excess cannot be refunded or used against other tax."),
  );
  if (round2(foreignTaxOnRemitted + foreignTaxOnLocalPool) > foreignCredit) {
    warn("FOREIGN_TAX_CREDIT_LIMITED", t("Part of the foreign tax paid exceeds the Sri Lankan tax on that income and is not creditable."), "info");
  }

  addCredit("CGT_PAID", t("Capital gains tax already paid"), credit.CGT_PAID + payments("CAPITAL_GAINS_TAX"));
  addCredit("INSTALMENTS", t("Quarterly instalments paid"), payments("INSTALMENT"));
  addCredit("FINAL_PAYMENT", t("Final payment"), payments("FINAL_PAYMENT"));
  addCredit("OTHER_PAYMENTS", t("Other tax payments"), payments("OTHER"));

  const totalCredits = sum(creditLines.map((l) => l.amount));
  const balancePayable = round2(totalTax - totalCredits);

  for (const rule of used.values()) {
    if (rule.verification === "REQUIRES_VERIFICATION") {
      warn("RULE_REQUIRES_VERIFICATION", t("\"{name}\" could not be fully verified against an official source and may change.", { name: t(rule.name) }), "info");
    }
  }

  return {
    taxYear: ruleSet.taxYear.code,
    residency,
    incomeByCategory,
    incomeLines,
    excludedLines,
    assessableIncome,
    reliefLines,
    qualifyingPaymentLines,
    totalDeductions,
    taxableIncome,
    taxLines,
    totalTax,
    creditLines,
    totalCredits,
    balancePayable,
    finalWithholdingTax,
    effectiveRate: assessableIncome > 0 ? Math.round((totalTax / assessableIncome) * 10000) / 10000 : 0,
    marginalRate: 0,
    warnings,
    rulesUsed: [...used.values()],
  };
}

/**
 * Computes a year's income tax. Pure and deterministic: the same inputs and rule set always
 * give the same result, and nothing outside the arguments is read. Labels and explanations are
 * written in English and passed through `t`; without one they stay in English.
 */
export function computeTax(inputs: TaxInputs, ruleSet: RuleSet, t: Translate = createTranslator()): TaxResult {
  const result = computeCore(inputs, ruleSet, t);
  const probe = computeCore(
    { ...inputs, income: [...inputs.income, { label: "Marginal probe", kind: "OTHER", amount: MARGINAL_PROBE }] },
    ruleSet,
    t,
  );
  result.marginalRate = Math.round(((probe.totalTax - result.totalTax) / MARGINAL_PROBE) * 10000) / 10000;
  return result;
}
