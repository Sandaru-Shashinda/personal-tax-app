import { z } from "zod";
import { authed, json, searchParams } from "@/lib/api";
import { pagination, taxYearCode } from "@/lib/validation/common";
import { expenseSchema } from "@/lib/validation/records";
import { createExpense, listExpenses } from "@/services/records/expense-service";
import { getCurrentTaxYear } from "@/services/tax/rule-repository";

const query = pagination.extend({
  year: taxYearCode.optional(),
  category: z.string().max(60).optional(),
  deductibility: z.enum(["DEDUCTIBLE", "PARTIALLY_DEDUCTIBLE", "NON_DEDUCTIBLE", "REQUIRES_REVIEW"]).optional(),
  q: z.string().max(80).optional(),
});

export const GET = authed("We couldn't load your expenses.", async (request, user) => {
  const { year, ...rest } = query.parse(searchParams(request));
  return json(await listExpenses(user.id, year ?? (await getCurrentTaxYear()).code, rest));
});

export const POST = authed("We couldn't save this expense. Please try again.", async (request, user) => {
  const id = await createExpense(user.id, expenseSchema.parse(await request.json()));
  return json({ id }, 201);
});
