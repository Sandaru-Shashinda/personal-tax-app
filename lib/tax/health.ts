import { formatLKR, formatPercent } from "@/lib/format";
import { createTranslator, msg, type Translate } from "@/lib/i18n/translate";
import type { TaxResult } from "./types";

// "Tax health" is a record-keeping checklist, not a legal or compliance score. Each check is a
// plain fact about what the user has entered; the score is the weighted share that pass.

export interface YearFacts {
  taxYear: string;
  result: TaxResult;
  /** Income types the user said they receive at onboarding. */
  declaredIncomeTypes: string[];
  /** Income types with at least one record this year. */
  recordedIncomeTypes: string[];
  salaryRecords: number;
  salaryRecordsWithoutApit: number;
  /** Salary above the personal relief on an annualised basis, so APIT would be expected. */
  salaryAboveRelief: boolean;
  interestRecordsWithoutWithholding: number;
  documentsByCategory: Record<string, number>;
  expensesRequiringReview: number;
  rentalRecords: number;
  hasTin: boolean;
  emailVerified: boolean;
  overdueInstalments: { title: string; dueOn: string; shortfall: number }[];
  nextDeadline: { title: string; dueOn: string; daysAway: number } | null;
}

export interface HealthCheck {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  /** Where to go to fix it. */
  href: string;
}

const TYPE_LABEL: Record<string, string> = {
  SALARY: msg("salary"),
  FREELANCE: msg("freelance"),
  BUSINESS: msg("business"),
  PROFESSIONAL: msg("professional"),
  RENTAL: msg("rental"),
  INTEREST: msg("bank interest"),
  DIVIDEND: msg("dividend"),
  INVESTMENT_OTHER: msg("investment"),
  CAPITAL_GAIN: msg("capital gains"),
  FOREIGN: msg("foreign"),
  OTHER: msg("other"),
};

export function healthChecks(f: YearFacts, t: Translate = createTranslator()): HealthCheck[] {
  const missingTypes = f.declaredIncomeTypes.filter((type) => !f.recordedIncomeTypes.includes(type) && type !== "CAPITAL_GAIN" && type !== "OTHER");
  const docs = (category: string) => f.documentsByCategory[category] ?? 0;
  const checks: HealthCheck[] = [
    {
      id: "income_recorded",
      label:
        f.recordedIncomeTypes.length === 0
          ? t("No income recorded yet")
          : missingTypes.length === 0
            ? t("Income records complete")
            : t("No {types} income entered", { types: missingTypes.map((type) => (TYPE_LABEL[type] ? t(TYPE_LABEL[type]) : type.toLowerCase())).join(", ") }),
      passed: f.recordedIncomeTypes.length > 0 && missingTypes.length === 0,
      weight: 25,
      href: "/income",
    },
    { id: "tin", label: f.hasTin ? t("TIN on file") : t("TIN not entered"), passed: f.hasTin, weight: 10, href: "/settings" },
    {
      id: "email",
      label: f.emailVerified ? t("E-mail address verified") : t("E-mail address not verified"),
      passed: f.emailVerified,
      weight: 5,
      href: "/settings",
    },
    {
      id: "payments",
      label:
        f.overdueInstalments.length === 0
          ? t("No instalments overdue")
          : f.overdueInstalments.length > 1
            ? t("{count} instalments past the due date", { count: f.overdueInstalments.length })
            : t("1 instalment past the due date"),
      passed: f.overdueInstalments.length === 0,
      weight: 20,
      href: "/payments",
    },
  ];
  if (f.salaryRecords > 0) {
    checks.push({
      id: "apit",
      label: f.salaryRecordsWithoutApit === 0 || !f.salaryAboveRelief ? t("APIT records entered") : t("Salary recorded without APIT"),
      passed: f.salaryRecordsWithoutApit === 0 || !f.salaryAboveRelief,
      weight: 15,
      href: "/income",
    });
    const certs = docs("APIT_DOCUMENT") + docs("TAX_CERTIFICATE");
    checks.push({
      id: "apit_certificate",
      label: certs > 0 ? t("Employer tax certificate uploaded") : t("Missing employer tax certificate (T.10)"),
      passed: certs > 0,
      weight: 10,
      href: "/documents",
    });
  }
  if (f.recordedIncomeTypes.includes("INTEREST")) {
    const certs = docs("BANK_STATEMENT") + docs("INVESTMENT_STATEMENT") + docs("TAX_CERTIFICATE");
    checks.push({
      id: "interest_certificate",
      label: certs > 0 ? t("Interest certificate uploaded") : t("Missing interest / AIT certificate"),
      passed: certs > 0,
      weight: 5,
      href: "/documents",
    });
  }
  if (f.rentalRecords > 0) {
    checks.push({
      id: "rental_records",
      label: docs("RENTAL_DOCUMENT") > 0 ? t("Rental records uploaded") : t("Rental income has no supporting records"),
      passed: docs("RENTAL_DOCUMENT") > 0,
      weight: 5,
      href: "/documents",
    });
  }
  if (f.expensesRequiringReview > 0) {
    checks.push({
      id: "expenses_review",
      label: f.expensesRequiringReview > 1 ? t("{count} expenses waiting for review", { count: f.expensesRequiringReview }) : t("1 expense waiting for review"),
      passed: false,
      weight: 5,
      href: "/expenses?deductibility=REQUIRES_REVIEW",
    });
  }
  return checks;
}

export function healthScore(checks: HealthCheck[]): number {
  const total = checks.reduce((t, c) => t + c.weight, 0);
  if (total === 0) return 0;
  return Math.round((checks.filter((c) => c.passed).reduce((t, c) => t + c.weight, 0) / total) * 100);
}

export interface Insight {
  id: string;
  tone: "neutral" | "attention";
  text: string;
}

/** Statements of fact about the user's own figures. Never advice, never a suggested deduction. */
export function insights(f: YearFacts, t: Translate = createTranslator()): Insight[] {
  const { result: r } = f;
  const out: Insight[] = [];
  if (r.assessableIncome === 0) {
    return [{ id: "empty", tone: "neutral", text: t("No taxable income is recorded for {year} yet. Add your income to see an estimate.", { year: f.taxYear }) }];
  }
  if (r.incomeByCategory.employment > 0) {
    out.push({ id: "employment", tone: "neutral", text: t("You have recorded {amount} of employment income this year.", { amount: formatLKR(r.incomeByCategory.employment) }) });
  }
  out.push({
    id: "effective",
    tone: "neutral",
    text: t("Your effective tax rate is approximately {rate}; the next rupee you earn would be taxed at {marginal}.", { rate: formatPercent(r.effectiveRate), marginal: formatPercent(r.marginalRate, 0) }),
  });
  const withheld = r.creditLines.filter((l) => l.code === "APIT" || l.code === "AIT").reduce((total, l) => total + l.amount, 0);
  if (r.totalTax > 0 && withheld > 0) {
    out.push({ id: "withheld", tone: "neutral", text: t("Tax withheld at source accounts for {percent} of your estimated liability.", { percent: formatPercent(Math.min(withheld / r.totalTax, 9.99), 0) }) });
  }
  if (r.balancePayable > 0) {
    out.push({ id: "balance", tone: "attention", text: t("Your estimated remaining liability is {amount}.", { amount: formatLKR(r.balancePayable) }) });
  } else if (r.balancePayable < 0) {
    out.push({
      id: "overpaid",
      tone: "neutral",
      text: t("Tax paid and withheld exceeds the estimate by {amount}. A refund can only be claimed from IRD through your return.", { amount: formatLKR(-r.balancePayable) }),
    });
  }
  if (f.declaredIncomeTypes.includes("INTEREST") && !f.recordedIncomeTypes.includes("INTEREST")) {
    out.push({ id: "no_interest", tone: "attention", text: t("You have not entered any bank interest for this year.") });
  }
  if (f.declaredIncomeTypes.some((type) => type === "DIVIDEND" || type === "INVESTMENT_OTHER") && !f.recordedIncomeTypes.some((type) => type === "DIVIDEND" || type === "INVESTMENT_OTHER")) {
    out.push({ id: "no_investment", tone: "attention", text: t("You have not entered any investment income for this year.") });
  }
  if (f.interestRecordsWithoutWithholding > 0) {
    out.push({
      id: "interest_no_ait",
      tone: "attention",
      text:
        f.interestRecordsWithoutWithholding > 1
          ? t("{count} interest records have no tax withheld. Banks normally deduct AIT unless you gave a self-declaration; check your certificate.", { count: f.interestRecordsWithoutWithholding })
          : t("1 interest record has no tax withheld. Banks normally deduct AIT unless you gave a self-declaration; check your certificate."),
    });
  }
  if (r.finalWithholdingTax > 0) {
    out.push({ id: "final_wht", tone: "neutral", text: t("{amount} of final withholding tax was deducted from dividends. That income is not taxed again.", { amount: formatLKR(r.finalWithholdingTax) }) });
  }
  return out;
}

/** Missing-information findings for the return preparation workflow. */
export function returnIssues(f: YearFacts, t: Translate = createTranslator()): { severity: "blocker" | "warning"; message: string; href: string }[] {
  const issues: { severity: "blocker" | "warning"; message: string; href: string }[] = [];
  if (!f.hasTin) issues.push({ severity: "blocker", message: t("Your TIN is missing. IRD requires it on the return."), href: "/settings" });
  if (f.recordedIncomeTypes.length === 0) issues.push({ severity: "blocker", message: t("No income is recorded for this year."), href: "/income" });
  for (const check of healthChecks(f, t)) {
    if (check.passed || check.id === "tin" || check.id === "income_recorded" || check.id === "email") continue;
    issues.push({ severity: "warning", message: check.label, href: check.href });
  }
  const missing = f.declaredIncomeTypes.filter((type) => !f.recordedIncomeTypes.includes(type) && !["CAPITAL_GAIN", "OTHER"].includes(type));
  for (const type of missing) {
    if (f.recordedIncomeTypes.length > 0) issues.push({ severity: "warning", message: t("{type} income is missing.", { type: (TYPE_LABEL[type] ? t(TYPE_LABEL[type]) : type).replace(/^./, (c) => c.toUpperCase()) }), href: "/income" });
  }
  for (const w of f.result.warnings.filter((w) => w.severity === "warning")) {
    issues.push({ severity: "warning", message: w.message, href: "/tax" });
  }
  return issues;
}
