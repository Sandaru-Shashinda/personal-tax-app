// Contract for a future AI assistant. No model is called anywhere in the application.
//
// The rule that shapes this interface: the assistant explains, it never decides. It may only
// state tax rules that are passed to it as `rules`, and every statement about the law must
// cite one of them. It has no other source of tax knowledge it is allowed to rely on.

import type { RuleUse, TaxResult } from "@/lib/tax/types";

export interface AssistantContext {
  taxYear: string;
  /** The user's own calculation for the year, and the previous year's when comparing. */
  current: TaxResult;
  previous: TaxResult | null;
  /** Verified rule versions retrieved for the question, with sources. */
  rules: RuleUse[];
}

export interface AssistantAnswer {
  text: string;
  /** Rule version ids the answer relied on; rendered as source links. */
  citedRuleIds: string[];
  /** True when the retrieved rules were not enough to answer; the UI then says so plainly. */
  insufficientGrounding: boolean;
}

export interface TaxAssistant {
  answer(question: string, context: AssistantContext): Promise<AssistantAnswer>;
}

export function taxAssistant(): TaxAssistant | null {
  return null;
}
