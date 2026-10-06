import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, isPublicPath, LOCALE_COOKIE, LOCALE_HEADER, matchAcceptLanguage, splitLocale, type Locale } from "@/lib/i18n/config";

// Optimistic gate only: it looks for the presence of the session cookie so signed-out visitors
// are redirected before a page renders. It grants nothing. Every page, Server Action and Route
// Handler verifies the session against the database (lib/auth/session.ts).

const SESSION_COOKIE = "ayk_session";
const PROTECTED = ["/dashboard", "/income", "/expenses", "/tax", "/payments", "/documents", "/reports", "/calendar", "/settings", "/admin", "/onboarding"];

function rememberLocale(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

function withLocale(request: NextRequest, locale: Locale) {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return { request: { headers } };
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale: prefix, path } = splitLocale(pathname);
  const savedValue = request.cookies.get(LOCALE_COOKIE)?.value;
  const saved = isLocale(savedValue) ? savedValue : null;

  // An address with a language prefix is an explicit choice: remember it.
  if (prefix) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    // Public pages in Sinhala and Tamil are served at their prefixed address.
    if (prefix !== DEFAULT_LOCALE && isPublicPath(path)) {
      const response = NextResponse.rewrite(url, withLocale(request, prefix));
      return saved === prefix ? response : rememberLocale(response, prefix);
    }
    // Everything else has one address; the language comes from the saved choice.
    return rememberLocale(NextResponse.redirect(url), prefix);
  }

  const locale = saved ?? matchAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT_LOCALE;
  const isRead = request.method === "GET" || request.method === "HEAD";
  if (locale !== DEFAULT_LOCALE && isRead && isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // "/tax" is the private tax page; "/tax-calculator" and "/tax-deadlines" are public.
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next(withLocale(request, locale));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp)$).*)"],
};
