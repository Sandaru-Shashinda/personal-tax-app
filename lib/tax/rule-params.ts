import { z } from "zod";
import type { RuleType } from "./types";

// Parameter schema for each rule type. Admin edits and seed data are validated against
// these, so a malformed rule can never reach the engine.

const rate = z.number().min(0).max(1);
const money = z.number().min(0);

const band = z.object({
  /** Width of the band in LKR; null for the final "balance" band. */
  width: money.nullable(),
  rate,
});

const bands = z
  .array(band)
  .min(1)
  .refine((list) => list.slice(0, -1).every((b) => b.width !== null && b.width > 0), {
    message: "Every band except the last needs a positive width",
  })
  .refine((list) => list[list.length - 1].width === null, {
    message: "The last band must be the balance band (width null)",
  });

const residency = z.enum(["RESIDENT", "NON_RESIDENT_CITIZEN", "NON_RESIDENT"]);

export const ruleParamSchemas = {
  PERSONAL_RELIEF: z.object({ amount: money, appliesTo: z.array(residency).min(1) }),
  TAX_BANDS: z.object({ bands }),
  CAPITAL_GAINS_RATE: z.object({ rate }),
  CAPITAL_GAINS_EXEMPTION: z.object({ perGainLimit: money, annualGainsLimit: money }),
  FOREIGN_INCOME_CAP: z.discriminatedUnion("treatment", [
    z.object({ treatment: z.literal("EXEMPT") }),
    z.object({ treatment: z.literal("CAPPED"), maxRate: rate }),
  ]),
  SPECIAL_RATE: z.object({ rate }),
  TERMINAL_BENEFIT_BANDS: z.object({ bands }),
  RENT_RELIEF: z.object({ percent: rate, appliesTo: z.array(residency).min(1) }),
  SOLAR_RELIEF: z.object({ annualCap: money, appliesTo: z.array(residency).min(1) }),
  CHARITY_DONATION: z.object({ cap: money, taxableIncomeFraction: rate }),
  GOVERNMENT_DONATION: z.object({ fullyDeductible: z.boolean(), carryForward: z.boolean() }),
  WITHHOLDING_RATE: z.object({
    rate,
    isFinal: z.boolean(),
    monthlyThreshold: money.nullable(),
    creditable: z.boolean(),
  }),
  DIVIDEND_TREATMENT: z.object({ finalWithholding: z.boolean(), rate }),
  EXPENSE_DEDUCTIBILITY: z.object({ cashPaymentLimit: money }),
  INSTALMENT_BASIS: z.object({ basis: z.enum(["CURRENT_YEAR_ESTIMATE", "PRIOR_YEAR_LIABILITY"]), instalments: z.number().int().positive() }),
  FILING_REQUIREMENT: z.object({ apitOnlyExempt: z.boolean(), interestTolerance: money }),
  PENALTY_INFO: z.object({ items: z.array(z.object({ label: z.string(), consequence: z.string() })) }),
  EXEMPTION: z.object({ summary: z.string(), threshold: money.nullable() }),
} satisfies Record<RuleType, z.ZodType>;

export type RuleParams<T extends RuleType> = z.infer<(typeof ruleParamSchemas)[T]>;

export function parseRuleParams<T extends RuleType>(type: T, parameters: unknown): RuleParams<T> {
  return ruleParamSchemas[type].parse(parameters) as RuleParams<T>;
}

export function safeParseRuleParams(type: RuleType, parameters: unknown) {
  return ruleParamSchemas[type].safeParse(parameters);
}
