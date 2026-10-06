import type { Metadata } from "next";
import Link from "next/link";
import { BandTable, SourceNote, WithholdingTable } from "@/components/tax/rate-tables";
import { Button } from "@/components/ui/button";
import { formatDate, formatLKR, formatPercent } from "@/lib/format";
import { localizePath } from "@/lib/i18n/config";
import { rich } from "@/lib/i18n/rich";
import { getLocale, getT, publicAlternates } from "@/lib/i18n/server";
import { listTaxYears } from "@/services/tax/rule-repository";
import { getPublicRates } from "@/services/tax/public-rules";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Sri Lanka personal income tax rates"),
    description: t("Personal relief, income tax bands, capital gains rate and withholding rates for individuals in Sri Lanka, by year of assessment, each with its official source."),
    alternates: await publicAlternates("/sri-lanka-income-tax"),
  };
}

export default async function IncomeTaxRatesPage() {
  const [years, t, locale] = await Promise.all([listTaxYears(), getT(), getLocale()]);
  const all = await Promise.all(years.map((y) => getPublicRates(y.code)));
  return (
    <div className="mx-auto w-full max-w-4xl space-y-12 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("Sri Lanka personal income tax rates")}</h1>
        <p className="text-muted-foreground">
          {t("The rates this site uses for individuals, by year of assessment (1 April to 31 March). Each figure links to the Inland Revenue Department document it was taken from and shows when it was last checked.")}
        </p>
        <Button asChild>
          <Link href={localizePath(locale, "/tax-calculator")}>{t("Calculate your tax")}</Link>
        </Button>
      </header>

      {all.map((rates) => (
        <section key={rates.taxYear.code} className="space-y-5" aria-labelledby={`year-${rates.taxYear.code}`}>
          <h2 id={`year-${rates.taxYear.code}`} className="border-b pb-2 text-2xl font-semibold tracking-tight">
            {t("Year of assessment {year}", { year: rates.taxYear.code })}
          </h2>
          {rates.personalRelief && (
            <div className="space-y-2">
              <h3 className="font-medium">{t("Personal relief")}</h3>
              <p className="text-sm text-muted-foreground">
                {rich(
                  t("<b>{amount}</b> is deducted from the assessable income of a resident individual, or a non-resident citizen, before tax is calculated. It cannot be set against gains on investment assets.", {
                    amount: formatLKR(rates.personalRelief.amount),
                  }),
                  { b: (text) => <span className="tabular font-medium text-foreground">{text}</span> },
                )}
              </p>
              <SourceNote {...rates.personalRelief} />
              {rates.personalRelief.notes && <p className="text-xs text-muted-foreground">{t(rates.personalRelief.notes)}</p>}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="font-medium">{t("Tax bands")}</h3>
            <BandTable rates={rates} />
          </div>
          {rates.capitalGains.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">{t("Gains on investment assets")}</h3>
              <ul className="space-y-2 text-sm">
                {rates.capitalGains.map((g) => (
                  <li key={g.from} className="space-y-1">
                    <p>
                      <span className="tabular font-medium">{formatPercent(g.rate, 0)}</span>{" "}
                      <span className="text-muted-foreground">
                        {g.to
                          ? t("on assets realised from {from} to {to}", { from: formatDate(g.from), to: formatDate(g.to) })
                          : t("on assets realised from {from}", { from: formatDate(g.from) })}
                      </span>
                    </p>
                    <SourceNote {...g} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rates.foreign && (
            <div className="space-y-2">
              <h3 className="font-medium">{t("Service exports and foreign-currency income remitted through a bank")}</h3>
              <p className="text-sm text-muted-foreground">
                {rates.foreign.treatment === "EXEMPT"
                  ? t("Exempt for this year of assessment.")
                  : t("Taxed at the normal rates, with a maximum rate of {rate}.", { rate: formatPercent(rates.foreign.maxRate, 0) })}
              </p>
              <SourceNote {...rates.foreign} />
              {rates.foreign.notes && <p className="text-xs text-muted-foreground">{t(rates.foreign.notes)}</p>}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="font-medium">{t("Withholding (AIT / WHT)")}</h3>
            <WithholdingTable rates={rates} />
          </div>
        </section>
      ))}
    </div>
  );
}
