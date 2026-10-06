import { taxOnBands } from "./engine";
import { round2, sum } from "./money";
import { requireRule } from "./rule-set";
import type { RuleSet } from "./types";

/**
 * APIT a primary employer would be expected to deduct in a month on regular pay, using the
 * year's bands and personal relief divided by twelve (this is how IRD's Tax Table 01 is built).
 * Used only to sanity-check recorded APIT; the credit claimed is always the certified amount.
 */
export function expectedMonthlyApit(monthlyRemuneration: number, ruleSet: RuleSet): number {
  const relief = requireRule(ruleSet, "PERSONAL_RELIEF", "individual").params.amount;
  const { bands } = requireRule(ruleSet, "TAX_BANDS", "individual").params;
  const annualTaxable = Math.max(monthlyRemuneration * 12 - relief, 0);
  return round2(sum(taxOnBands(annualTaxable, bands).map((s) => s.tax)) / 12);
}
