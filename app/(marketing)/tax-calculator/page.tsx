import type { Metadata } from "next";
import { Estimator } from "@/components/tax/estimator";
import { BandTable } from "@/components/tax/rate-tables";
import { formatLKR } from "@/lib/format";
import { getT, publicAlternates } from "@/lib/i18n/server";
import { getCurrentTaxYear, listTaxYears } from "@/services/tax/rule-repository";
import { getPublicRates } from "@/services/tax/public-rules";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Sri Lanka income tax calculator"),
    description: t("Estimate your Sri Lankan personal income tax for the current year of assessment. See the personal relief, each tax band and your effective rate. No account needed."),
    alternates: await publicAlternates("/tax-calculator"),
  };
}

export default async function TaxCalculatorPage() {
  const [years, current, t] = await Promise.all([listTaxYears(), getCurrentTaxYear(), getT()]);
  const rates = await getPublicRates(current.code);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("Sri Lanka income tax calculator")}</h1>
        <p className="text-muted-foreground">
          {rates.personalRelief
            ? t("Estimate your personal income tax for the year of assessment {year} — the first {amount} is covered by the personal relief. No account is needed and nothing you enter is stored.", {
                year: current.code,
                amount: formatLKR(rates.personalRelief.amount),
              })
            : t("Estimate your personal income tax for the year of assessment {year}. No account is needed and nothing you enter is stored.", { year: current.code })}
        </p>
      </header>
      <Estimator years={years.map((y) => y.code)} defaultYear={current.code} />
      <section className="max-w-3xl space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{t("Rates used for {year}", { year: current.code })}</h2>
        <BandTable rates={rates} />
      </section>
    </div>
  );
}
