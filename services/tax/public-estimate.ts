import "server-only";
import { z } from "zod";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getT } from "@/lib/i18n/server";
import { requestMeta } from "@/lib/auth/session";
import { computeTax } from "@/lib/tax/engine";
import type { IncomeItem, TaxResult } from "@/lib/tax/types";
import { optionalMoney, taxYearCode } from "@/lib/validation/common";
import { loadRuleSet } from "./rule-repository";

export const estimateSchema = z.object({
  taxYear: taxYearCode,
  annualSalary: optionalMoney,
  businessIncome: optionalMoney,
  businessExpenses: optionalMoney,
  interestIncome: optionalMoney,
  rentalIncome: optionalMoney,
  otherIncome: optionalMoney,
});
export type EstimateInput = z.infer<typeof estimateSchema>;

/** Anonymous estimate using the same engine and rules as signed-in calculations. Nothing is stored. */
export async function publicEstimate(input: EstimateInput): Promise<TaxResult> {
  await rateLimit("publicCalculator", (await requestMeta()).ipAddress ?? "unknown");
  const income: IncomeItem[] = [
    { label: "Employment income", kind: "SALARY", amount: input.annualSalary },
    { label: "Business / freelance income", kind: "BUSINESS", amount: input.businessIncome },
    { label: "Interest income", kind: "INTEREST", amount: input.interestIncome },
    { label: "Rental income", kind: "RENT", amount: input.rentalIncome },
    { label: "Other income", kind: "OTHER", amount: input.otherIncome },
  ];
  return computeTax(
    {
      residency: "RESIDENT",
      income: income.filter((i) => i.amount > 0),
      deductibleExpenses: input.businessExpenses > 0 ? [{ label: "Business expenses", amount: input.businessExpenses, pool: "LOCAL" }] : [],
      qualifyingPayments: [],
      payments: [],
    },
    await loadRuleSet(input.taxYear),
    await getT(),
  );
}
