import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toISODate } from "@/lib/format";
import type { ResolvedRule, RuleSet, RuleType } from "@/lib/tax/types";

export interface TaxYearInfo {
  id: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status: "UPCOMING" | "CURRENT" | "CLOSED";
}

export const listTaxYears = cache(async (): Promise<TaxYearInfo[]> => {
  const years = await db.taxYear.findMany({ orderBy: { startsOn: "desc" } });
  return years.map((y) => ({ id: y.id, code: y.code, startsOn: toISODate(y.startsOn), endsOn: toISODate(y.endsOn), status: y.status }));
});

export async function getTaxYear(code: string): Promise<TaxYearInfo> {
  const year = (await listTaxYears()).find((y) => y.code === code);
  if (!year) throw new AppError("That tax year is not available.", 404);
  return year;
}

export async function getCurrentTaxYear(): Promise<TaxYearInfo> {
  const years = await listTaxYears();
  const current = years.find((y) => y.status === "CURRENT") ?? years[0];
  if (!current) throw new AppError("No tax years are configured yet. Run the database seed.", 404);
  return current;
}

type VersionRow = Awaited<ReturnType<typeof fetchVersions>>[number];

function fetchVersions(taxYearId: string, extraVersionIds: string[]) {
  return db.taxRuleVersion.findMany({
    where: { rule: { taxYearId }, OR: [{ status: "ACTIVE" }, { id: { in: extraVersionIds } }] },
    include: { rule: true, source: true },
    orderBy: [{ ruleId: "asc" }, { version: "asc" }],
  });
}

export function toResolvedRule(row: VersionRow, taxYearCode: string): ResolvedRule {
  return {
    id: row.id,
    taxYear: taxYearCode,
    ruleType: row.rule.ruleType as RuleType,
    key: row.rule.key,
    name: row.rule.name,
    description: row.rule.description,
    version: row.version,
    parameters: row.parameters,
    effectiveFrom: toISODate(row.effectiveFrom),
    effectiveTo: row.effectiveTo ? toISODate(row.effectiveTo) : null,
    verification: row.verification,
    source: row.source ? { ref: row.source.ref, title: row.source.title, authority: row.source.authority, url: row.source.url } : null,
    sourceLocator: row.sourceLocator,
    notes: row.notes,
    lastVerifiedAt: row.lastVerifiedAt ? toISODate(row.lastVerifiedAt) : null,
  };
}

const FAR_FUTURE = "9999-12-31";

export function rangesOverlap(a: { effectiveFrom: string; effectiveTo: string | null }, b: { effectiveFrom: string; effectiveTo: string | null }) {
  return a.effectiveFrom <= (b.effectiveTo ?? FAR_FUTURE) && b.effectiveFrom <= (a.effectiveTo ?? FAR_FUTURE);
}

export function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return toISODate(d);
}

/**
 * Loads the active rule versions for a tax year. `withDraft` substitutes one draft version for
 * the active version(s) of the same rule it overlaps, for the admin "preview before activating" flow.
 */
export async function loadRuleSet(taxYearCode: string, withDraft?: { versionId: string }): Promise<RuleSet> {
  const year = await getTaxYear(taxYearCode);
  const rows = await fetchVersions(year.id, withDraft ? [withDraft.versionId] : []);
  let rules = rows.map((row) => ({ row, rule: toResolvedRule(row, year.code) }));

  if (withDraft) {
    const draft = rules.find((r) => r.row.id === withDraft.versionId);
    if (draft) {
      // Mirror what activation does: an earlier version keeps the period before the draft
      // starts; a version starting on or after it is replaced.
      rules = rules.flatMap((r) => {
        if (r === draft || r.row.ruleId !== draft.row.ruleId || !rangesOverlap(r.rule, draft.rule)) return [r];
        if (r.rule.effectiveFrom >= draft.rule.effectiveFrom) return [];
        return [{ ...r, rule: { ...r.rule, effectiveTo: dayBefore(draft.rule.effectiveFrom) } }];
      });
    }
  }
  return { taxYear: { code: year.code, startsOn: year.startsOn, endsOn: year.endsOn }, rules: rules.map((r) => r.rule) };
}
