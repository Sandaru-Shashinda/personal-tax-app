import { z } from "zod";
import { authed, json, searchParams } from "@/lib/api";
import { pagination, taxYearCode } from "@/lib/validation/common";
import { INCOME_TYPES, incomeEntrySchema } from "@/lib/validation/records";
import { createIncome, listIncome } from "@/services/records/income-service";
import { getCurrentTaxYear } from "@/services/tax/rule-repository";

const query = pagination.extend({ year: taxYearCode.optional(), type: z.enum(INCOME_TYPES).optional(), q: z.string().max(80).optional() });

export const GET = authed("We couldn't load your income records.", async (request, user) => {
  const { year, ...rest } = query.parse(searchParams(request));
  return json(await listIncome(user.id, year ?? (await getCurrentTaxYear()).code, rest));
});

export const POST = authed("We couldn't save this income record. Please try again.", async (request, user) => {
  const id = await createIncome(user.id, incomeEntrySchema.parse(await request.json()));
  return json({ id }, 201);
});
