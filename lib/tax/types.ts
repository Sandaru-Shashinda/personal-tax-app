// Types shared by the tax engine, the rule loader and the UI.
// Everything here is plain data: the engine never touches the database.

export type RuleType =
  | "PERSONAL_RELIEF"
  | "TAX_BANDS"
  | "CAPITAL_GAINS_RATE"
  | "CAPITAL_GAINS_EXEMPTION"
  | "FOREIGN_INCOME_CAP"
  | "SPECIAL_RATE"
  | "TERMINAL_BENEFIT_BANDS"
  | "RENT_RELIEF"
  | "SOLAR_RELIEF"
  | "CHARITY_DONATION"
  | "GOVERNMENT_DONATION"
  | "WITHHOLDING_RATE"
  | "DIVIDEND_TREATMENT"
  | "EXPENSE_DEDUCTIBILITY"
  | "INSTALMENT_BASIS"
  | "FILING_REQUIREMENT"
  | "PENALTY_INFO"
  | "EXEMPTION";

export type Verification = "VERIFIED" | "VERIFIED_SECONDARY" | "REQUIRES_VERIFICATION";

export interface RuleSourceRef {
  ref: string;
  title: string;
  authority: string;
  url: string;
}

/** One version of one rule, as the engine sees it. ISO dates (YYYY-MM-DD). */
export interface ResolvedRule {
  id: string;
  taxYear: string;
  ruleType: RuleType;
  key: string;
  name: string;
  description: string;
  version: number;
  parameters: unknown;
  effectiveFrom: string;
  effectiveTo: string | null;
  verification: Verification;
  source: RuleSourceRef | null;
  sourceLocator: string | null;
  notes: string | null;
  lastVerifiedAt: string | null;
}

export interface RuleSet {
  taxYear: { code: string; startsOn: string; endsOn: string };
  rules: ResolvedRule[];
}

export type Residency = "RESIDENT" | "NON_RESIDENT_CITIZEN" | "NON_RESIDENT";

export type IncomeKind =
  | "SALARY"
  | "TERMINAL_BENEFIT"
  | "BUSINESS"
  | "SPECIAL_RATE_BUSINESS"
  | "INTEREST"
  | "DIVIDEND_RESIDENT_COMPANY"
  | "DIVIDEND_OTHER"
  | "RENT"
  | "CAPITAL_GAIN"
  | "INVESTMENT_OTHER"
  | "OTHER";

export type WithholdingKind = "APIT" | "AIT" | "FINAL_WHT" | "CGT_PAID" | "NONE";

export interface IncomeItem {
  id?: string;
  label: string;
  kind: IncomeKind;
  /** Gross LKR amount received in the year. For CAPITAL_GAIN this is the gain (may be negative). */
  amount: number;
  /** Receipt / realisation date; required for capital gains so the right rate version applies. */
  date?: string;
  withholding?: number;
  withholdingKind?: WithholdingKind;
  /** Foreign-source income. */
  foreignSource?: boolean;
  /** Earned in foreign currency and remitted to Sri Lanka through a bank (incl. service exports). */
  foreignCurrencyRemitted?: boolean;
  /** Foreign income tax paid on this item, in LKR. */
  foreignTaxPaid?: number;
  /** User-declared exemption (e.g. interest on an approved foreign-currency account). */
  exemptReason?: string;
  capitalGainExemption?: "NONE" | "LISTED_SHARES" | "PRINCIPAL_RESIDENCE";
}

export interface DeductibleExpenseItem {
  id?: string;
  label: string;
  /** Amount already classified as deductible by the expense classifier. */
  amount: number;
  /** Which business pool the linked income belongs to. */
  pool: "LOCAL" | "FOREIGN_REMITTED" | "SPECIAL_RATE";
}

export type QualifyingPaymentKind =
  | "CHARITY_DONATION"
  | "GOVERNMENT_DONATION"
  | "SOLAR_PANEL"
  | "SAMURDHI_SHOP";

export interface QualifyingPaymentItem {
  id?: string;
  label: string;
  kind: QualifyingPaymentKind;
  amount: number;
}

export type PaymentKind = "INSTALMENT" | "FINAL_PAYMENT" | "CAPITAL_GAINS_TAX" | "APIT" | "WITHHOLDING" | "OTHER";

export interface PaymentItem {
  id?: string;
  label: string;
  kind: PaymentKind;
  amount: number;
  date?: string;
}

export interface TaxInputs {
  residency: Residency;
  income: IncomeItem[];
  deductibleExpenses: DeductibleExpenseItem[];
  qualifyingPayments: QualifyingPaymentItem[];
  payments: PaymentItem[];
}

export interface RuleUse {
  id: string;
  ruleType: RuleType;
  key: string;
  name: string;
  version: number;
  verification: Verification;
  source: RuleSourceRef | null;
  sourceLocator: string | null;
  lastVerifiedAt: string | null;
  parameters: unknown;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface Line {
  code: string;
  label: string;
  amount: number;
  /** Amount the rate was applied to, for tax lines. */
  base?: number;
  rate?: number;
  ruleId?: string;
  /** Plain-language reason shown behind the "Why?" button. */
  why?: string;
}

export type WarningSeverity = "info" | "warning";

export interface TaxWarning {
  code: string;
  severity: WarningSeverity;
  message: string;
}

export interface TaxResult {
  taxYear: string;
  residency: Residency;
  incomeByCategory: { employment: number; business: number; investment: number; other: number };
  incomeLines: Line[];
  excludedLines: Line[];
  assessableIncome: number;
  reliefLines: Line[];
  qualifyingPaymentLines: Line[];
  totalDeductions: number;
  taxableIncome: number;
  taxLines: Line[];
  totalTax: number;
  creditLines: Line[];
  totalCredits: number;
  /** Positive: still to pay. Negative: overpaid (a refund may be claimable from IRD). */
  balancePayable: number;
  /** Final withholding suffered on excluded income; informational, not a credit. */
  finalWithholdingTax: number;
  effectiveRate: number;
  marginalRate: number;
  warnings: TaxWarning[];
  rulesUsed: RuleUse[];
}
