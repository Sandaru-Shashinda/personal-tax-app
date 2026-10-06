import { z } from "zod";
import { currencyCode, isoDate, money, optionalMoney, optionalText, optionalUuid, pastOrTodayDate, signedMoney, taxYearCode, uuid } from "./common";

// ── Onboarding / profile

export const PROVINCES = [
  "Western", "Central", "Southern", "Northern", "Eastern", "North Western", "North Central", "Uva", "Sabaragamuwa",
] as const;

export const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya", "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi",
  "Mannar", "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee", "Kurunegala", "Puttalam", "Anuradhapura",
  "Polonnaruwa", "Badulla", "Monaragala", "Ratnapura", "Kegalle",
] as const;

export const INCOME_TYPES = [
  "SALARY", "FREELANCE", "BUSINESS", "PROFESSIONAL", "RENTAL", "INTEREST", "DIVIDEND", "INVESTMENT_OTHER", "CAPITAL_GAIN", "FOREIGN", "OTHER",
] as const;
export type IncomeTypeValue = (typeof INCOME_TYPES)[number];

export const INCOME_TYPE_LABELS: Record<IncomeTypeValue, string> = {
  SALARY: "Salary",
  FREELANCE: "Freelancing",
  BUSINESS: "Business",
  PROFESSIONAL: "Professional services",
  RENTAL: "Rental",
  INTEREST: "Bank interest",
  DIVIDEND: "Dividends",
  INVESTMENT_OTHER: "Other investments",
  CAPITAL_GAIN: "Capital gains",
  FOREIGN: "Foreign income",
  OTHER: "Other",
};

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(200),
  dateOfBirth: z.preprocess((v) => (v === "" ? undefined : v), pastOrTodayDate.optional()),
  phone: optionalText(30),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  district: z.preprocess((v) => (v === "" ? undefined : v), z.enum(DISTRICTS).optional()),
  province: z.preprocess((v) => (v === "" ? undefined : v), z.enum(PROVINCES).optional()),
  postalCode: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{5}$/, "Postal codes have five digits").optional()),
});

export const taxProfileSchema = z.object({
  tin: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{9}$/, "A TIN has nine digits").optional()),
  nic: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().toUpperCase().regex(/^(\d{9}[VX]|\d{12}|[A-Z0-9]{6,12})$/, "Enter a valid NIC or passport number").optional(),
  ),
  residencyStatus: z.enum(["RESIDENT", "NON_RESIDENT_CITIZEN", "NON_RESIDENT"]),
  employmentStatus: z.enum(["EMPLOYED", "SELF_EMPLOYED", "BOTH", "RETIRED", "NOT_EMPLOYED"]),
});

export const onboardingSchema = profileSchema.merge(taxProfileSchema).extend({
  incomeTypes: z.array(z.enum(INCOME_TYPES)).min(1, "Choose at least one type of income"),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ── Income

const foreignFields = {
  currency: currencyCode.default("LKR"),
  originalAmount: z.preprocess((v) => (v === "" || v === null ? undefined : v), money.optional()),
  exchangeRate: z.preprocess((v) => (v === "" || v === null ? undefined : Number(v)), z.number().positive("Enter the exchange rate").optional()),
  exchangeRateSource: optionalText(120),
  exchangeRateDate: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
  isForeignSource: z.coerce.boolean().default(false),
  remittedViaBank: z.coerce.boolean().default(false),
  foreignTaxPaid: optionalMoney,
};

const entryBase = {
  taxYear: taxYearCode,
  sourceId: optionalUuid,
  sourceName: optionalText(200),
  receivedOn: isoDate,
  description: optionalText(300),
  withholdingTax: optionalMoney,
  ...foreignFields,
};

export const salaryEntrySchema = z.object({
  ...entryBase,
  type: z.literal("SALARY"),
  employerName: optionalText(200),
  isPrimaryEmployment: z.coerce.boolean().default(true),
  period: z.enum(["MONTHLY", "ANNUAL"]),
  months: z.coerce.number().int().min(1).max(12).default(1),
  basicSalary: money,
  allowances: optionalMoney,
  bonuses: optionalMoney,
  overtime: optionalMoney,
  benefits: optionalMoney,
  otherEmployment: optionalMoney,
  terminalBenefits: optionalMoney,
  epfEmployee: optionalMoney,
  otherDeductions: optionalMoney,
});

export const businessEntrySchema = z.object({
  ...entryBase,
  type: z.enum(["FREELANCE", "BUSINESS", "PROFESSIONAL"]),
  grossAmount: money,
  clientName: optionalText(200),
  invoiceNumber: optionalText(80),
  isServiceExport: z.coerce.boolean().default(false),
  isSpecialRateBusiness: z.coerce.boolean().default(false),
});

export const rentalEntrySchema = z.object({
  ...entryBase,
  type: z.literal("RENTAL"),
  grossAmount: money,
  propertyName: z.string().trim().min(1, "Name the property").max(200),
  tenantName: optionalText(200),
  months: z.coerce.number().int().min(1).max(12).default(1),
});

export const investmentEntrySchema = z.object({
  ...entryBase,
  type: z.enum(["INTEREST", "DIVIDEND", "INVESTMENT_OTHER"]),
  grossAmount: money,
  institution: optionalText(200),
  accountRef: optionalText(100),
  dividendFromResidentCompany: z.coerce.boolean().default(true),
  isExempt: z.coerce.boolean().default(false),
  exemptReason: optionalText(200),
});

export const capitalGainEntrySchema = z
  .object({
    ...entryBase,
    type: z.literal("CAPITAL_GAIN"),
    assetName: z.string().trim().min(1, "Name the asset").max(200),
    acquiredOn: isoDate,
    acquisitionCost: money,
    disposalValue: money,
    allowableCosts: optionalMoney,
    exemption: z.enum(["NONE", "LISTED_SHARES", "PRINCIPAL_RESIDENCE"]).default("NONE"),
  })
  .refine((v) => v.acquiredOn <= v.receivedOn, { path: ["acquiredOn"], message: "Acquisition must be before disposal" });

export const otherEntrySchema = z.object({
  ...entryBase,
  type: z.enum(["OTHER", "FOREIGN"]),
  grossAmount: money,
});

export const incomeEntrySchema = z.discriminatedUnion("type", [
  salaryEntrySchema,
  businessEntrySchema,
  rentalEntrySchema,
  investmentEntrySchema,
  capitalGainEntrySchema,
  otherEntrySchema,
]);
export type IncomeEntryInput = z.infer<typeof incomeEntrySchema>;

// ── Expenses

export const EXPENSE_CATEGORIES = [
  "Software & subscriptions", "Equipment", "Office & supplies", "Internet & phone", "Professional fees", "Travel & transport",
  "Marketing", "Rent & utilities", "Repairs & maintenance", "Bank charges", "Training", "Insurance", "Personal", "Other",
] as const;

export const expenseSchema = z.object({
  taxYear: taxYearCode,
  incurredOn: pastOrTodayDate,
  amount: money.refine((v) => v > 0, "Enter an amount above zero"),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(1, "Describe the expense").max(300),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  incomeSourceId: optionalUuid,
  isCapital: z.coerce.boolean().default(false),
  userConfirmedBusinessPurpose: z.coerce.boolean().default(false),
  businessUsePercent: z.coerce.number().int().min(1).max(100).default(100),
  notes: optionalText(1000),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const qualifyingPaymentSchema = z.object({
  taxYear: taxYearCode,
  type: z.enum(["CHARITY_DONATION", "GOVERNMENT_DONATION", "SOLAR_PANEL", "SAMURDHI_SHOP"]),
  paidOn: pastOrTodayDate,
  amount: money.refine((v) => v > 0, "Enter an amount above zero"),
  recipient: z.string().trim().min(1, "Enter the recipient").max(200),
  description: optionalText(300),
});
export type QualifyingPaymentInput = z.infer<typeof qualifyingPaymentSchema>;

export const QP_LABELS = {
  CHARITY_DONATION: "Donation to an approved charity",
  GOVERNMENT_DONATION: "Donation to the Government or a specified institution",
  SOLAR_PANEL: "Solar panels connected to the national grid",
  SAMURDHI_SHOP: "Shop for a Samurdhi beneficiary",
} as const;

export const PAYMENT_TYPE_LABELS = {
  INSTALMENT: "Quarterly instalment",
  FINAL_PAYMENT: "Final payment",
  CAPITAL_GAINS_TAX: "Capital gains tax",
  APIT: "APIT (not recorded on a salary entry)",
  WITHHOLDING: "Withholding (not recorded on an income entry)",
  OTHER: "Other payment",
} as const;

// ── Payments

export const paymentSchema = z.object({
  taxYear: taxYearCode,
  type: z.enum(["INSTALMENT", "FINAL_PAYMENT", "CAPITAL_GAINS_TAX", "APIT", "WITHHOLDING", "OTHER"]),
  paidOn: pastOrTodayDate,
  amount: money.refine((v) => v > 0, "Enter an amount above zero"),
  reference: optionalText(100),
  bank: optionalText(120),
  instalmentNo: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).max(4).optional()),
  notes: optionalText(1000),
  /** Set when the user has confirmed a payment larger than the outstanding estimate. */
  confirmExceeds: z.coerce.boolean().default(false),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

// ── Documents

export const DOCUMENT_CATEGORIES = [
  "PAYSLIP", "TAX_CERTIFICATE", "APIT_DOCUMENT", "BANK_STATEMENT", "RECEIPT", "INVOICE", "RENTAL_DOCUMENT", "INVESTMENT_STATEMENT",
  "TAX_RETURN", "PAYMENT_PROOF", "OTHER",
] as const;

export const DOCUMENT_CATEGORY_LABELS: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  PAYSLIP: "Payslip",
  TAX_CERTIFICATE: "Tax certificate",
  APIT_DOCUMENT: "APIT / T.10 certificate",
  BANK_STATEMENT: "Bank statement",
  RECEIPT: "Receipt",
  INVOICE: "Invoice",
  RENTAL_DOCUMENT: "Rental document",
  INVESTMENT_STATEMENT: "Investment statement",
  TAX_RETURN: "Tax return",
  PAYMENT_PROOF: "Payment proof",
  OTHER: "Other",
};

export const documentMetaSchema = z.object({
  title: z.string().trim().min(1, "Give the document a title").max(200),
  category: z.enum(DOCUMENT_CATEGORIES),
  taxYear: z.preprocess((v) => (v === "" ? undefined : v), taxYearCode.optional()),
  incomeSourceId: optionalUuid,
  expenseId: optionalUuid,
  paymentId: optionalUuid,
});

export const idSchema = z.object({ id: uuid });

// Kept for callers that need a signed figure (capital gain/loss previews).
export { signedMoney };
