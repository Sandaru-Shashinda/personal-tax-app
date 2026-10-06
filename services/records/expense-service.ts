import "server-only";
import type { Deductibility, Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { parseISODate, toISODate } from "@/lib/format";
import { classifyExpense } from "@/lib/tax/expense-classifier";
import { optionalRule } from "@/lib/tax/rule-set";
import type { ExpenseInput, QualifyingPaymentInput } from "@/lib/validation/records";
import { getTaxYear, loadRuleSet, type TaxYearInfo } from "@/services/tax/rule-repository";
import { recalculate } from "@/services/tax/tax-service";

const n = (value: Prisma.Decimal | null | undefined) => (value === null || value === undefined ? 0 : Number(value));

/** Used only if a tax year has no EXPENSE_DEDUCTIBILITY rule; the rule is the source of truth. */
const NO_CASH_LIMIT = Number.POSITIVE_INFINITY;

const expenseInclude = {
  incomeSource: { select: { id: true, name: true, type: true } },
  _count: { select: { documents: { where: { deletedAt: null } } } },
} satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

function toDTO(row: ExpenseRow) {
  return {
    id: row.id,
    incurredOn: toISODate(row.incurredOn),
    amount: n(row.amount),
    category: row.category,
    description: row.description,
    paymentMethod: row.paymentMethod,
    incomeSourceId: row.incomeSourceId,
    incomeSourceName: row.incomeSource?.name ?? null,
    isCapital: row.isCapital,
    userConfirmedBusinessPurpose: row.userConfirmedBusinessPurpose,
    businessUsePercent: row.businessUsePercent,
    deductibility: row.deductibility,
    deductibleAmount: n(row.deductibleAmount),
    deductibilityReason: row.deductibilityReason,
    notes: row.notes,
    receiptCount: row._count.documents,
  };
}
export type ExpenseDTO = ReturnType<typeof toDTO>;

export interface ExpenseListQuery {
  page: number;
  pageSize: number;
  category?: string;
  deductibility?: Deductibility;
  q?: string;
}

export async function listExpenses(userId: string, taxYearCode: string, query: ExpenseListQuery) {
  const taxYear = await getTaxYear(taxYearCode);
  const base: Prisma.ExpenseWhereInput = { userId, taxYearId: taxYear.id, deletedAt: null };
  const where: Prisma.ExpenseWhereInput = {
    ...base,
    ...(query.category ? { category: query.category } : {}),
    ...(query.deductibility ? { deductibility: query.deductibility } : {}),
    ...(query.q ? { description: { contains: query.q, mode: "insensitive" } } : {}),
  };
  const [rows, total, byStatus] = await Promise.all([
    db.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: [{ incurredOn: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.expense.count({ where }),
    db.expense.groupBy({ by: ["deductibility"], where: base, _sum: { amount: true, deductibleAmount: true }, _count: true }),
  ]);
  return {
    items: rows.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
    byStatus: byStatus.map((s) => ({ deductibility: s.deductibility, count: s._count, amount: n(s._sum.amount), deductible: n(s._sum.deductibleAmount) })),
  };
}

async function classify(userId: string, input: ExpenseInput, taxYear: TaxYearInfo) {
  let linkedSourceType: string | null = null;
  if (input.incomeSourceId) {
    const source = await db.incomeSource.findFirst({ where: { id: input.incomeSourceId, userId, deletedAt: null } });
    if (!source) throw notFound("income source");
    linkedSourceType = source.type;
  }
  const rule = optionalRule(await loadRuleSet(taxYear.code), "EXPENSE_DEDUCTIBILITY", "general");
  return classifyExpense(
    {
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      isCapital: input.isCapital,
      linkedSourceType,
      userConfirmedBusinessPurpose: input.userConfirmedBusinessPurpose,
      businessUsePercent: input.businessUsePercent,
    },
    rule?.params.cashPaymentLimit ?? NO_CASH_LIMIT,
  );
}

function assertInYear(date: string, taxYear: TaxYearInfo, field: string) {
  if (date < taxYear.startsOn || date > taxYear.endsOn) {
    throw new AppError("Please check the highlighted fields.", 422, {
      [field]: [`This date is outside the ${taxYear.code} year of assessment (1 April – 31 March).`],
    });
  }
}

function expenseData(input: ExpenseInput, taxYear: TaxYearInfo, c: Awaited<ReturnType<typeof classify>>) {
  return {
    taxYearId: taxYear.id,
    incomeSourceId: input.incomeSourceId ?? null,
    incurredOn: parseISODate(input.incurredOn),
    amount: input.amount,
    category: input.category,
    description: input.description,
    paymentMethod: input.paymentMethod,
    isCapital: input.isCapital,
    userConfirmedBusinessPurpose: input.userConfirmedBusinessPurpose,
    businessUsePercent: input.businessUsePercent,
    deductibility: c.deductibility,
    deductibleAmount: c.deductibleAmount,
    deductibilityReason: c.reason,
    notes: input.notes ?? null,
  };
}

export async function createExpense(userId: string, input: ExpenseInput): Promise<string> {
  const taxYear = await getTaxYear(input.taxYear);
  assertInYear(input.incurredOn, taxYear, "incurredOn");
  const classification = await classify(userId, input, taxYear);
  const expense = await db.expense.create({ data: { userId, ...expenseData(input, taxYear, classification) } });
  await audit({ userId, action: "expense.create", entity: "Expense", entityId: expense.id, after: { ...input, ...classification } });
  await recalculate(userId, taxYear.code);
  return expense.id;
}

export async function updateExpense(userId: string, id: string, input: ExpenseInput): Promise<void> {
  const existing = await db.expense.findFirst({ where: { id, userId, deletedAt: null }, include: expenseInclude });
  if (!existing) throw notFound("expense");
  const taxYear = await getTaxYear(input.taxYear);
  assertInYear(input.incurredOn, taxYear, "incurredOn");
  const classification = await classify(userId, input, taxYear);
  await db.expense.update({ where: { id }, data: expenseData(input, taxYear, classification) });
  await audit({ userId, action: "expense.update", entity: "Expense", entityId: id, before: toDTO(existing), after: { ...input, ...classification } });
  await recalculate(userId, taxYear.code);
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  const existing = await db.expense.findFirst({ where: { id, userId, deletedAt: null }, include: { ...expenseInclude, taxYear: true } });
  if (!existing) throw notFound("expense");
  await db.expense.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId, action: "expense.delete", entity: "Expense", entityId: id, before: toDTO(existing) });
  await recalculate(userId, existing.taxYear.code);
}

// ── Qualifying payments and reliefs the user claims (donations, solar).

export async function listQualifyingPayments(userId: string, taxYearCode: string) {
  const taxYear = await getTaxYear(taxYearCode);
  const rows = await db.qualifyingPayment.findMany({ where: { userId, taxYearId: taxYear.id, deletedAt: null }, orderBy: { paidOn: "desc" } });
  return rows.map((r) => ({ id: r.id, type: r.type, paidOn: toISODate(r.paidOn), amount: n(r.amount), recipient: r.recipient, description: r.description }));
}

export async function createQualifyingPayment(userId: string, input: QualifyingPaymentInput): Promise<string> {
  const taxYear = await getTaxYear(input.taxYear);
  assertInYear(input.paidOn, taxYear, "paidOn");
  const row = await db.qualifyingPayment.create({
    data: { userId, taxYearId: taxYear.id, type: input.type, paidOn: parseISODate(input.paidOn), amount: input.amount, recipient: input.recipient, description: input.description },
  });
  await audit({ userId, action: "qualifying_payment.create", entity: "QualifyingPayment", entityId: row.id, after: input });
  await recalculate(userId, taxYear.code);
  return row.id;
}

export async function deleteQualifyingPayment(userId: string, id: string): Promise<void> {
  const existing = await db.qualifyingPayment.findFirst({ where: { id, userId, deletedAt: null }, include: { taxYear: true } });
  if (!existing) throw notFound("record");
  await db.qualifyingPayment.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId, action: "qualifying_payment.delete", entity: "QualifyingPayment", entityId: id, before: { type: existing.type, amount: n(existing.amount) } });
  await recalculate(userId, existing.taxYear.code);
}
