import type { MetadataRoute } from "next";
import { HTML_LANG, LOCALES, localizePath, PUBLIC_PATHS } from "@/lib/i18n/config";

const base = process.env.APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  // Each public page is listed once per language, with the other languages as alternates.
  return PUBLIC_PATHS.flatMap((path) => {
    const languages = Object.fromEntries(LOCALES.map((locale) => [HTML_LANG[locale], `${base}${localizePath(locale, path)}`]));
    return LOCALES.map((locale) => ({
      url: `${base}${localizePath(locale, path)}`,
      changeFrequency: path === "/about" ? ("yearly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : 0.8,
      alternates: { languages },
    }));
  });
}
