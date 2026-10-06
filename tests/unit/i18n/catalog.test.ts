import { describe, expect, it } from "vitest";
import { catalogs } from "@/lib/i18n/catalogs";
import { localizePath, matchAcceptLanguage, splitLocale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translate";
import { collectKeys } from "./collect-keys";

const keys = collectKeys();
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tags = (text: string) => [...text.matchAll(/<\/?(\w+)>/g)].map((m) => m[0]).sort();

describe.each(["si", "ta"] as const)("%s catalog", (locale) => {
  const catalog = catalogs[locale]!;

  it("translates every piece of text the app shows", () => {
    const missing = [...keys.all].filter((key) => !catalog.all[key]?.trim());
    expect(missing).toEqual([]);
  });

  it("sends the browser every translation a Client Component looks up", () => {
    const missing = [...keys.client].filter((key) => !catalog.client[key]?.trim());
    expect(missing).toEqual([]);
  });

  it("keeps each placeholder and tag of the English text", () => {
    const broken = Object.entries(catalog.all).filter(
      ([english, translated]) => placeholders(english).join() !== placeholders(translated).join() || tags(english).join() !== tags(translated).join(),
    );
    expect(broken.map(([english]) => english)).toEqual([]);
  });

  it("has no entries the app no longer uses", () => {
    expect(Object.keys(catalog.all).filter((key) => !keys.all.has(key))).toEqual([]);
  });
});

describe("translator", () => {
  it("falls back to the English text and fills placeholders", () => {
    const t = createTranslator({ "Hello, {name}": "ආයුබෝවන්, {name}" });
    expect(t("Hello, {name}", { name: "Nimali" })).toBe("ආයුබෝවන්, Nimali");
    expect(t("{count} records", { count: 3 })).toBe("3 records");
    expect(createTranslator()("Unknown {thing}")).toBe("Unknown {thing}");
  });
});

describe("locale routing", () => {
  it("reads and writes the language prefix of public pages only", () => {
    expect(splitLocale("/si/tax-calculator")).toEqual({ locale: "si", path: "/tax-calculator" });
    expect(splitLocale("/ta")).toEqual({ locale: "ta", path: "/" });
    expect(splitLocale("/tax-calculator")).toEqual({ locale: null, path: "/tax-calculator" });
    expect(splitLocale("/settings")).toEqual({ locale: null, path: "/settings" });
    expect(localizePath("si", "/")).toBe("/si");
    expect(localizePath("ta", "/about")).toBe("/ta/about");
    expect(localizePath("en", "/about")).toBe("/about");
    expect(localizePath("si", "/dashboard")).toBe("/dashboard");
  });

  it("picks the visitor's preferred supported language", () => {
    expect(matchAcceptLanguage("si-LK,si;q=0.9,en;q=0.8")).toBe("si");
    expect(matchAcceptLanguage("en-US,en;q=0.9,ta;q=0.8")).toBe("en");
    expect(matchAcceptLanguage("fr,ta;q=0.5")).toBe("ta");
    expect(matchAcceptLanguage("fr-FR")).toBeNull();
    expect(matchAcceptLanguage(null)).toBeNull();
  });
});
