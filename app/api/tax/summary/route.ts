import { authed, json } from "@/lib/api";
import { taxYearCode } from "@/lib/validation/common";
import { getCurrentTaxYear } from "@/services/tax/rule-repository";
import { getTaxSummary } from "@/services/tax/tax-service";

export const GET = authed("We couldn't calculate your tax summary.", async (request, user) => {
  const year = request.nextUrl.searchParams.get("year");
  const code = year ? taxYearCode.parse(year) : (await getCurrentTaxYear()).code;
  const { taxYear, result } = await getTaxSummary(user.id, code);
  return json({ taxYear, result });
});
