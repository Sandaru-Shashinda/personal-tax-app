import { parseRuleParams, type RuleParams } from "./rule-params";
import type { ResolvedRule, RuleSet, RuleType, RuleUse } from "./types";

export class TaxRuleMissingError extends Error {
  constructor(
    public readonly taxYear: string,
    public readonly ruleType: RuleType,
    public readonly key: string,
    public readonly asOf: string,
  ) {
    super(`No active ${ruleType} rule "${key}" for ${taxYear} on ${asOf}`);
    this.name = "TaxRuleMissingError";
  }
}

function covers(rule: ResolvedRule, asOf: string): boolean {
  return rule.effectiveFrom <= asOf && (rule.effectiveTo === null || asOf <= rule.effectiveTo);
}

/**
 * Finds the rule version in force on `asOf`. Defaults to the last day of the tax year, so
 * date-insensitive rules resolve to whatever was in force when the year closed; date-sensitive
 * ones (capital gains) pass the transaction date.
 */
export function findRule(ruleSet: RuleSet, ruleType: RuleType, key: string, asOf?: string): ResolvedRule | null {
  const date = asOf ?? ruleSet.taxYear.endsOn;
  const candidates = ruleSet.rules.filter((r) => r.ruleType === ruleType && r.key === key && covers(r, date));
  if (candidates.length === 0) return null;
  // Overlapping versions should not exist; if they do, the newest wins deterministically.
  return candidates.reduce((best, r) => (r.version > best.version ? r : best));
}

export interface PickedRule<T extends RuleType> {
  rule: ResolvedRule;
  params: RuleParams<T>;
}

export function requireRule<T extends RuleType>(ruleSet: RuleSet, ruleType: T, key: string, asOf?: string): PickedRule<T> {
  const rule = findRule(ruleSet, ruleType, key, asOf);
  if (!rule) throw new TaxRuleMissingError(ruleSet.taxYear.code, ruleType, key, asOf ?? ruleSet.taxYear.endsOn);
  return { rule, params: parseRuleParams(ruleType, rule.parameters) };
}

export function optionalRule<T extends RuleType>(ruleSet: RuleSet, ruleType: T, key: string, asOf?: string): PickedRule<T> | null {
  const rule = findRule(ruleSet, ruleType, key, asOf);
  return rule ? { rule, params: parseRuleParams(ruleType, rule.parameters) } : null;
}

export function toRuleUse(rule: ResolvedRule): RuleUse {
  return {
    id: rule.id,
    ruleType: rule.ruleType,
    key: rule.key,
    name: rule.name,
    version: rule.version,
    verification: rule.verification,
    source: rule.source,
    sourceLocator: rule.sourceLocator,
    lastVerifiedAt: rule.lastVerifiedAt,
    parameters: rule.parameters,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
  };
}

/** Clamps a date into the tax year so entries dated just outside still resolve a rule. */
export function clampToYear(ruleSet: RuleSet, date: string | undefined): string {
  if (!date) return ruleSet.taxYear.endsOn;
  if (date < ruleSet.taxYear.startsOn) return ruleSet.taxYear.startsOn;
  if (date > ruleSet.taxYear.endsOn) return ruleSet.taxYear.endsOn;
  return date;
}
