import type { Metadata } from "next";
import Link from "next/link";
import { formatLKR, formatPercent } from "@/lib/format";
import { localizePath } from "@/lib/i18n/config";
import { rich, type RichTags } from "@/lib/i18n/rich";
import { getLocale, getT, publicAlternates } from "@/lib/i18n/server";
import { getPublicRates } from "@/services/tax/public-rules";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("A plain guide to personal income tax in Sri Lanka"),
    description: t("How personal income tax works in Sri Lanka: the year of assessment, what counts as income, reliefs, APIT and AIT, instalments, and filing your return."),
    alternates: await publicAlternates("/sri-lanka-tax-guide"),
  };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">{children}</div>
    </section>
  );
}

export default async function TaxGuidePage() {
  const [rates, t, locale] = await Promise.all([getPublicRates(), getT(), getLocale()]);
  const year = rates.taxYear.code;
  const interest = rates.withholding.find((w) => w.name.toLowerCase().includes("interest"));
  const dividend = rates.withholding.find((w) => w.name.toLowerCase().includes("dividend"));
  const link = (href: string, text: string) => (
    <Link href={localizePath(locale, href)} className="text-primary underline-offset-4 hover:underline">
      {text}
    </Link>
  );
  const b: RichTags = { b: (text) => <strong>{text}</strong> };
  return (
    <article className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("A plain guide to personal income tax in Sri Lanka")}</h1>
        <p className="text-muted-foreground">
          {t("An overview for individuals, using the figures on record for the year of assessment {year}. It is a starting point, not advice: check anything important with the Inland Revenue Department (IRD) or a tax professional.", { year })}
        </p>
      </header>

      <Section id="year" title={t("The year of assessment")}>
        <p>
          {rich(
            t("Income tax is worked out for a <b>year of assessment that runs from 1 April to 31 March</b>. The year {year} covers what you receive between those dates. Each year has its own rates and reliefs, so a figure that was right last year may not be right this year.", { year }),
            b,
          )}
        </p>
      </Section>

      <Section id="income" title={t("What is taxed")}>
        <p>
          {rich(
            t("A resident is taxed on income from anywhere in the world; a non-resident only on income from Sri Lanka. Income falls into four groups: <b>employment</b> (salary, allowances, bonuses and taxable benefits), <b>business</b> (including freelance and professional work, after allowable expenses), <b>investment</b> (interest, rent, dividends and gains on assets) and <b>other</b> income."),
            b,
          )}
        </p>
        <p>{t("Adding the four gives your assessable income. Expenses cannot be deducted from employment income.")}</p>
      </Section>

      <Section id="reliefs" title={t("Reliefs")}>
        <p>
          {rates.personalRelief && <>{rich(t("Every resident individual deducts a <b>personal relief of {amount}</b>.", { amount: formatLKR(rates.personalRelief.amount) }), b)} </>}
          {rates.rentRelief !== null && <>{rich(t("If you let out a property, <b>{percent} of the rent</b> is deducted as rent relief.", { percent: formatPercent(rates.rentRelief, 0) }), b)} </>}
          {rates.solarCap !== null && <>{t("Spending on grid-connected solar panels can be claimed up to {amount} a year.", { amount: formatLKR(rates.solarCap) })} </>}
          {rates.charityCap !== null &&
            t("Donations to approved charities are deductible up to {amount} or one-third of taxable income, whichever is lower; donations to the Government are deductible in full.", { amount: formatLKR(rates.charityCap) })}
        </p>
        <p>{rich(t("What is left is your taxable income, which is taxed in bands at rising rates. The current bands are on the <a>rates page</a>."), { a: (text) => link("/sri-lanka-income-tax", text) })}</p>
      </Section>

      <Section id="withholding" title={t("Tax taken at source: APIT and AIT")}>
        <p>
          {rich(t("Employers deduct <b>Advance Personal Income Tax (APIT)</b> from salaries each month using IRD's tax tables and give you a T.10 certificate after the year ends."), b)}
          {interest && <> {rich(t("Banks deduct <b>Advance Income Tax (AIT) of {rate}</b> from interest.", { rate: formatPercent(interest.rate, 0) }), b)}</>}{" "}
          {t("Both are credits: they come off the tax you owe for the year, and you may get some back if too much was taken.")}
        </p>
        {dividend && (
          <p>
            {rich(
              t("Dividends from resident companies are different. The <b>{rate} withheld is a final tax</b>: the dividend is not added to your income and is not taxed again.", { rate: formatPercent(dividend.rate, 0) }),
              b,
            )}
          </p>
        )}
      </Section>

      <Section id="paying" title={t("Paying and filing")}>
        <p>
          {rich(
            t("If withholding does not cover your tax, you pay the rest in <b>four instalments</b> (15 August, 15 November, 15 February and 15 May), with any balance due by <b>30 September</b> after the year ends. The return of income is filed online through IRD e-Services by <b>30 November</b>. Exact dates for each year are on the <a>deadlines page</a>."),
            { ...b, a: (text) => link("/tax-deadlines", text) },
          )}
        </p>
        <p>{t("You need a Taxpayer Identification Number (TIN) to file. If your only income is a salary fully covered by APIT, IRD does not require a return unless it has opened a file for you.")}</p>
      </Section>

      <Section id="records" title={t("Records worth keeping")}>
        <p>{t("Your T.10 certificate, AIT certificates from each bank, invoices and receipts for business costs, rent agreements, and proof of every payment made to IRD. Keeping them together through the year makes filing a short job.")}</p>
      </Section>

      <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t("This guide describes the general position and leaves out many special cases. Figures are those recorded on this site for {year} and are shown with their sources on the rates page.", { year })}
      </p>
    </article>
  );
}
