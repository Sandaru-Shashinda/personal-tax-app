import "server-only";
import type { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { formatLKR, parseISODate, toISODate } from "@/lib/format";
import { round2 } from "@/lib/tax/money";
import { optionalRule } from "@/lib/tax/rule-set";
import type { PaymentInput } from "@/lib/validation/records";
import { getTaxYear, loadRuleSet } from "@/services/tax/rule-repository";
import { getPriorYearTax, getTaxSummary, recalculate } from "@/services/tax/tax-service";

const n = (value: Prisma.Decimal | null | undefined) => (value === null || value === undefined ? 0 : Number(value));

export async function listPayments(userId: string, taxYearCode: string, query: { page: number; pageSize: number }) {
  const taxYear = await getTaxYear(taxYearCode);
  const where = { userId, taxYearId: taxYear.id, deletedAt: null };
  const [rows, total] = await Promise.all([
    db.taxPayment.findMany({
      where,
      orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { _count: { select: { documents: { where: { deletedAt: null } } } } },
    }),
    db.taxPayment.count({ where }),
  ]);
  return {
    items: rows.map((p) => ({
      id: p.id,
      type: p.type,
      paidOn: toISODate(p.paidOn),
      amount: n(p.amount),
      reference: p.reference,
      bank: p.bank,
      instalmentNo: p.instalmentNo,
      notes: p.notes,
      documentCount: p._count.documents,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}
export type PaymentDTO = Awaited<ReturnType<typeof listPayments>>["items"][number];

export async function createPayment(userId: string, input: PaymentInput): Promise<string> {
  const taxYear = await getTaxYear(input.taxYear);
  // Payments for a year can be made after it ends (4th instalment, final payment), never before it starts.
  if (input.paidOn < taxYear.startsOn) {
    const t = await getT();
    throw new AppError("Please check the highlighted fields.", 422, { paidOn: [t("Payments for {year} cannot be dated before 1 April {start}.", { year: taxYear.code, start: taxYear.startsOn.slice(0, 4) })] });
  }
  if (!input.confirmExceeds) {
    const { result } = await getTaxSummary(userId, taxYear.code);
    if (result.totalTax > 0 && input.amount > Math.max(result.balancePayable, 0)) {
      const t = await getT();
      throw new AppError(
        t("This payment ({amount}) is more than your estimated outstanding tax ({outstanding}). Confirm to record it anyway.", { amount: formatLKR(input.amount), outstanding: formatLKR(Math.max(result.balancePayable, 0)) }),
        409,
        { confirmExceeds: [t("Confirmation needed")] },
      );
    }
  }
  const payment = await db.taxPayment.create({
    data: {
      userId,
      taxYearId: taxYear.id,
      type: input.type,
      paidOn: parseISODate(input.paidOn),
      amount: input.amount,
      reference: input.reference,
      bank: input.bank,
      instalmentNo: input.type === "INSTALMENT" ? input.instalmentNo : null,
      notes: input.notes,
    },
  });
  await audit({ userId, action: "payment.create", entity: "TaxPayment", entityId: payment.id, after: input });
  await recalculate(userId, taxYear.code);
  return payment.id;
}

export async function deletePayment(userId: string, id: string): Promise<void> {
  const existing = await db.taxPayment.findFirst({ where: { id, userId, deletedAt: null }, include: { taxYear: true } });
  if (!existing) throw notFound("payment");
  await db.taxPayment.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId, action: "payment.delete", entity: "TaxPayment", entityId: id, before: { type: existing.type, amount: n(existing.amount), paidOn: toISODate(existing.paidOn) } });
  await recalculate(userId, existing.taxYear.code);
}

export interface InstalmentRow {
  instalmentNo: number;
  title: string;
  dueOn: string;
  amountDue: number;
  amountPaid: number;
  basis: "PRIOR_YEAR" | "CURRENT_ESTIMATE";
}

/**
 * The year's instalment schedule reconciled against recorded payments. What each instalment is
 * based on comes from the year's INSTALMENT_BASIS rule; where prior-year tax is needed but not
 * on record, the current-year estimate is used and labelled as such.
 */
export async function getInstalmentSchedule(userId: string, taxYearCode: string): Promise<{ rows: InstalmentRow[]; basisNote: string }> {
  const taxYear = await getTaxYear(taxYearCode);
  const t = await getT();
  const [ruleSet, summary, deadlines, payments] = await Promise.all([
    loadRuleSet(taxYear.code),
    getTaxSummary(userId, taxYear.code),
    db.taxDeadline.findMany({ where: { taxYearId: taxYear.id, type: "INSTALMENT" }, orderBy: { dueOn: "asc" } }),
    db.taxPayment.findMany({ where: { userId, taxYearId: taxYear.id, deletedAt: null, type: "INSTALMENT" } }),
  ]);
  const rule = optionalRule(ruleSet, "INSTALMENT_BASIS", "individual");
  const count = rule?.params.instalments ?? deadlines.length;
  const { result } = summary;
  // Tax still to be collected by instalments: liability less tax already withheld at source.
  const withheld = result.creditLines.filter((l) => ["APIT", "AIT", "FOREIGN_TAX_CREDIT", "CGT_PAID"].includes(l.code)).reduce((sum, l) => sum + l.amount, 0);
  const currentEstimate = Math.max(round2(result.totalTax - withheld), 0);

  let basis: InstalmentRow["basis"] = "CURRENT_ESTIMATE";
  let total = currentEstimate;
  let basisNote = t("Based on your estimated tax for this year, less tax already withheld at source.");
  if (rule?.params.basis === "PRIOR_YEAR_LIABILITY") {
    const prior = await getPriorYearTax(userId, taxYear);
    if (prior) {
      basis = "PRIOR_YEAR";
      total = prior.totalTax;
      basisNote = t("Based on your income tax payable for {prior} ({amount}), as the rules for {year} require. This is before any tax withheld at source this year.", { prior: prior.code, amount: formatLKR(prior.totalTax), year: taxYear.code });
    } else {
      basisNote = t("For {year} instalments are based on the previous year's tax. No {prior} records are on file, so this shows an estimate from this year's figures. IRD has not yet published the procedure for this case.", {
        year: taxYear.code,
        prior: taxYear.code.replace(/(\d{4})\/(\d{4})/, (_, a, b) => `${Number(a) - 1}/${Number(b) - 1}`),
      });
    }
  }

  const each = count > 0 ? round2(total / count) : 0;
  const unallocated = payments.filter((p) => !p.instalmentNo).reduce((sum, p) => sum + n(p.amount), 0);
  let pool = unallocated;
  const rows = deadlines.slice(0, count).map((d, index) => {
    const no = index + 1;
    let paid = payments.filter((p) => p.instalmentNo === no).reduce((sum, p) => sum + n(p.amount), 0);
    // Payments recorded without an instalment number fill the earliest shortfalls first.
    const top = Math.min(pool, Math.max(each - paid, 0));
    paid = round2(paid + top);
    pool = round2(pool - top);
    return { instalmentNo: no, title: t(d.title), dueOn: toISODate(d.dueOn), amountDue: each, amountPaid: paid, basis };
  });
  return { rows, basisNote };
}
