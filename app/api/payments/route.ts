import { authed, json, searchParams } from "@/lib/api";
import { pagination, taxYearCode } from "@/lib/validation/common";
import { paymentSchema } from "@/lib/validation/records";
import { createPayment, listPayments } from "@/services/records/payment-service";
import { getCurrentTaxYear } from "@/services/tax/rule-repository";

const query = pagination.extend({ year: taxYearCode.optional() });

export const GET = authed("We couldn't load your payments.", async (request, user) => {
  const { year, ...rest } = query.parse(searchParams(request));
  return json(await listPayments(user.id, year ?? (await getCurrentTaxYear()).code, rest));
});

export const POST = authed("We couldn't save this payment. Please try again.", async (request, user) => {
  const id = await createPayment(user.id, paymentSchema.parse(await request.json()));
  return json({ id }, 201);
});
