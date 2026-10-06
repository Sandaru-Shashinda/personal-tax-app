import "server-only";
import type { Prisma, ReturnSectionKey } from "@prisma/client";
import { audit } from "@/lib/audit";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/translate";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseISODate, toISODate } from "@/lib/format";
import { getTaxYear } from "./rule-repository";

export const RETURN_SECTIONS: { key: ReturnSectionKey; title: string }[] = [
  { key: "TAXPAYER_DETAILS", title: msg("Review taxpayer details") },
  { key: "INCOME", title: msg("Review income") },
  { key: "DEDUCTIONS", title: msg("Review deductions") },
  { key: "RELIEFS", title: msg("Review reliefs") },
  { key: "CALCULATION", title: msg("Review tax calculation") },
  { key: "PAYMENTS", title: msg("Review payments") },
  { key: "VALIDATION", title: msg("Final validation") },
  { key: "SUMMARY", title: msg("Generate summary and export") },
];

/** The preparation workspace for a year. Created on first visit. */
export async function getReturnWorkspace(userId: string, taxYearCode: string) {
  const taxYear = await getTaxYear(taxYearCode);
  const record = await db.taxReturn.upsert({
    where: { userId_taxYearId: { userId, taxYearId: taxYear.id } },
    update: {},
    create: { userId, taxYearId: taxYear.id },
    include: { sections: true, submissions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const reviewed = new Map(record.sections.map((s) => [s.key, s.reviewedAt]));
  const submission = record.submissions[0];
  return {
    id: record.id,
    sections: RETURN_SECTIONS.map((s) => ({ ...s, reviewedAt: reviewed.get(s.key)?.toISOString() ?? null })),
    filed: submission ? { filedOn: toISODate(submission.filedOn), acknowledgementNo: submission.acknowledgementNo } : null,
  };
}

async function setFilingStatus(userId: string, taxYearId: string, filingStatus: "IN_PROGRESS" | "READY_TO_FILE" | "FILED_BY_USER") {
  await db.taxpayerYear.upsert({ where: { userId_taxYearId: { userId, taxYearId } }, update: { filingStatus }, create: { userId, taxYearId, filingStatus } });
}

export async function setSectionReviewed(userId: string, taxYearCode: string, key: ReturnSectionKey, reviewed: boolean, issues?: unknown): Promise<void> {
  const taxYear = await getTaxYear(taxYearCode);
  const record = await db.taxReturn.findUnique({ where: { userId_taxYearId: { userId, taxYearId: taxYear.id } }, include: { sections: true, submissions: true } });
  if (!record) throw new AppError("Open the return preparation page first.", 404);
  const data = { reviewedAt: reviewed ? new Date() : null, issues: (issues ?? undefined) as Prisma.InputJsonValue | undefined };
  await db.taxReturnSection.upsert({ where: { taxReturnId_key: { taxReturnId: record.id, key } }, update: data, create: { taxReturnId: record.id, key, ...data } });

  if (record.submissions.length === 0) {
    const done = new Set(record.sections.filter((s) => s.reviewedAt).map((s) => s.key));
    if (reviewed) done.add(key);
    else done.delete(key);
    await setFilingStatus(userId, taxYear.id, done.size === RETURN_SECTIONS.length ? "READY_TO_FILE" : "IN_PROGRESS");
  }
}

/**
 * Records that the USER filed their return with IRD themselves. This application has no
 * connection to IRD and never files anything.
 */
export async function recordFiledByUser(userId: string, taxYearCode: string, input: { filedOn: string; acknowledgementNo?: string }): Promise<void> {
  const taxYear = await getTaxYear(taxYearCode);
  const record = await db.taxReturn.findUnique({ where: { userId_taxYearId: { userId, taxYearId: taxYear.id } } });
  if (!record) throw new AppError("Open the return preparation page first.", 404);
  if (input.filedOn <= taxYear.endsOn) {
    const t = await getT();
    throw new AppError("Please check the highlighted fields.", 422, { filedOn: [t("A {year} return can only be filed after the year ends on 31 March.", { year: taxYear.code })] });
  }
  await db.taxReturnSubmission.create({ data: { taxReturnId: record.id, filedOn: parseISODate(input.filedOn), acknowledgementNo: input.acknowledgementNo } });
  await setFilingStatus(userId, taxYear.id, "FILED_BY_USER");
  await audit({ userId, action: "return.marked_filed", entity: "TaxReturn", entityId: record.id, after: input });
}
