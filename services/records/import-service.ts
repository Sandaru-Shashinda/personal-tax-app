import "server-only";
import { randomUUID } from "node:crypto";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { firstOfMonth, toISODate } from "@/lib/format";
import { businessEntrySchema, expenseSchema, type ImportInput } from "@/lib/validation/records";
import { getTaxYear } from "@/services/tax/rule-repository";
import { recalculate } from "@/services/tax/tax-service";
import { cashPaymentLimit, classifyInput, expenseData, linkedSourceType } from "./expense-service";
import { entryData, resolveSource } from "./income-service";

/** Identifies a record well enough to tell that the same statement row was imported before. */
const rowKey = (period: string, date: string, amount: number, description: string | null | undefined) =>
  `${period}|${period === "MONTHLY" ? firstOfMonth(date) : date}|${amount.toFixed(2)}|${description ?? ""}`;

/**
 * Saves the rows of a statement as income and expense records in one transaction, with a single
 * recalculation. Rows that match a record the user already has are skipped, so importing
 * overlapping statements does not count anything twice.
 */
export async function importRecords(userId: string, input: ImportInput): Promise<{ income: number; expenses: number; duplicates: number }> {
  const taxYear = await getTaxYear(input.taxYear);
  const dates = [...input.expenses.map((e) => e.incurredOn), ...input.income.map((i) => i.receivedOn)];
  if (dates.some((date) => date < taxYear.startsOn || date > taxYear.endsOn)) {
    throw new AppError("Some rows are dated outside this year of assessment.", 422);
  }

  const [sourceType, cashLimit] = await Promise.all([linkedSourceType(userId, input.expenseSourceId), cashPaymentLimit(taxYear)]);
  const expenses = input.expenses.map((row) => {
    const linked = row.category !== "Personal" && Boolean(input.expenseSourceId);
    return expenseSchema.parse({
      ...row,
      taxYear: taxYear.code,
      paymentMethod: input.paymentMethod,
      incomeSourceId: linked ? input.expenseSourceId : undefined,
      userConfirmedBusinessPurpose: linked && input.userConfirmedBusinessPurpose,
    });
  });
  const income = input.income.map((row) =>
    businessEntrySchema.parse({
      type: input.incomeType,
      taxYear: taxYear.code,
      sourceName: input.incomeSourceName,
      receivedOn: row.receivedOn,
      grossAmount: row.amount,
      description: row.description,
      period: row.period,
    }),
  );

  const saved = await db.$transaction(
    async (tx) => {
      const where = { userId, taxYearId: taxYear.id, deletedAt: null };

      const knownExpenses = new Set(
        (await tx.expense.findMany({ where, select: { period: true, incurredOn: true, amount: true, description: true } })).map((e) =>
          rowKey(e.period, toISODate(e.incurredOn), Number(e.amount), e.description),
        ),
      );
      const newExpenses = expenses.filter((e) => !knownExpenses.has(rowKey(e.period, e.incurredOn, e.amount, e.description)));
      if (newExpenses.length > 0) {
        await tx.expense.createMany({
          data: newExpenses.map((e) => ({ userId, ...expenseData(e, taxYear, classifyInput(e, e.incomeSourceId ? sourceType : null, cashLimit)) })),
        });
      }

      let newIncome: typeof income = [];
      if (income.length > 0) {
        const sourceId = await resolveSource(tx, userId, income[0]);
        const knownIncome = new Set(
          (await tx.incomeEntry.findMany({ where: { ...where, sourceId }, select: { period: true, receivedOn: true, grossAmount: true, description: true } })).map((i) =>
            rowKey(i.period, toISODate(i.receivedOn), Number(i.grossAmount), i.description),
          ),
        );
        newIncome = income.filter((i) => !knownIncome.has(rowKey(i.period, i.receivedOn, i.grossAmount, i.description)));
        const entries = newIncome.map((i) => ({ id: randomUUID(), userId, sourceId, ...entryData(i, taxYear) }));
        if (entries.length > 0) {
          await tx.incomeEntry.createMany({ data: entries });
          await tx.businessIncome.createMany({ data: entries.map((entry) => ({ entryId: entry.id })) });
        }
      }
      return { income: newIncome.length, expenses: newExpenses.length };
    },
    { timeout: 30_000 },
  );

  const result = { ...saved, duplicates: expenses.length + income.length - saved.income - saved.expenses };
  await audit({ userId, action: "records.import", after: { taxYear: taxYear.code, ...result } });
  if (saved.income + saved.expenses > 0) await recalculate(userId, taxYear.code);
  return result;
}
