import fs from "node:fs";
import path from "node:path";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { DEADLINES } from "@/lib/tax/data/deadlines";
import { RULES } from "@/lib/tax/data/rules";

// Finds every piece of English text the app translates, so the catalogs can be checked against
// it. `client` is the subset that Client Components look up in the browser.

const ROOT = path.resolve(import.meta.dirname, "../../..");
const SOURCE_DIRS = ["app", "components", "lib", "services"];
// The rule administration screens are for the operator and stay in English.
const SKIP = [/^components[\\/]ui[\\/]/, /^lib[\\/]i18n[\\/]catalogs[\\/]/, /admin/];

const CALL = /\b(?:t|msg)\(\s*"((?:[^"\\]|\\.)*)"/g;
/** A string literal that reads as display text: starts with a capital and has lower-case letters. */
const DISPLAY_LITERAL = /"([A-Z][^"\\]*[a-z][^"\\]*)"/g;
const SENTENCE_LITERAL = /"([A-Z][^"\\]* [^"\\]*)"/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (SKIP.some((pattern) => pattern.test(relative))) continue;
    if (entry.isDirectory()) walk(relative, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(relative);
  }
  return out;
}

const unescape = (literal: string) => JSON.parse(`"${literal}"`) as string;
const matches = (source: string, pattern: RegExp) => [...source.matchAll(pattern)].map((m) => unescape(m[1]));

export function collectKeys(): { all: Set<string>; client: Set<string> } {
  const all = new Set<string>();
  const client = new Set<string>();
  const add = (keys: Iterable<string>, isClient: boolean) => {
    for (const key of keys) {
      all.add(key);
      if (isClient) client.add(key);
    }
  };

  for (const file of SOURCE_DIRS.flatMap((dir) => walk(dir))) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    const unix = file.replaceAll("\\", "/");
    add(matches(source, CALL), /^\s*["']use client["']/.test(source));
    // Text that is written plainly and translated where it is shown.
    if (unix.startsWith("lib/validation/")) add(matches(source, DISPLAY_LITERAL), true);
    if (unix.startsWith("app/actions/")) add(matches(source, SENTENCE_LITERAL), false);
    add(matches(source, /new AppError\(\s*"((?:[^"\\]|\\.)*)"/g), false);
    add(
      [...source.matchAll(/notFound\("([^"]+)"\)/g)].map((m) => `We couldn't find that ${m[1]}.`),
      false,
    );
    if (/notFound\(\)/.test(source)) add(["We couldn't find that record."], false);
    add(matches(source, /(?:fallback|failure\(error,|authed(?:<[^>]*>)?\()\s*"((?:[^"\\]|\\.)*)"/g), false);
  }

  add([DISCLAIMER_TEXT], false);
  add(["Please check the highlighted fields."], true);
  // Search result groups are named by the server and shown by a Client Component.
  add(["Income", "Expenses", "Payments", "Documents", "Tax years"], true);
  // Seeded reference data is stored in English and translated where it is shown.
  for (const deadline of DEADLINES) add([deadline.title, deadline.description], false);
  for (const rule of RULES) {
    add([rule.name], true);
    if (rule.ruleType === "WITHHOLDING_RATE") add([rule.description], false);
    if (rule.ruleType === "PENALTY_INFO") {
      for (const version of rule.versions) {
        const items = (version.parameters as { items?: { label: string; consequence: string }[] }).items ?? [];
        for (const item of items) add([item.label, item.consequence], false);
      }
    }
  }
  return { all, client };
}
