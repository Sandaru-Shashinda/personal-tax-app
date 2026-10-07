"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { run } from "@/lib/action";
import { authenticate } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/errors";
import { TAX_YEAR_COOKIE } from "@/lib/tax-year";
import { taxYearCode, uuid } from "@/lib/validation/common";
import { expenseSchema, importSchema, incomeEntrySchema, paymentSchema, qualifyingPaymentSchema } from "@/lib/validation/records";
import { deleteDocument } from "@/services/documents/document-service";
import { markAllNotificationsRead, markNotificationRead } from "@/services/notifications/notification-service";
import * as expenses from "@/services/records/expense-service";
import { importRecords } from "@/services/records/import-service";
import * as income from "@/services/records/income-service";
import * as payments from "@/services/records/payment-service";
import { getTaxYear } from "@/services/tax/rule-repository";
import { recalculate } from "@/services/tax/tax-service";

// Every action authenticates first, validates its input with the shared Zod schema, and passes
// the session's user id to the service, which scopes every query by it.

function refresh() {
  revalidatePath("/", "layout");
}

export async function setTaxYearAction(code: unknown): Promise<ActionResult> {
  return run(async () => {
    await authenticate();
    const year = await getTaxYear(taxYearCode.parse(code));
    (await cookies()).set(TAX_YEAR_COOKIE, year.code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    refresh();
  }, "We couldn't switch tax year. Please try again.");
}

export async function saveIncomeAction(id: string | null, input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      const data = incomeEntrySchema.parse(input);
      if (id) await income.updateIncome(user.id, uuid.parse(id), data);
      else await income.createIncome(user.id, data);
      refresh();
    },
    "We couldn't save this income record. Please try again.",
    id ? "Income record updated." : "Income record added.",
  );
}

export async function deleteIncomeAction(id: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await income.deleteIncome(user.id, uuid.parse(id));
      refresh();
    },
    "We couldn't delete this income record. Please try again.",
    "Income record deleted.",
  );
}

export async function saveExpenseAction(id: string | null, input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      const data = expenseSchema.parse(input);
      if (id) await expenses.updateExpense(user.id, uuid.parse(id), data);
      else await expenses.createExpense(user.id, data);
      refresh();
    },
    "We couldn't save this expense. Please try again.",
    id ? "Expense updated." : "Expense added.",
  );
}

export async function deleteExpenseAction(id: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await expenses.deleteExpense(user.id, uuid.parse(id));
      refresh();
    },
    "We couldn't delete this expense. Please try again.",
    "Expense deleted.",
  );
}

export async function importRecordsAction(input: unknown): Promise<ActionResult<{ income: number; expenses: number; duplicates: number }>> {
  return run(async () => {
    const user = await authenticate();
    const result = await importRecords(user.id, importSchema.parse(input));
    refresh();
    return result;
  }, "We couldn't import these rows. Please try again.");
}

export async function addQualifyingPaymentAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await expenses.createQualifyingPayment(user.id, qualifyingPaymentSchema.parse(input));
      refresh();
    },
    "We couldn't save this record. Please try again.",
    "Relief claim added.",
  );
}

export async function deleteQualifyingPaymentAction(id: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await expenses.deleteQualifyingPayment(user.id, uuid.parse(id));
      refresh();
    },
    "We couldn't delete this record. Please try again.",
    "Relief claim deleted.",
  );
}

export async function addPaymentAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await payments.createPayment(user.id, paymentSchema.parse(input));
      refresh();
    },
    "We couldn't save this payment. Please try again.",
    "Payment recorded.",
  );
}

export async function deletePaymentAction(id: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await payments.deletePayment(user.id, uuid.parse(id));
      refresh();
    },
    "We couldn't delete this payment. Please try again.",
    "Payment deleted.",
  );
}

export async function deleteDocumentAction(id: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await deleteDocument(user.id, uuid.parse(id));
      refresh();
    },
    "We couldn't delete this document. Please try again.",
    "Document deleted.",
  );
}

export async function recalculateAction(code: unknown): Promise<ActionResult<{ changed: boolean }>> {
  return run(async () => {
    const user = await authenticate();
    const { changed } = await recalculate(user.id, taxYearCode.parse(code), "user");
    refresh();
    return { changed };
  }, "We couldn't calculate your tax. Please try again.");
}

export async function markNotificationReadAction(id: unknown): Promise<ActionResult> {
  return run(async () => {
    const user = await authenticate();
    await markNotificationRead(user.id, uuid.parse(id));
    refresh();
  }, "We couldn't update that notification.");
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return run(async () => {
    const user = await authenticate();
    await markAllNotificationsRead(user.id);
    refresh();
  }, "We couldn't update your notifications.");
}
