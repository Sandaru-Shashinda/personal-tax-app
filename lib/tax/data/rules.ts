// Canonical rule definitions, as researched in TAX_RULES.md. This file is the seed for the
// TaxRule / TaxRuleVersion tables and the fixture for engine tests. At runtime the application
// reads rules from the database, never from here.

import type { ResolvedRule, RuleSet, RuleType, Verification } from "../types";
import { LAST_VERIFIED, SOURCES } from "./sources";

export interface TaxYearSeed {
  code: string;
  startsOn: string;
  endsOn: string;
  status: "UPCOMING" | "CURRENT" | "CLOSED";
}

export interface RuleVersionSeed {
  version: number;
  parameters: unknown;
  effectiveFrom: string;
  effectiveTo: string | null;
  verification: Verification;
  sourceRef: string | null;
  sourceLocator: string | null;
  notes: string | null;
}

export interface RuleSeed {
  taxYear: string;
  ruleType: RuleType;
  key: string;
  name: string;
  description: string;
  versions: RuleVersionSeed[];
}

export const TAX_YEARS: TaxYearSeed[] = [
  { code: "2024/2025", startsOn: "2024-04-01", endsOn: "2025-03-31", status: "CLOSED" },
  { code: "2025/2026", startsOn: "2025-04-01", endsOn: "2026-03-31", status: "CLOSED" },
  { code: "2026/2027", startsOn: "2026-04-01", endsOn: "2027-03-31", status: "CURRENT" },
];

const RESIDENT_OR_CITIZEN = ["RESIDENT", "NON_RESIDENT_CITIZEN"];
const RESIDENT_ONLY = ["RESIDENT"];

interface YearFacts {
  year: TaxYearSeed;
  /** Primary source for the year's rates. */
  chart: string;
  chartVerification: Verification;
  carriedForwardNote: string | null;
  personalRelief: number;
  bands: { width: number | null; rate: number }[];
  specialRate: number;
  interestAit: { rate: number; verification: Verification; sourceRef: string };
  foreign: { parameters: unknown; verification: Verification; sourceRef: string; locator: string; notes: string | null };
  capitalGains: { rate: number; from: string; to: string | null; sourceRef: string; locator: string; verification: Verification; notes: string | null }[];
  instalmentBasis: "CURRENT_YEAR_ESTIMATE" | "PRIOR_YEAR_LIABILITY";
  filingInterestTolerance: number;
}

const FACTS: YearFacts[] = [
  {
    year: TAX_YEARS[0],
    chart: "S6",
    chartVerification: "VERIFIED",
    carriedForwardNote: null,
    personalRelief: 1_200_000,
    bands: [
      { width: 500_000, rate: 0.06 },
      { width: 500_000, rate: 0.12 },
      { width: 500_000, rate: 0.18 },
      { width: 500_000, rate: 0.24 },
      { width: 500_000, rate: 0.3 },
      { width: null, rate: 0.36 },
    ],
    specialRate: 0.4,
    interestAit: { rate: 0.05, verification: "VERIFIED_SECONDARY", sourceRef: "S9" },
    foreign: {
      parameters: { treatment: "EXEMPT" },
      verification: "VERIFIED_SECONDARY",
      sourceRef: "S1",
      locator: "§3 (exemptions removed from 1 April 2025)",
      notes: "Exemption before 2025-04-01 inferred from the notice removing it (TAX_RULES.md U9).",
    },
    capitalGains: [
      { rate: 0.1, from: "2024-04-01", to: null, sourceRef: "S6", locator: "Investment asset gains", verification: "VERIFIED", notes: null },
    ],
    instalmentBasis: "CURRENT_YEAR_ESTIMATE",
    filingInterestTolerance: 0,
  },
  {
    year: TAX_YEARS[1],
    chart: "S4",
    chartVerification: "VERIFIED",
    carriedForwardNote: null,
    personalRelief: 1_800_000,
    bands: [
      { width: 1_000_000, rate: 0.06 },
      { width: 500_000, rate: 0.18 },
      { width: 500_000, rate: 0.24 },
      { width: 500_000, rate: 0.3 },
      { width: null, rate: 0.36 },
    ],
    specialRate: 0.45,
    interestAit: { rate: 0.1, verification: "VERIFIED", sourceRef: "S1" },
    foreign: {
      parameters: { treatment: "CAPPED", maxRate: 0.15 },
      verification: "REQUIRES_VERIFICATION",
      sourceRef: "S4",
      locator: "Schedule 8(e); Annexure 7; Examples 2, 3, 6",
      notes:
        "The 15% maximum is verified. How it interacts with the progressive bands is an interpretation that reproduces Annexure 7 and the Guide's worked examples (TAX_RULES.md U1).",
    },
    capitalGains: [
      { rate: 0.1, from: "2025-04-01", to: null, sourceRef: "S4", locator: "Schedule 8(c)", verification: "VERIFIED", notes: null },
    ],
    instalmentBasis: "CURRENT_YEAR_ESTIMATE",
    filingInterestTolerance: 5_000,
  },
  {
    year: TAX_YEARS[2],
    chart: "S1",
    chartVerification: "VERIFIED",
    carriedForwardNote:
      "Carried forward from Y/A 2025/2026: the IRD notice states the change applies to years of assessment commencing from 2025/2026, and Act No. 11 of 2026 does not alter it. IRD had not published a 2026/2027 tax chart or APIT tables when this was last verified — confirm on publication (TAX_RULES.md U2).",
    personalRelief: 1_800_000,
    bands: [
      { width: 1_000_000, rate: 0.06 },
      { width: 500_000, rate: 0.18 },
      { width: 500_000, rate: 0.24 },
      { width: 500_000, rate: 0.3 },
      { width: null, rate: 0.36 },
    ],
    specialRate: 0.45,
    interestAit: { rate: 0.1, verification: "VERIFIED", sourceRef: "S1" },
    foreign: {
      parameters: { treatment: "CAPPED", maxRate: 0.15 },
      verification: "REQUIRES_VERIFICATION",
      sourceRef: "S4",
      locator: "Schedule 8(e); Annexure 7; Examples 2, 3, 6",
      notes: "Carried forward from Y/A 2025/2026; mechanics are an interpretation (TAX_RULES.md U1).",
    },
    capitalGains: [
      {
        rate: 0.1,
        from: "2026-04-01",
        to: "2026-06-02",
        sourceRef: "S4",
        locator: "Schedule 8(c)",
        verification: "VERIFIED",
        notes: "Rate in force until Act No. 11 of 2026 took effect.",
      },
      {
        rate: 0.15,
        from: "2026-06-03",
        to: null,
        sourceRef: "S2",
        locator: "§20 Revision of Capital Gain Tax Rates",
        verification: "REQUIRES_VERIFICATION",
        notes:
          "The 15% rate and the 3 June 2026 date are verified from the IRD notice. Applying it by realisation date within the year is an interpretation; the Act's transitional wording was not read (TAX_RULES.md U3).",
      },
    ],
    instalmentBasis: "PRIOR_YEAR_LIABILITY",
    filingInterestTolerance: 5_000,
  },
];

function single(
  from: string,
  parameters: unknown,
  verification: Verification,
  sourceRef: string | null,
  sourceLocator: string | null,
  notes: string | null = null,
): RuleVersionSeed[] {
  return [{ version: 1, parameters, effectiveFrom: from, effectiveTo: null, verification, sourceRef, sourceLocator, notes }];
}

function rulesFor(f: YearFacts): RuleSeed[] {
  const y = f.year.code;
  const from = f.year.startsOn;
  const rule = (ruleType: RuleType, key: string, name: string, description: string, versions: RuleVersionSeed[]): RuleSeed => ({
    taxYear: y,
    ruleType,
    key,
    name,
    description,
    versions,
  });
  const wht = (
    key: string,
    name: string,
    description: string,
    params: { rate: number; isFinal: boolean; monthlyThreshold: number | null; creditable: boolean },
    verification: Verification = "VERIFIED",
    sourceRef = "S4",
    locator = "Annexure 4",
  ) => rule("WITHHOLDING_RATE", key, name, description, single(from, params, verification, sourceRef, locator));

  return [
    rule(
      "PERSONAL_RELIEF",
      "individual",
      "Personal relief",
      "Deducted from assessable income by resident individuals and non-resident citizens. Not available against gains on realisation of investment assets.",
      single(
        from,
        { amount: f.personalRelief, appliesTo: RESIDENT_OR_CITIZEN },
        f.chartVerification,
        f.chart,
        f.chart === "S4" ? "Annexure 1(a)" : f.chart === "S1" ? "§1 Personal Relief" : "Personal Relief",
        f.carriedForwardNote,
      ),
    ),
    rule(
      "TAX_BANDS",
      "individual",
      "Progressive income tax rates",
      "Rates applied to taxable income of resident and non-resident individuals, band by band.",
      single(
        from,
        { bands: f.bands },
        f.chartVerification,
        f.chart,
        f.chart === "S4" ? "Annexure 7" : f.chart === "S1" ? "§2.1(a)" : "Tax rates — individuals",
        f.carriedForwardNote,
      ),
    ),
    rule(
      "CAPITAL_GAINS_RATE",
      "individual",
      "Tax on gains from realisation of investment assets",
      "Flat rate on gains from realising investment assets, applied by the date of realisation.",
      f.capitalGains.map((g, i) => ({
        version: i + 1,
        parameters: { rate: g.rate },
        effectiveFrom: g.from,
        effectiveTo: g.to,
        verification: g.verification,
        sourceRef: g.sourceRef,
        sourceLocator: g.locator,
        notes: g.notes,
      })),
    ),
    rule(
      "CAPITAL_GAINS_EXEMPTION",
      "small_gains",
      "Small gains exemption",
      "A gain not exceeding Rs. 50,000 is exempt for a resident individual where total gains in the year do not exceed Rs. 600,000.",
      single(from, { perGainLimit: 50_000, annualGainsLimit: 600_000 }, "VERIFIED", "S4", "Annexure 2(1)(e)"),
    ),
    rule(
      "FOREIGN_INCOME_CAP",
      "remitted",
      "Service exports and foreign-source income remitted in foreign currency",
      "Treatment of income earned in foreign currency and remitted to Sri Lanka through a bank.",
      single(from, f.foreign.parameters, f.foreign.verification, f.foreign.sourceRef, f.foreign.locator, f.foreign.notes),
    ),
    rule(
      "SPECIAL_RATE",
      "betting_liquor_tobacco",
      "Betting, gaming, liquor and tobacco businesses",
      "Flat rate on income from a business of betting and gaming, or the manufacture and sale or import and sale of liquor or tobacco.",
      single(from, { rate: f.specialRate }, "VERIFIED", f.chart === "S6" ? "S6" : "S1", f.chart === "S6" ? "Special rates" : "§2.1(c)"),
    ),
    rule(
      "TERMINAL_BENEFIT_BANDS",
      "concessionary",
      "Terminal benefits — concessionary rates",
      "Rates for commuted pensions, retiring gratuities, approved compensation for loss of office and ETF payments.",
      single(
        from,
        { bands: [{ width: 10_000_000, rate: 0 }, { width: 10_000_000, rate: 0.06 }, { width: null, rate: 0.12 }] },
        "VERIFIED",
        f.chart === "S6" ? "S6" : "S4",
        f.chart === "S6" ? "Terminal benefits" : "Annexure 6",
      ),
    ),
    rule(
      "RENT_RELIEF",
      "investment_asset",
      "Rent relief",
      "25% of total rental income from an investment asset, for resident individuals.",
      single(from, { percent: 0.25, appliesTo: RESIDENT_ONLY }, "VERIFIED", f.chart === "S6" ? "S6" : "S4", f.chart === "S6" ? "Reliefs" : "Annexure 1(b)"),
    ),
    rule(
      "SOLAR_RELIEF",
      "grid_connected",
      "Solar panel relief",
      "Expenditure on solar panels fixed to the individual's premises and connected to the national grid, up to Rs. 600,000 a year.",
      single(from, { annualCap: 600_000, appliesTo: RESIDENT_ONLY }, "VERIFIED", f.chart === "S6" ? "S6" : "S4", f.chart === "S6" ? "Reliefs" : "Annexure 1(c)"),
    ),
    rule(
      "CHARITY_DONATION",
      "approved_charity",
      "Donations to approved charitable institutions",
      "Deductible up to the lowest of the amount donated, Rs. 75,000, and one-third of taxable income.",
      single(from, { cap: 75_000, taxableIncomeFraction: 1 / 3 }, "VERIFIED", "S4", "Annexure 3(a)"),
    ),
    rule(
      "GOVERNMENT_DONATION",
      "government",
      "Donations to the Government and specified institutions",
      "Deductible in full as a qualifying payment. From 1 April 2025 any unutilised balance may be carried forward.",
      single(from, { fullyDeductible: true, carryForward: from >= "2025-04-01" }, "VERIFIED", "S4", "Annexure 3(b), (f)"),
    ),
    rule(
      "DIVIDEND_TREATMENT",
      "resident_company",
      "Dividends from resident companies",
      "Subject to 15% final withholding tax; not added to assessable income.",
      single(from, { finalWithholding: true, rate: 0.15 }, "VERIFIED", "S4", "Schedule 3 §2; Annexure 4(j)"),
    ),
    wht(
      "interest",
      "AIT on interest and discounts",
      "Advance Income Tax deducted by banks and financial institutions from interest paid to residents. Creditable, not final.",
      { rate: f.interestAit.rate, isFinal: false, monthlyThreshold: null, creditable: true },
      f.interestAit.verification,
      f.interestAit.sourceRef,
      f.interestAit.sourceRef === "S1" ? "§2.3" : "AIT on interest",
    ),
    wht(
      "rent",
      "AIT on rent paid to residents",
      "Deducted from the full payment where aggregate rent exceeds Rs. 100,000 in a calendar month. Creditable.",
      { rate: 0.1, isFinal: false, monthlyThreshold: 100_000, creditable: true },
    ),
    wht(
      "service_fee",
      "AIT on service fees to resident individuals",
      "Deducted from the full payment to a non-employee individual in a listed profession where payments exceed Rs. 100,000 in a calendar month. Creditable.",
      { rate: 0.05, isFinal: false, monthlyThreshold: 100_000, creditable: true },
    ),
    wht(
      "dividend",
      "WHT on dividends",
      "Final withholding tax on dividends paid by resident companies.",
      { rate: 0.15, isFinal: true, monthlyThreshold: null, creditable: false },
    ),
    wht(
      "lottery_betting",
      "WHT on lottery, betting and gambling winnings",
      "Final withholding tax. Lottery winnings with a gross amount not exceeding Rs. 500,000 are exempt.",
      { rate: 0.14, isFinal: true, monthlyThreshold: null, creditable: false },
    ),
    rule(
      "EXPENSE_DEDUCTIBILITY",
      "general",
      "Deductibility of expenses",
      "Expenses are deductible only against business income, only when incurred in producing it, and not when domestic, personal or capital in nature. Payments of Rs. 500,000 or more made in cash are not deductible.",
      single(from, { cashPaymentLimit: 500_000 }, "VERIFIED", "S2", "§2 (IRA s.10(2A))", "The general tests (IRA ss.10–11) are applied on the taxpayer's own confirmation; the app classifies but does not decide."),
    ),
    rule(
      "INSTALMENT_BASIS",
      "individual",
      "Quarterly instalments",
      f.instalmentBasis === "PRIOR_YEAR_LIABILITY"
        ? "Four instalments based on the income tax payable for the immediately preceding year of assessment. The Statement of Estimated Tax is discontinued."
        : "Four instalments based on the taxpayer's Statement of Estimated Tax for the current year.",
      single(
        from,
        { basis: f.instalmentBasis, instalments: 4 },
        "VERIFIED",
        f.instalmentBasis === "PRIOR_YEAR_LIABILITY" ? "S2" : "S4",
        f.instalmentBasis === "PRIOR_YEAR_LIABILITY" ? "§11" : "General instructions §8",
        f.instalmentBasis === "PRIOR_YEAR_LIABILITY"
          ? "Procedure where there was no prior-year taxable income is still to be published by IRD (TAX_RULES.md U4)."
          : null,
      ),
    ),
    rule(
      "FILING_REQUIREMENT",
      "individual",
      "Who must file a return",
      "Every individual taxpayer files a return unless their only income is employment income fully subject to APIT (and, from 1 April 2025, interest not exceeding Rs. 5,000) with no instalments or final payment due.",
      single(from, { apitOnlyExempt: true, interestTolerance: f.filingInterestTolerance }, "VERIFIED", "S2", "§12"),
    ),
    rule(
      "PENALTY_INFO",
      "individual",
      "Penalties and interest",
      "Consequences of late filing and late payment. Shown for information; the app does not compute penalties.",
      single(
        from,
        {
          items: [
            { label: "Late filing of return", consequence: "Greater of 5% of tax owing plus 1% per month or part, and Rs. 50,000 plus Rs. 10,000 per month or part." },
            { label: "Late instalment", consequence: "10% of the amount due but not paid." },
            { label: "Late payment of tax for the period", consequence: "20% of the tax due but not paid." },
            { label: "Interest", consequence: "1.5% per month or part of a month on the late amount." },
            { label: "False or misleading statement", consequence: "Greater of Rs. 50,000 and the tax understated." },
          ],
        },
        "VERIFIED",
        "S4",
        "General instructions §9",
        f.year.code === "2024/2025" ? "Read in the 2025/2026 Guide; assumed unchanged for 2024/2025." : null,
      ),
    ),
    rule(
      "EXEMPTION",
      "lottery",
      "Lottery winnings",
      "Winnings from a lottery are exempt where the gross amount does not exceed Rs. 500,000.",
      single(from, { summary: "Lottery winnings up to Rs. 500,000 gross are exempt.", threshold: 500_000 }, "VERIFIED", "S4", "Annexure 2(1)(m)"),
    ),
    rule(
      "EXEMPTION",
      "foreign_currency_account_interest",
      "Interest on approved foreign-currency accounts",
      "Interest on money in a foreign-currency account opened with Central Bank approval in a commercial or specialised bank is exempt.",
      single(from, { summary: "Interest on approved foreign-currency accounts is exempt.", threshold: null }, "VERIFIED", "S4", "Annexure 2(1)(s)"),
    ),
  ];
}

export const RULES: RuleSeed[] = FACTS.flatMap(rulesFor);

/** Builds an in-memory rule set straight from the seed definitions (tests, tooling). */
export function buildSeedRuleSet(taxYearCode: string): RuleSet {
  const year = TAX_YEARS.find((t) => t.code === taxYearCode);
  if (!year) throw new Error(`Unknown tax year ${taxYearCode}`);
  const rules: ResolvedRule[] = RULES.filter((r) => r.taxYear === taxYearCode).flatMap((r) =>
    r.versions.map((v) => {
      const source = SOURCES.find((s) => s.ref === v.sourceRef) ?? null;
      return {
        id: `seed:${r.taxYear}:${r.ruleType}:${r.key}:v${v.version}`,
        taxYear: r.taxYear,
        ruleType: r.ruleType,
        key: r.key,
        name: r.name,
        description: r.description,
        version: v.version,
        parameters: v.parameters,
        effectiveFrom: v.effectiveFrom,
        effectiveTo: v.effectiveTo,
        verification: v.verification,
        source: source ? { ref: source.ref, title: source.title, authority: source.authority, url: source.url } : null,
        sourceLocator: v.sourceLocator,
        notes: v.notes,
        lastVerifiedAt: LAST_VERIFIED,
      };
    }),
  );
  return { taxYear: { code: year.code, startsOn: year.startsOn, endsOn: year.endsOn }, rules };
}
