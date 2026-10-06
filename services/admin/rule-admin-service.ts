import "server-only";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { deadlineUpdateSchema, draftVersionSchema, sourceSchema } from "@/lib/admin-schemas";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { parseISODate, toISODate } from "@/lib/format";
import { computeTax } from "@/lib/tax/engine";
import { safeParseRuleParams } from "@/lib/tax/rule-params";
import { SCENARIOS } from "@/lib/tax/scenarios";
import type { RuleType } from "@/lib/tax/types";
import { dayBefore, getTaxYear, loadRuleSet, rangesOverlap } from "@/services/tax/rule-repository";

export async function listRulesForAdmin(taxYearCode: string) {
  const year = await getTaxYear(taxYearCode);
  const rules = await db.taxRule.findMany({
    where: { taxYearId: year.id },
    include: { versions: { include: { source: true }, orderBy: { version: "desc" } } },
    orderBy: [{ ruleType: "asc" }, { key: "asc" }],
  });
  return rules.map((r) => ({
    id: r.id,
    ruleType: r.ruleType,
    key: r.key,
    name: r.name,
    description: r.description,
    versions: r.versions.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      verification: v.verification,
      parameters: v.parameters,
      effectiveFrom: toISODate(v.effectiveFrom),
      effectiveTo: v.effectiveTo ? toISODate(v.effectiveTo) : null,
      sourceId: v.sourceId,
      sourceRef: v.source?.ref ?? null,
      sourceTitle: v.source?.title ?? null,
      sourceUrl: v.source?.url ?? null,
      sourceLocator: v.sourceLocator,
      notes: v.notes,
      lastVerifiedAt: v.lastVerifiedAt ? toISODate(v.lastVerifiedAt) : null,
    })),
  }));
}
export type AdminRule = Awaited<ReturnType<typeof listRulesForAdmin>>[number];

export async function createDraftVersion(adminId: string, input: z.infer<typeof draftVersionSchema>): Promise<string> {
  const rule = await db.taxRule.findUnique({ where: { id: input.ruleId }, include: { taxYear: true, versions: { select: { version: true } } } });
  if (!rule) throw notFound("rule");

  let parameters: unknown;
  try {
    parameters = JSON.parse(input.parametersJson);
  } catch {
    throw new AppError("The parameters are not valid JSON.", 422, { parametersJson: ["Not valid JSON"] });
  }
  const parsed = safeParseRuleParams(rule.ruleType as RuleType, parameters);
  if (!parsed.success) {
    throw new AppError("The parameters do not match this rule type.", 422, {
      parametersJson: parsed.error.issues.map((i) => `${i.path.join(".") || "parameters"}: ${i.message}`),
    });
  }
  const yearStart = toISODate(rule.taxYear.startsOn);
  const yearEnd = toISODate(rule.taxYear.endsOn);
  if (input.effectiveFrom < yearStart || input.effectiveFrom > yearEnd) {
    throw new AppError("Please check the highlighted fields.", 422, { effectiveFrom: [`Must fall within ${rule.taxYear.code}`] });
  }
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
    throw new AppError("Please check the highlighted fields.", 422, { effectiveTo: ["Must not be before the start date"] });
  }
  // A rule cannot be marked verified without saying what verified it.
  if (input.verification !== "REQUIRES_VERIFICATION" && !input.sourceId) {
    throw new AppError("Please check the highlighted fields.", 422, { sourceId: ["Choose the source that supports this rule, or mark it as requiring verification"] });
  }

  const version = Math.max(0, ...rule.versions.map((v) => v.version)) + 1;
  const created = await db.taxRuleVersion.create({
    data: {
      ruleId: rule.id,
      version,
      parameters: parsed.data as Prisma.InputJsonValue,
      effectiveFrom: parseISODate(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? parseISODate(input.effectiveTo) : null,
      status: "DRAFT",
      verification: input.verification,
      sourceId: input.sourceId ?? null,
      sourceLocator: input.sourceLocator,
      notes: input.notes,
      lastVerifiedAt: input.verification === "REQUIRES_VERIFICATION" ? null : new Date(),
      createdById: adminId,
    },
  });
  await audit({ userId: adminId, action: "taxrule.draft_created", entity: "TaxRuleVersion", entityId: created.id, after: { rule: `${rule.taxYear.code} ${rule.ruleType}/${rule.key}`, version, parameters: parsed.data, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null } });
  return created.id;
}

export interface ScenarioPreview {
  id: string;
  name: string;
  before: number | null;
  after: number | null;
  difference: number | null;
  error: string | null;
}

/** Runs the fixed scenarios with and without a draft version; nothing is saved. */
export async function previewDraftVersion(versionId: string): Promise<{ taxYear: string; scenarios: ScenarioPreview[] }> {
  const version = await db.taxRuleVersion.findUnique({ where: { id: versionId }, include: { rule: { include: { taxYear: true } } } });
  if (!version) throw notFound("rule version");
  const code = version.rule.taxYear.code;
  const [current, proposed] = await Promise.all([loadRuleSet(code), loadRuleSet(code, { versionId })]);
  const effectiveFrom = toISODate(version.effectiveFrom);

  const scenarios = SCENARIOS.map((s): ScenarioPreview => {
    // Dated items are placed on the draft's first day so a mid-year change is exercised.
    const inputs = { ...s.inputs, income: s.inputs.income.map((i) => (i.kind === "CAPITAL_GAIN" ? { ...i, date: effectiveFrom } : i)) };
    try {
      const before = computeTax(inputs, current).totalTax;
      const after = computeTax(inputs, proposed).totalTax;
      return { id: s.id, name: s.name, before, after, difference: Math.round((after - before) * 100) / 100, error: null };
    } catch (error) {
      return { id: s.id, name: s.name, before: null, after: null, difference: null, error: error instanceof Error ? error.message : "Calculation failed" };
    }
  });
  return { taxYear: code, scenarios };
}

/**
 * Activates a draft. Earlier active versions keep the period before the draft starts; versions
 * the draft fully replaces are superseded. Stored calculations are untouched: they carry their
 * own snapshot of the rules they used.
 */
export async function activateVersion(adminId: string, versionId: string): Promise<void> {
  const draft = await db.taxRuleVersion.findUnique({ where: { id: versionId }, include: { rule: { include: { taxYear: true } } } });
  if (!draft) throw notFound("rule version");
  if (draft.status !== "DRAFT") throw new AppError("Only a draft can be activated.", 409);
  const draftRange = { effectiveFrom: toISODate(draft.effectiveFrom), effectiveTo: draft.effectiveTo ? toISODate(draft.effectiveTo) : null };

  const affected = await db.$transaction(async (tx) => {
    const actives = await tx.taxRuleVersion.findMany({ where: { ruleId: draft.ruleId, status: "ACTIVE" } });
    const changes: { id: string; version: number; change: string }[] = [];
    for (const active of actives) {
      const range = { effectiveFrom: toISODate(active.effectiveFrom), effectiveTo: active.effectiveTo ? toISODate(active.effectiveTo) : null };
      if (!rangesOverlap(range, draftRange)) continue;
      if (range.effectiveFrom < draftRange.effectiveFrom) {
        const until = dayBefore(draftRange.effectiveFrom);
        await tx.taxRuleVersion.update({ where: { id: active.id }, data: { effectiveTo: parseISODate(until) } });
        changes.push({ id: active.id, version: active.version, change: `effective until ${until}` });
      } else {
        await tx.taxRuleVersion.update({ where: { id: active.id }, data: { status: "SUPERSEDED" } });
        changes.push({ id: active.id, version: active.version, change: "superseded" });
      }
    }
    await tx.taxRuleVersion.update({ where: { id: draft.id }, data: { status: "ACTIVE", activatedAt: new Date() } });
    return changes;
  });

  await audit({
    userId: adminId,
    action: "taxrule.activated",
    entity: "TaxRuleVersion",
    entityId: draft.id,
    before: { previousVersions: affected },
    after: { rule: `${draft.rule.taxYear.code} ${draft.rule.ruleType}/${draft.rule.key}`, version: draft.version, parameters: draft.parameters, ...draftRange },
  });

  // Tell everyone with records in that year that their estimate may have moved.
  const users = await db.incomeEntry.findMany({ where: { taxYearId: draft.rule.taxYearId, deletedAt: null }, distinct: ["userId"], select: { userId: true } });
  if (users.length > 0) {
    await db.notification.createMany({
      data: users.map((u) => ({
        userId: u.userId,
        type: "TAX_RULE_UPDATED" as const,
        title: "A tax rule was updated",
        body: `"${draft.rule.name}" for ${draft.rule.taxYear.code} has a new version. Your estimate for that year uses it from now on; earlier saved calculations are unchanged.`,
        href: "/tax",
        dedupeKey: `rule:${draft.id}`,
      })),
      skipDuplicates: true,
    });
  }
}

export async function discardDraft(adminId: string, versionId: string): Promise<void> {
  const draft = await db.taxRuleVersion.findUnique({ where: { id: versionId } });
  if (!draft) throw notFound("rule version");
  if (draft.status !== "DRAFT") throw new AppError("Only a draft can be discarded. Active and superseded versions are kept for history.", 409);
  await db.taxRuleVersion.delete({ where: { id: versionId } });
  await audit({ userId: adminId, action: "taxrule.draft_discarded", entity: "TaxRuleVersion", entityId: versionId, before: { version: draft.version, parameters: draft.parameters } });
}

// ── Sources

export async function listSources() {
  const rows = await db.taxRuleSource.findMany({ orderBy: { ref: "asc" }, include: { _count: { select: { versions: true } } } });
  return rows.map((s) => ({
    id: s.id,
    ref: s.ref,
    title: s.title,
    authority: s.authority,
    url: s.url,
    documentType: s.documentType,
    publicationDate: s.publicationDate ? toISODate(s.publicationDate) : null,
    lastCheckedAt: s.lastCheckedAt ? toISODate(s.lastCheckedAt) : null,
    notes: s.notes,
    ruleVersions: s._count.versions,
  }));
}

export async function createSource(adminId: string, input: z.infer<typeof sourceSchema>): Promise<void> {
  if (await db.taxRuleSource.findUnique({ where: { ref: input.ref } })) {
    throw new AppError("Please check the highlighted fields.", 422, { ref: ["That reference is already used"] });
  }
  const created = await db.taxRuleSource.create({
    data: { ...input, publicationDate: input.publicationDate ? parseISODate(input.publicationDate) : null, lastCheckedAt: new Date() },
  });
  await audit({ userId: adminId, action: "taxsource.created", entity: "TaxRuleSource", entityId: created.id, after: input });
}

// ── Tax years and deadlines

/**
 * Opens a new year of assessment. The previous year's active rules are copied across as DRAFTS
 * marked "requires verification": nothing applies to the new year until an administrator has
 * checked it against that year's law and activated it.
 */
export async function createTaxYear(adminId: string, code: string): Promise<void> {
  const [start, end] = code.split("/").map(Number);
  if (end !== start + 1) throw new AppError("Please check the highlighted fields.", 422, { code: ["Use the form 2027/2028"] });
  if (await db.taxYear.findUnique({ where: { code } })) throw new AppError("Please check the highlighted fields.", 422, { code: ["That tax year already exists"] });
  const previous = await db.taxYear.findUnique({ where: { code: `${start - 1}/${start}` }, include: { rules: { include: { versions: { where: { status: "ACTIVE" }, orderBy: { effectiveFrom: "desc" }, take: 1 } } } } });
  if (!previous) throw new AppError(`Create ${start - 1}/${start} first; rules are carried forward from the previous year.`);

  const startsOn = parseISODate(`${start}-04-01`);
  const created = await db.$transaction(async (tx) => {
    const year = await tx.taxYear.create({ data: { code, startsOn, endsOn: parseISODate(`${end}-03-31`), status: "UPCOMING" } });
    for (const rule of previous.rules) {
      const latest = rule.versions[0];
      if (!latest) continue;
      await tx.taxRule.create({
        data: {
          taxYearId: year.id,
          ruleType: rule.ruleType,
          key: rule.key,
          name: rule.name,
          description: rule.description,
          versions: {
            create: {
              version: 1,
              parameters: latest.parameters as Prisma.InputJsonValue,
              effectiveFrom: startsOn,
              status: "DRAFT",
              verification: "REQUIRES_VERIFICATION",
              sourceId: latest.sourceId,
              sourceLocator: latest.sourceLocator,
              notes: `Carried forward from ${previous.code}. Verify against the law for ${code} before activating.`,
              createdById: adminId,
            },
          },
        },
      });
    }
    return year;
  });
  await audit({ userId: adminId, action: "taxyear.created", entity: "TaxYear", entityId: created.id, after: { code, carriedForwardFrom: previous.code, rules: previous.rules.length } });
}

export async function listDeadlinesForAdmin(taxYearCode: string) {
  const year = await getTaxYear(taxYearCode);
  const rows = await db.taxDeadline.findMany({ where: { taxYearId: year.id }, orderBy: { dueOn: "asc" }, include: { source: true } });
  return rows.map((d) => ({ id: d.id, type: d.type, title: d.title, dueOn: toISODate(d.dueOn), verification: d.verification, sourceRef: d.source?.ref ?? null }));
}

export async function updateDeadline(adminId: string, input: z.infer<typeof deadlineUpdateSchema>): Promise<void> {
  const existing = await db.taxDeadline.findUnique({ where: { id: input.id } });
  if (!existing) throw notFound("deadline");
  await db.taxDeadline.update({ where: { id: input.id }, data: { dueOn: parseISODate(input.dueOn), verification: input.verification } });
  await audit({
    userId: adminId,
    action: "taxdeadline.updated",
    entity: "TaxDeadline",
    entityId: input.id,
    before: { dueOn: toISODate(existing.dueOn), verification: existing.verification },
    after: { dueOn: input.dueOn, verification: input.verification },
  });
}

export async function listAuditLog(filter: { actionPrefix?: string; userId?: string }, take = 100) {
  const rows = await db.auditLog.findMany({
    where: { ...(filter.actionPrefix ? { action: { startsWith: filter.actionPrefix } } : {}), ...(filter.userId ? { userId: filter.userId } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    userEmail: r.user?.email ?? null,
    before: r.before,
    after: r.after,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt.toISOString(),
  }));
}
