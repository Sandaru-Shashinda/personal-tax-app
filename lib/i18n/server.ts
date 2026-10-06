import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { catalogs } from "./catalogs";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER, localizePath, type Locale } from "./config";
import { createTranslator, type Translate } from "./translate";

/**
 * The language of the current request. The proxy resolves it (address prefix, then the saved
 * choice, then the browser's preference) and passes it in a header; Route Handlers the proxy
 * does not cover fall back to the cookie.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const fromProxy = (await headers()).get(LOCALE_HEADER);
    if (isLocale(fromProxy)) return fromProxy;
    const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
    return isLocale(saved) ? saved : DEFAULT_LOCALE;
  } catch {
    // Outside a request (scripts, tests) there is nothing to read.
    return DEFAULT_LOCALE;
  }
});

export function translatorFor(locale: Locale): Translate {
  return createTranslator(catalogs[locale]?.all);
}

/** `const t = await getT()` in Server Components, Server Actions and Route Handlers. */
export const getT = cache(async (): Promise<Translate> => translatorFor(await getLocale()));

/**
 * Canonical address and language alternates for a public page, so search engines index each
 * language at its own address and offer the right one.
 */
export async function publicAlternates(path: string) {
  const locale = await getLocale();
  return {
    canonical: localizePath(locale, path),
    languages: { "en-LK": path, "si-LK": localizePath("si", path), "ta-LK": localizePath("ta", path), "x-default": path },
  };
}
