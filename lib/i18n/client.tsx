"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { createTranslator, type Catalog, type Translate } from "./translate";

const I18nContext = createContext<{ locale: Locale; t: Translate }>({ locale: DEFAULT_LOCALE, t: createTranslator() });

/** Gives Client Components the request's language and the part of its catalog they use. */
export function I18nProvider({ locale, catalog, children }: { locale: Locale; catalog?: Catalog; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(catalog) }), [locale, catalog]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** `const t = useT()` in Client Components. */
export const useT = (): Translate => useContext(I18nContext).t;

export const useLocale = (): Locale => useContext(I18nContext).locale;
