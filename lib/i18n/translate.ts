// The English text in the source is the key. A catalog maps it to another language, and a
// missing entry falls back to the English, so untranslated text is readable rather than broken.

export type Catalog = Record<string, string>;
export type Vars = Record<string, string | number>;
export type Translate = (text: string, vars?: Vars) => string;

/** Replaces {name} placeholders. Unknown placeholders are left as written. */
export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function createTranslator(catalog?: Catalog): Translate {
  return (text, vars) => interpolate(catalog?.[text] ?? text, vars);
}

/**
 * Marks text that is translated later, where it is displayed (labels in module-level constants,
 * validation messages). It returns its argument; the catalog test finds these alongside calls to `t`.
 */
export const msg = (text: string) => text;
