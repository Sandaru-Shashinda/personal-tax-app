import { msg, type Translate } from "@/lib/i18n/translate";
import { round2 } from "./money";

export type Deductibility = "DEDUCTIBLE" | "PARTIALLY_DEDUCTIBLE" | "NON_DEDUCTIBLE" | "REQUIRES_REVIEW";

/** Income source types against which business deductions can be claimed. */
export const BUSINESS_SOURCE_TYPES = ["BUSINESS", "FREELANCE", "PROFESSIONAL"] as const;

export interface ExpenseFacts {
  amount: number;
  paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
  isCapital: boolean;
  /** Type of the linked income source, or null when the expense is not linked to one. */
  linkedSourceType: string | null;
  userConfirmedBusinessPurpose: boolean;
  /** 1–100. Share of the cost that relates to the business. */
  businessUsePercent: number;
}

export interface ExpenseClassification {
  deductibility: Deductibility;
  deductibleAmount: number;
  reason: string;
}

/**
 * Classifies an expense for the estimate. This applies the bright-line rules the app can check
 * and otherwise relies on the user's own confirmation; it is not a legal determination.
 */
export function classifyExpense(facts: ExpenseFacts, cashPaymentLimit: number): ExpenseClassification {
  const none = (deductibility: Deductibility, reason: string): ExpenseClassification => ({ deductibility, deductibleAmount: 0, reason });

  if (!facts.linkedSourceType) {
    return none(
      "NON_DEDUCTIBLE",
      msg("Not treated as deductible because it is not linked to a business, professional or freelance income source. Personal and domestic expenses cannot be deducted."),
    );
  }
  if (facts.linkedSourceType === "SALARY") {
    return none("NON_DEDUCTIBLE", msg("Not deductible: expenses cannot be deducted from employment income."));
  }
  if (facts.linkedSourceType === "RENTAL") {
    return none(
      "NON_DEDUCTIBLE",
      msg("Not deducted separately: rental income from an investment asset receives a flat relief of 25% of the rent instead. Whether actual costs can be claimed in addition is not confirmed."),
    );
  }
  if (!(BUSINESS_SOURCE_TYPES as readonly string[]).includes(facts.linkedSourceType)) {
    return none(
      "NON_DEDUCTIBLE",
      msg("Not treated as deductible because expenses are only deducted against business, professional or freelance income in this estimate."),
    );
  }
  if (facts.isCapital) {
    return none(
      "NON_DEDUCTIBLE",
      msg("Not deducted as an expense because it is capital in nature. Capital allowances may be available over several years; they are not calculated here."),
    );
  }
  if (facts.paymentMethod === "CASH" && facts.amount >= cashPaymentLimit) {
    return none(
      "NON_DEDUCTIBLE",
      `Not deductible: a payment of Rs. ${cashPaymentLimit.toLocaleString("en-LK")} or more made in cash cannot be deducted. Payments by cheque, bank transfer or card are not affected.`,
    );
  }
  if (!facts.userConfirmedBusinessPurpose) {
    return none(
      "REQUIRES_REVIEW",
      msg("Not yet deducted. Confirm that this cost was incurred in producing the linked business income, and is not personal, before it is treated as deductible."),
    );
  }
  if (facts.businessUsePercent < 100) {
    return {
      deductibility: "PARTIALLY_DEDUCTIBLE",
      deductibleAmount: round2((facts.amount * facts.businessUsePercent) / 100),
      reason: `${facts.businessUsePercent}% treated as deductible, the share you stated relates to the business. The private share is not deductible.`,
    };
  }
  return {
    deductibility: "DEDUCTIBLE",
    deductibleAmount: round2(facts.amount),
    reason: msg("Treated as deductible: you confirmed it was incurred in producing the linked business income, and it is not capital or a large cash payment."),
  };
}

/**
 * A stored reason in the reader's language. Reasons are saved in English with the record; the two
 * that carry a figure are recognised here so the figure can be placed in the translated sentence.
 */
export function explainReason(reason: string, t: Translate): string {
  const cash = reason.match(/^Not deductible: a payment of (Rs. [d,]+) or more made in cash/);
  if (cash) return t("Not deductible: a payment of {amount} or more made in cash cannot be deducted. Payments by cheque, bank transfer or card are not affected.", { amount: cash[1] });
  const share = reason.match(/^(d+)% treated as deductible/);
  if (share) return t("{percent}% treated as deductible, the share you stated relates to the business. The private share is not deductible.", { percent: share[1] });
  return t(reason);
}
