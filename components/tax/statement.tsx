import { Why } from "@/components/shared/why";
import { formatLKR } from "@/lib/format";
import { buildStatement, type StatementRow } from "@/lib/tax/statement";
import type { RuleUse, TaxResult } from "@/lib/tax/types";
import { getLocale, getT } from "@/lib/i18n/server";
import type { Translate } from "@/lib/i18n/translate";

function question(row: StatementRow, section: string, t: Translate, lowercase: boolean): string {
  if (section === "Not included in assessable income") return t("Why is this income not included?");
  if (section === "Tax calculation") return t("Why is this amount taxed this way?");
  if (section === "Tax already paid or withheld") return t("Why does this reduce what I owe?");
  return t("Why is {label} deducted?", { label: lowercase ? row.label.toLowerCase() : t(row.label) });
}

/** The whole calculation, top to bottom, with the reason and source behind each line. */
export async function TaxStatement({ result, compact = false }: { result: TaxResult; compact?: boolean }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const rules = new Map<string, RuleUse>(result.rulesUsed.map((r) => [r.id, r]));
  return (
    <div className="space-y-6">
      {buildStatement(result).map((section) => (
        <section key={section.title} aria-label={t(section.title)}>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(section.title)}</h3>
          <dl className="divide-y rounded-xl border">
            {section.rows.map((row, index) => (
              <div key={`${row.label}-${index}`} className={`flex items-start justify-between gap-4 px-4 py-2.5 ${row.emphasis ? "bg-muted/50 font-semibold" : ""}`}>
                <dt className="min-w-0 text-sm">
                  <span>{t(row.label)}</span>
                  {row.line?.base !== undefined && row.detail && <span className="tabular block text-xs font-normal text-muted-foreground">{row.detail}</span>}
                  {!compact && row.line?.why && (
                    <span className="mt-0.5 block print:hidden">
                      <Why question={question(row, section.title, t, locale === "en")} explanation={row.line.why} rule={row.line.ruleId ? (rules.get(row.line.ruleId) ?? null) : null} taxYear={result.taxYear} />
                    </span>
                  )}
                </dt>
                <dd className="tabular shrink-0 text-sm">
                  {row.sign && row.sign !== "=" && <span className="mr-1 text-muted-foreground" aria-hidden>{row.sign}</span>}
                  {row.sign === "−" && <span className="sr-only">{t("minus")} </span>}
                  {formatLKR(row.amount, { cents: !Number.isInteger(row.amount) })}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
