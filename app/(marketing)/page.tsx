import type { Metadata } from "next";
import { ArrowRight, BookOpenCheck, CalendarClock, FileSearch, FolderLock, History, Scale } from "lucide-react";
import Link from "next/link";
import { BandTable } from "@/components/tax/rate-tables";
import { Button } from "@/components/ui/button";
import { formatLKR, formatPercent } from "@/lib/format";
import { localizePath } from "@/lib/i18n/config";
import { getLocale, getT, publicAlternates } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/translate";
import { getPublicRates } from "@/services/tax/public-rules";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { absolute: t("Ayakara — Personal income tax for Sri Lanka") }, alternates: await publicAlternates("/") };
}

const FEATURES = [
  { icon: Scale, title: msg("An estimate you can check"), text: msg("Every line of the calculation shows the rule behind it, the tax year it belongs to and a link to the official source.") },
  { icon: History, title: msg("Each year on its own rules"), text: msg("Rates and reliefs are stored per year of assessment. Last year's figures stay calculated on last year's law.") },
  { icon: FileSearch, title: msg("Deductible or not, and why"), text: msg("Expenses are marked deductible, partly deductible, not deductible or needing review, each with a plain-language reason.") },
  { icon: CalendarClock, title: msg("Deadlines before they arrive"), text: msg("Instalment, final payment and filing dates from the IRD calendar, with reminders 30, 14, 7 and 1 day ahead.") },
  { icon: FolderLock, title: msg("Certificates in one place"), text: msg("Keep T.10 and AIT certificates, payslips and receipts privately with the year they belong to.") },
  { icon: BookOpenCheck, title: msg("Ready at filing time"), text: msg("A step-by-step review flags what is missing, then exports a summary to use when you file on IRD e-Services.") },
];

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [rates, params, t, locale] = await Promise.all([getPublicRates(), searchParams, getT(), getLocale()]);
  const top = rates.bands?.rows.at(-1);
  const year = rates.taxYear.code;
  return (
    <>
      {params.deleted && (
        <p role="status" className="border-b bg-secondary px-4 py-3 text-center text-sm text-secondary-foreground">
          {t("Your account and all of its data have been deleted.")}
        </p>
      )}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-20">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">{t("Updated for the year of assessment {year}", { year })}</p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">{t("Your Sri Lankan income tax, worked out and explained.")}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            {t("Record your salary, freelance income, interest and rent. See your estimated tax, what has already been withheld, what is left to pay and when — with the reason for every figure.")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                {t("Create a free account")} <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={localizePath(locale, "/tax-calculator")}>{t("Try the calculator")}</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("Ayakara organises and estimates. It does not file returns or make payments; you do that on IRD e-Services.")}</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">{t("Individual income tax, {year}", { year })}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            {rates.personalRelief && (
              <div>
                <dt className="text-xs text-muted-foreground">{t("Personal relief")}</dt>
                <dd className="tabular text-2xl font-semibold tracking-tight">{formatLKR(rates.personalRelief.amount)}</dd>
              </div>
            )}
            {top && (
              <div>
                <dt className="text-xs text-muted-foreground">{t("Top rate")}</dt>
                <dd className="tabular text-2xl font-semibold tracking-tight">{formatPercent(top.rate, 0)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-5">
            <BandTable rates={rates} />
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-16 sm:px-6">
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">{t("Built for how personal tax actually works here")}</h2>
          <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="space-y-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-4" aria-hidden />
                </div>
                <h3 className="font-medium">{t(title)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(text)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">{t("See where you stand for {year}", { year })}</h2>
            <p className="text-primary-foreground/80">{t("It takes about two minutes to set up, and your records stay private to your account.")}</p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="/register">
              {t("Get started")} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
