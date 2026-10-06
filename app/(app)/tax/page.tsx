import type { Metadata } from "next";
import { CircleAlert, ClipboardCheck, ExternalLink, FileDown, Info } from "lucide-react";
import Link from "next/link";
import { Disclaimer } from "@/components/shared/disclaimer";
import { PageHeader, StatCard } from "@/components/shared/page";
import { VerificationBadge } from "@/components/shared/why";
import { RecalculateButton } from "@/components/tax/recalculate-button";
import { TaxStatement } from "@/components/tax/statement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatLKR, formatPercent } from "@/lib/format";
import { resolveTaxYear } from "@/lib/tax-year";
import { getTaxSummary, listCalculations } from "@/services/tax/tax-service";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Tax calculation") };
}

export default async function TaxPage() {
  const t = await getT();
  const user = await requireUser();
  const taxYear = await resolveTaxYear();
  const [{ result }, history] = await Promise.all([getTaxSummary(user.id, taxYear.code, t), listCalculations(user.id, taxYear.code, 10)]);

  return (
    <>
      <PageHeader title={t("Tax calculation")} description={t("Exactly how your {year} estimate is worked out, using the rules in force for that year. Calculated on the server from your records.", { year: taxYear.code })}>
        <Button asChild variant="outline">
          <Link href="/tax/return">
            <ClipboardCheck aria-hidden /> {t("Prepare return")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/export/tax-summary-pdf?year=${encodeURIComponent(taxYear.code)}`}>
            <FileDown aria-hidden /> {t("PDF")}
          </a>
        </Button>
        <RecalculateButton taxYear={taxYear.code} />
      </PageHeader>

      <section aria-label={t("Result")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("Total tax")} value={formatLKR(result.totalTax)} tone="primary" hint={t("On taxable income of {amount}", { amount: formatLKR(result.taxableIncome) })} />
        <StatCard label={t("Paid and withheld")} value={formatLKR(result.totalCredits)} hint={t("APIT, AIT, instalments and other credits")} />
        <StatCard label={result.balancePayable >= 0 ? t("Remaining liability") : t("Overpaid")} value={formatLKR(Math.abs(result.balancePayable))} hint={result.balancePayable >= 0 ? t("Total tax less credits") : t("Claimable only through your return")} />
        <StatCard label={t("Effective rate")} value={formatPercent(result.effectiveRate)} hint={t("Marginal rate {rate}", { rate: formatPercent(result.marginalRate, 0) })} />
      </section>

      {result.warnings.length > 0 && (
        <ul className="space-y-2" aria-label={t("Things to check")}>
          {result.warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${warning.severity === "warning" ? "border-warning/40 bg-warning/5" : "bg-muted/40"}`}>
              {warning.severity === "warning" ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
              <span>
                <span className="sr-only">{warning.severity === "warning" ? `${t("Warning:")} ` : `${t("Note:")} `}</span>
                {warning.message}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-xs lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("How the figure is reached")}</CardTitle>
            <CardDescription>{t("From income to remaining liability. Use “Why?” on any line for the reason, the rule and its source.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TaxStatement result={result} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Rules applied")}</CardTitle>
              <CardDescription>{t("The rule versions used for {year}.", { year: taxYear.code })}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {result.rulesUsed.map((rule) => (
                  <li key={rule.id} className="space-y-1.5 text-sm">
                    <p className="font-medium">
                      {t(rule.name)} <span className="font-normal text-muted-foreground">v{rule.version}</span>
                    </p>
                    {rule.source && (
                      <a href={rule.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-xs text-primary underline-offset-4 hover:underline">
                        <span>
                          {rule.source.authority}
                          {rule.sourceLocator ? `, ${rule.sourceLocator}` : ""}
                        </span>
                        <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
                      </a>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <VerificationBadge status={rule.verification} />
                      {rule.lastVerifiedAt && <span>{t("Last verified {date}", { date: formatDate(rule.lastVerifiedAt) })}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Saved calculations")}</CardTitle>
              <CardDescription>{t("Each is kept exactly as calculated, with the rules it used, even if rules change later.")}</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No calculation saved yet. Choose “Calculate tax” to save one.")}</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((calc) => (
                    <li key={calc.id} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="tabular font-medium">{formatLKR(calc.totalTax)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(calc.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" })}
                          {calc.isLatest && ` ${t("· latest")}`}
                        </p>
                      </div>
                      <p className="tabular text-right text-xs text-muted-foreground">
                        {t("Balance")}
                        <span className="block text-sm font-medium text-foreground">{formatLKR(calc.balancePayable)}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Disclaimer />
    </>
  );
}
