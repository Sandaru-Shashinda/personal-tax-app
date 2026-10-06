import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/shared/disclaimer";
import { localizePath } from "@/lib/i18n/config";
import { rich } from "@/lib/i18n/rich";
import { getLocale, getT, publicAlternates } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("About"),
    description: t("What Ayakara is, what it does and does not do, and how it keeps tax rules accurate and your records private."),
    alternates: await publicAlternates("/about"),
  };
}

export default async function AboutPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <article className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("About Ayakara")}</h1>
        <p className="text-muted-foreground">{t("A personal income tax workspace made for individuals in Sri Lanka.")}</p>
      </header>

      <section className="space-y-3 leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("What it does")}</h2>
        <p>
          {t("You record what you earn, what you spend and the tax already taken or paid. Ayakara estimates your income tax for the year of assessment, shows what is still due and when, keeps your certificates and receipts together, and prepares a summary to use when you file.")}
        </p>
        <h2 className="pt-2 text-xl font-semibold tracking-tight text-foreground">{t("What it does not do")}</h2>
        <p>
          {rich(
            t("It <b>does not file returns or make payments</b>, and it has no connection to the Inland Revenue Department. You file and pay yourself on IRD e-Services. It is not a tax adviser: where the law needs judgement, it says so and leaves the decision to you."),
            { b: (text) => <strong>{text}</strong> },
          )}
        </p>
        <h2 className="pt-2 text-xl font-semibold tracking-tight text-foreground">{t("How the rules are kept")}</h2>
        <p>
          {t("Every rate, threshold and relief is stored as a versioned rule for a specific year of assessment, with the official document it came from and the date it was last checked. When the law changes, a new version is added; earlier years and earlier calculations keep the rules they were made with. Rules that could not be confirmed against an official source are labelled “requires verification” wherever they are used.")}
        </p>
        <p>
          {rich(t("The current figures and their sources are on the <a>rates page</a>."), {
            a: (text) => (
              <Link href={localizePath(locale, "/sri-lanka-income-tax")} className="text-primary underline-offset-4 hover:underline">
                {text}
              </Link>
            ),
          })}
        </p>
        <h2 className="pt-2 text-xl font-semibold tracking-tight text-foreground">{t("Your data")}</h2>
        <p>
          {t("Your records are visible only to your account. Documents are stored privately and are never served from a public address. You can export everything you have entered, delete any document, and delete your account, which removes your data and files permanently.")}
        </p>
      </section>
      <Disclaimer />
    </article>
  );
}
