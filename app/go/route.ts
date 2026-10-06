import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { TAX_YEAR_COOKIE } from "@/lib/tax-year";
import { listTaxYears } from "@/services/tax/rule-repository";

/**
 * Switches the selected tax year and continues to a page inside the app. Used by search results
 * that belong to another year. Only same-site paths are followed.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const to = request.nextUrl.searchParams.get("to") ?? "/dashboard";
  const target = to.startsWith("/") && !to.startsWith("//") && !to.includes("\\") ? to : "/dashboard";
  const response = NextResponse.redirect(new URL(target, request.url));
  const year = request.nextUrl.searchParams.get("year");
  if (year && (await listTaxYears()).some((y) => y.code === year)) {
    response.cookies.set(TAX_YEAR_COOKIE, year, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return response;
}
