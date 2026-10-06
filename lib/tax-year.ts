import "server-only";
import { cookies } from "next/headers";
import { getCurrentTaxYear, listTaxYears, type TaxYearInfo } from "@/services/tax/rule-repository";

export const TAX_YEAR_COOKIE = "ayk_tax_year";

/**
 * The tax year a page should show: an explicit `?year=` wins, then the user's last choice,
 * then the current year. Unknown values fall through rather than erroring.
 */
export async function resolveTaxYear(yearParam?: string | string[]): Promise<TaxYearInfo> {
  const years = await listTaxYears();
  const requested = Array.isArray(yearParam) ? yearParam[0] : yearParam;
  const fromParam = requested && years.find((y) => y.code === requested);
  if (fromParam) return fromParam;
  const saved = (await cookies()).get(TAX_YEAR_COOKIE)?.value;
  const fromCookie = saved && years.find((y) => y.code === saved);
  return fromCookie || getCurrentTaxYear();
}
