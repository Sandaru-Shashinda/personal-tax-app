import "server-only";
import { db } from "@/lib/db";
import { daysBetween, toISODate, todayInSriLanka } from "@/lib/format";
import type { YearFacts } from "@/lib/tax/health";
import { optionalRule } from "@/lib/tax/rule-set";
import { getInstalmentSchedule } from "@/services/records/payment-service";
import type { TaxSummary } from "@/services/tax/tax-service";

/** Gathers the record-keeping facts behind the health score, insights and return checks. */
export async function getYearFacts(userId: string, summary: TaxSummary, emailVerified: boolean): Promise<YearFacts> {
  const { taxYear, result, ruleSet } = summary;
  const where = { userId, taxYearId: taxYear.id, deletedAt: null };
  const today = todayInSriLanka();

  const [taxpayer, byType, salaryNoApit, interestNoAit, documents, reviewCount, schedule, deadline] = await Promise.all([
    db.taxpayer.findUnique({ where: { userId }, select: { tin: true, incomeTypes: true } }),
    db.incomeEntry.groupBy({ by: ["type"], where, _count: true, _sum: { grossAmount: true } }),
    db.incomeEntry.count({ where: { ...where, type: "SALARY", withholdingTax: 0 } }),
    db.incomeEntry.count({ where: { ...where, type: "INTEREST", withholdingTax: 0, investment: { isExempt: false } } }),
    db.document.groupBy({ by: ["category"], where: { userId, deletedAt: null, OR: [{ taxYearId: taxYear.id }, { taxYearId: null }] }, _count: true }),
    db.expense.count({ where: { ...where, deductibility: "REQUIRES_REVIEW" } }),
    getInstalmentSchedule(userId, taxYear.code),
    db.taxDeadline.findFirst({ where: { appliesTo: "INDIVIDUAL", dueOn: { gte: new Date(`${today}T00:00:00Z`) } }, orderBy: { dueOn: "asc" } }),
  ]);

  const count = (type: string) => byType.find((t) => t.type === type)?._count ?? 0;
  const relief = optionalRule(ruleSet, "PERSONAL_RELIEF", "individual")?.params.amount ?? 0;

  return {
    taxYear: taxYear.code,
    result,
    declaredIncomeTypes: taxpayer?.incomeTypes ?? [],
    recordedIncomeTypes: byType.map((t) => t.type),
    salaryRecords: count("SALARY"),
    salaryRecordsWithoutApit: salaryNoApit,
    salaryAboveRelief: result.incomeByCategory.employment > relief,
    interestRecordsWithoutWithholding: interestNoAit,
    documentsByCategory: Object.fromEntries(documents.map((d) => [d.category, d._count])),
    expensesRequiringReview: reviewCount,
    rentalRecords: count("RENTAL"),
    hasTin: Boolean(taxpayer?.tin),
    emailVerified,
    overdueInstalments: schedule.rows
      .filter((row) => row.dueOn < today && row.amountDue - row.amountPaid > 1)
      .map((row) => ({ title: row.title, dueOn: row.dueOn, shortfall: row.amountDue - row.amountPaid })),
    nextDeadline: deadline ? { title: deadline.title, dueOn: toISODate(deadline.dueOn), daysAway: daysBetween(today, toISODate(deadline.dueOn)) } : null,
  };
}

/** Income and expenses per calendar month of the tax year, aggregated in the database. */
export async function getMonthlySeries(userId: string, taxYearId: string, startsOn: string) {
  const [income, expenses] = await Promise.all([
    db.$queryRaw<{ month: Date; total: number }[]>`
      SELECT date_trunc('month', "receivedOn")::date AS month, SUM("grossAmount")::float8 AS total
      FROM "IncomeEntry"
      WHERE "userId" = ${userId}::uuid AND "taxYearId" = ${taxYearId}::uuid AND "deletedAt" IS NULL AND "period" <> 'MONTHLY'
      GROUP BY 1`,
    db.$queryRaw<{ month: Date; total: number }[]>`
      SELECT date_trunc('month', "incurredOn")::date AS month, SUM("amount")::float8 AS total
      FROM "Expense"
      WHERE "userId" = ${userId}::uuid AND "taxYearId" = ${taxYearId}::uuid AND "deletedAt" IS NULL
      GROUP BY 1`,
  ]);
  // Entries that cover several months (salary, rent) are spread evenly across them.
  const spread = await db.incomeEntry.findMany({
    where: { userId, taxYearId, deletedAt: null, period: "MONTHLY" },
    select: { receivedOn: true, grossAmount: true, salary: { select: { months: true } }, rental: { select: { months: true } } },
  });

  const start = new Date(`${startsOn}T00:00:00Z`);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    return { key: toISODate(d).slice(0, 7), label: d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }), income: 0, expenses: 0 };
  });
  const index = new Map(months.map((m, i) => [m.key, i]));
  for (const row of income) {
    const i = index.get(toISODate(row.month).slice(0, 7));
    if (i !== undefined) months[i].income += row.total;
  }
  for (const row of expenses) {
    const i = index.get(toISODate(row.month).slice(0, 7));
    if (i !== undefined) months[i].expenses += row.total;
  }
  for (const entry of spread) {
    const count = entry.salary?.months ?? entry.rental?.months ?? 1;
    const first = index.get(toISODate(entry.receivedOn).slice(0, 7));
    if (first === undefined) continue;
    for (let k = 0; k < count && first + k < 12; k++) months[first + k].income += Number(entry.grossAmount) / count;
  }
  return months.map((m) => ({ ...m, income: Math.round(m.income), expenses: Math.round(m.expenses) }));
}
