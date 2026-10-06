// Shared by the proxy, server code and client components: no server-only or React imports here.

export const LOCALES = ["en", "si", "ta"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ayk_locale";
/** Request header the proxy sets so a render never has to work the locale out again. */
export const LOCALE_HEADER = "x-ayk-locale";

/** Each language is named in itself, so it can be found by someone who reads no other. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };
export const HTML_LANG: Record<Locale, string> = { en: "en-LK", si: "si-LK", ta: "ta-LK" };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

/**
 * Public pages have an address per language (/si/tax-calculator) so each can be indexed and
 * shared. English keeps the unprefixed address. Signed-in pages use the saved preference only.
 */
export const PUBLIC_PATHS = ["/", "/tax-calculator", "/sri-lanka-income-tax", "/sri-lanka-tax-guide", "/tax-deadlines", "/about"] as const;

export const isPublicPath = (path: string) => (PUBLIC_PATHS as readonly string[]).includes(path);

/** "/si/about" → { locale: "si", path: "/about" }; "/about" → { locale: null, path: "/about" }. */
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const [, first, ...rest] = pathname.split("/");
  if (!isLocale(first)) return { locale: null, path: pathname };
  return { locale: first, path: `/${rest.join("/")}` };
}

/** The address of a page in a given language. Only public pages carry a language prefix. */
export function localizePath(locale: Locale, href: string): string {
  if (locale === DEFAULT_LOCALE) return href;
  const [path, suffix = ""] = href.split(/(?=[?#])/, 2);
  if (!isPublicPath(path)) return href;
  return `/${locale}${path === "/" ? "" : path}${suffix}`;
}

/** First supported language in an Accept-Language header, in the visitor's order of preference. */
export function matchAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase().split("-")[0], q: q === undefined ? 1 : Number(q) || 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag, q } of ranked) if (q > 0 && isLocale(tag)) return tag;
  return null;
}
