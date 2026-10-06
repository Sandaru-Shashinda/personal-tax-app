import "server-only";
import { parseRuleParams } from "@/lib/tax/rule-params";
import { findRule } from "@/lib/tax/rule-set";
import type { ResolvedRule, RuleSet } from "@/lib/tax/types";
import { getCurrentTaxYear, loadRuleSet } from "./rule-repository";

const meta = (rule: ResolvedRule | null) => (rule ? { source: rule.source, locator: rule.sourceLocator, verification: rule.verification, lastVerifiedAt: rule.lastVerifiedAt, notes: rule.notes } : null);

function summarise(ruleSet: RuleSet) {
  const relief = findRule(ruleSet, "PERSONAL_RELIEF", "individual");
  const bands = findRule(ruleSet, "TAX_BANDS", "individual");
  const gains = ruleSet.rules.filter((r) => r.ruleType === "CAPITAL_GAINS_RATE" && r.key === "individual").sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const withholding = ruleSet.rules.filter((r) => r.ruleType === "WITHHOLDING_RATE");
  const foreign = findRule(ruleSet, "FOREIGN_INCOME_CAP", "remitted");
  const rent = findRule(ruleSet, "RENT_RELIEF", "investment_asset");
  const solar = findRule(ruleSet, "SOLAR_RELIEF", "grid_connected");
  const charity = findRule(ruleSet, "CHARITY_DONATION", "approved_charity");

  let lower = 0;
  return {
    taxYear: ruleSet.taxYear,
    personalRelief: relief ? { amount: parseRuleParams("PERSONAL_RELIEF", relief.parameters).amount, ...meta(relief)! } : null,
    bands: bands
      ? {
          ...meta(bands)!,
          rows: parseRuleParams("TAX_BANDS", bands.parameters).bands.map((band) => {
            const row = { from: lower, to: band.width === null ? null : lower + band.width, width: band.width, rate: band.rate };
            lower += band.width ?? 0;
            return row;
          }),
        }
      : null,
    capitalGains: gains.map((g) => ({ rate: parseRuleParams("CAPITAL_GAINS_RATE", g.parameters).rate, from: g.effectiveFrom, to: g.effectiveTo, ...meta(g)! })),
    withholding: withholding.map((w) => ({ name: w.name, description: w.description, ...parseRuleParams("WITHHOLDING_RATE", w.parameters), ...meta(w)! })),
    foreign: foreign ? { ...parseRuleParams("FOREIGN_INCOME_CAP", foreign.parameters), ...meta(foreign)! } : null,
    rentRelief: rent ? parseRuleParams("RENT_RELIEF", rent.parameters).percent : null,
    solarCap: solar ? parseRuleParams("SOLAR_RELIEF", solar.parameters).annualCap : null,
    charityCap: charity ? parseRuleParams("CHARITY_DONATION", charity.parameters).cap : null,
  };
}

export type PublicRates = ReturnType<typeof summarise>;

/** Headline rates for the public pages, read from the same rule versions the engine uses. */
export async function getPublicRates(taxYearCode?: string): Promise<PublicRates> {
  return summarise(await loadRuleSet(taxYearCode ?? (await getCurrentTaxYear()).code));
}
