import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { VerificationBadge } from "@/components/shared/why";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { daysBetween, formatDate, toISODate, todayInSriLanka } from "@/lib/format";
import { getT, publicAlternates } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Sri Lanka income tax deadlines for individuals"),
    description: t("Instalment, final payment and return filing dates for individual income tax in Sri Lanka, by year of assessment, from the Inland Revenue Department's calendar."),
    alternates: await publicAlternates("/tax-deadlines"),
  };
}

export default async function TaxDeadlinesPage() {
  const today = todayInSriLanka();
  const t = await getT();
  const years = await db.taxYear.findMany({
    orderBy: { startsOn: "desc" },
    include: { deadlines: { where: { appliesTo: "INDIVIDUAL" }, orderBy: { dueOn: "asc" }, include: { source: true } } },
  });
  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("Income tax deadlines for individuals")}</h1>
        <p className="text-muted-foreground">{t("Dates for quarterly instalments, the final payment and the return of income. Create an account to be reminded before each one.")}</p>
        <Button asChild>
          <Link href="/register">{t("Get deadline reminders")}</Link>
        </Button>
      </header>
      {years.map((year) => (
        <section key={year.id} aria-labelledby={`deadlines-${year.code}`} className="space-y-3">
          <h2 id={`deadlines-${year.code}`} className="text-xl font-semibold tracking-tight">
            {t("Year of assessment {year}", { year: year.code })}
          </h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("Due")}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("What")}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {year.deadlines.map((d) => {
                  const due = toISODate(d.dueOn);
                  return (
                    <tr key={d.id} className="border-t align-top">
                      <td className="tabular px-4 py-2.5 whitespace-nowrap">{formatDate(d.dueOn)}</td>
                      <th scope="row" className="px-4 py-2.5 text-left font-normal">
                        <span className="font-medium">{t(d.title)}</span>
                        {d.description && <span className="block text-xs text-muted-foreground">{t(d.description)}</span>}
                        {d.source && (
                          <a href={d.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline">
                            {d.source.authority} <ExternalLink className="size-3" aria-hidden />
                          </a>
                        )}
                      </th>
                      <td className="space-y-1 px-4 py-2.5">
                        <span className="block">{due < today ? t("Passed") : t("In {days} days", { days: daysBetween(today, due) })}</span>
                        {d.verification !== "VERIFIED" && <VerificationBadge status={d.verification} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="text-sm text-muted-foreground">
        {t("Dates marked “requires verification” follow the pattern set by law but have not yet appeared in a published IRD tax calendar. When a due date falls on a holiday, check IRD's notices.")}
      </p>
    </div>
  );
}
