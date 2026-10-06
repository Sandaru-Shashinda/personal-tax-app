import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, BadgeCheck, CalendarClock, CircleAlert, Landmark, Lightbulb, PiggyBank, Plus, Scale, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { MonthlyChart } from "@/components/charts/lazy";
import { ShareBar } from "@/components/charts/share-bar";
import { Disclaimer } from "@/components/shared/disclaimer";
import { EmptyState, PageHeader, StatCard } from "@/components/shared/page";
import { HealthCard } from "@/components/tax/health-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { daysBetween, formatDate, formatLKR, formatPercent, formatShortDate, toISODate, todayInSriLanka } from "@/lib/format";
import { healthChecks, healthScore, insights } from "@/lib/tax/health";
import { resolveTaxYear } from "@/lib/tax-year";
import { getMonthlySeries, getYearFacts } from "@/services/insights/year-facts";
import { getInstalmentSchedule } from "@/services/records/payment-service";
import { getPriorYearTax, getTaxSummary } from "@/services/tax/tax-service";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Dashboard") };
}

const FILING_LABEL = { NOT_STARTED: msg("Not started"), IN_PROGRESS: msg("In preparation"), READY_TO_FILE: msg("Ready to file"), FILED_BY_USER: msg("Filed (recorded by you)") } as const;

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const t = await getT();
  const user = await requireUser();
  const { welcome } = await searchParams;
  const taxYear = await resolveTaxYear();
  const summary = await getTaxSummary(user.id, taxYear.code, t);
  const { result } = summary;
  const today = todayInSriLanka();

  const [facts, months, schedule, prior, deadlines, yearProfile] = await Promise.all([
    getYearFacts(user.id, summary, user.emailVerified),
    getMonthlySeries(user.id, taxYear.id, taxYear.startsOn),
    getInstalmentSchedule(user.id, taxYear.code),
    getPriorYearTax(user.id, taxYear),
    db.taxDeadline.findMany({
      where: { appliesTo: "INDIVIDUAL", dueOn: { gte: new Date(`${today}T00:00:00Z`) } },
      orderBy: { dueOn: "asc" },
      take: 4,
      include: { taxYear: { select: { code: true } } },
    }),
    db.taxpayerYear.findUnique({ where: { userId_taxYearId: { userId: user.id, taxYearId: taxYear.id } } }),
  ]);

  const checks = healthChecks(facts, t);
  const notes = insights(facts, t);
  const withheld = result.creditLines.filter((l) => l.code === "APIT" || l.code === "AIT").reduce((t, l) => t + l.amount, 0);
  const paidPercent = result.totalTax > 0 ? Math.min(result.totalCredits / result.totalTax, 1) : 0;
  const change = prior && prior.totalTax > 0 ? (result.totalTax - prior.totalTax) / prior.totalTax : null;
  const next = deadlines[0];
  const nextInstalment = schedule.rows.find((row) => row.dueOn >= today && row.amountDue - row.amountPaid > 1);
  const hasRecords = result.assessableIncome > 0 || result.excludedLines.length > 0;
  const overdueTotal = facts.overdueInstalments.reduce((t, o) => t + o.shortfall, 0);
  const alerts = [
    ...(facts.overdueInstalments.length === 1
      ? [{ id: "overdue", text: t("{title} was due on {date} and looks {amount} short.", { title: t(facts.overdueInstalments[0].title), date: formatDate(facts.overdueInstalments[0].dueOn), amount: formatLKR(facts.overdueInstalments[0].shortfall) }), href: "/payments" }]
      : facts.overdueInstalments.length > 1
        ? [{ id: "overdue", text: t("{count} instalments are past their due dates and look {amount} short in total.", { count: facts.overdueInstalments.length, amount: formatLKR(overdueTotal) }), href: "/payments" }]
        : []),
    ...result.warnings.filter((w) => w.severity === "warning").map((w) => ({ id: w.code, text: w.message, href: "/tax" })),
  ];

  return (
    <>
      <PageHeader title={t("Hello, {name}", { name: user.fullName.split(" ")[0] })} description={t("Here is how you are doing with your taxes for {year}.", { year: taxYear.code })}>
        <Badge variant="outline" className="h-7">
          <BadgeCheck aria-hidden /> {t("Filing: {status}", { status: t(FILING_LABEL[yearProfile?.filingStatus ?? "NOT_STARTED"]) })}
        </Badge>
        <Button asChild>
          <Link href="/income?new=1">
            <Plus aria-hidden /> {t("Add income")}
          </Link>
        </Button>
      </PageHeader>

      {welcome && (
        <p role="status" className="rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
          {t("Your workspace is ready. Start by adding the income you have received this year.")}
        </p>
      )}

      {!hasRecords ? (
        <EmptyState icon={Wallet} title={t("Nothing recorded for {year} yet", { year: taxYear.code })} description={t("Add your salary or other income and your estimated tax, withholding and remaining liability will appear here.")}>
          <Button asChild>
            <Link href="/income?new=1">
              <Plus aria-hidden /> {t("Add your first income")}
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <section aria-label={t("Tax position")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label={t("Estimated tax")}
              value={formatLKR(result.totalTax)}
              icon={Scale}
              tone="primary"
              hint={
                change === null ? (
                  t("Tax year {year}", { year: taxYear.code })
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {change >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
                    {change >= 0 ? t("{percent} higher than {year}", { percent: formatPercent(Math.abs(change)), year: prior?.code ?? "" }) : t("{percent} lower than {year}", { percent: formatPercent(Math.abs(change)), year: prior?.code ?? "" })}
                  </span>
                )
              }
            />
            <StatCard label={t("Tax already paid")} value={formatLKR(result.totalCredits)} icon={PiggyBank} hint={t("{percent} of estimated liability · {amount} withheld (APIT / AIT)", { percent: formatPercent(paidPercent, 0), amount: formatLKR(withheld) })}>
              <Progress value={paidPercent * 100} aria-label={t("Share of estimated tax already paid")} />
            </StatCard>
            <StatCard
              label={result.balancePayable >= 0 ? t("Remaining") : t("Overpaid")}
              value={formatLKR(Math.abs(result.balancePayable))}
              icon={Landmark}
              hint={
                result.balancePayable < 0
                  ? t("A refund can only be claimed from IRD through your return.")
                  : nextInstalment
                    ? t("Next payment: {date}", { date: formatShortDate(nextInstalment.dueOn) })
                    : facts.overdueInstalments.length > 0
                      ? t("Instalment dates for this year have passed")
                      : t("No further instalments scheduled")
              }
            />
            <StatCard label={t("Estimated annual income")} value={formatLKR(result.assessableIncome)} icon={Wallet} hint={t("Assessable income recorded so far")} />
            <StatCard label={t("Estimated taxable income")} value={formatLKR(result.taxableIncome)} icon={TrendingUp} hint={t("After {amount} of reliefs", { amount: formatLKR(result.totalDeductions) })} />
            <StatCard
              label={t("Effective tax rate")}
              value={formatPercent(result.effectiveRate)}
              icon={CalendarClock}
              hint={next ? t("Next deadline: {title} ({year}), {date}", { title: t(next.title), year: next.taxYear.code, date: formatShortDate(next.dueOn) }) : t("Marginal rate {rate}", { rate: formatPercent(result.marginalRate, 0) })}
            />
          </section>

          {alerts.length > 0 && (
            <section aria-label={t("Tax alerts")} className="space-y-2">
              {alerts.slice(0, 4).map((alert) => (
                <Link key={alert.id} href={alert.href} className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <span>
                    <span className="sr-only">{t("Alert:")} </span>
                    {alert.text}
                  </span>
                </Link>
              ))}
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-xs lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("Income and expenses by month")}</CardTitle>
                <CardDescription>{t("Amounts received and spent in each month of {year}.", { year: taxYear.code })}</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyChart data={months.map(({ label, income, expenses }) => ({ label, income, expenses }))} />
              </CardContent>
            </Card>
            <HealthCard score={healthScore(checks)} checks={checks} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>{t("Income breakdown")}</CardTitle>
                <CardDescription>{t("Assessable income by category.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ShareBar
                  title={t("Assessable income by category")}
                  items={[
                    { label: t("Employment"), value: result.incomeByCategory.employment },
                    { label: t("Business"), value: result.incomeByCategory.business },
                    { label: t("Investment"), value: result.incomeByCategory.investment },
                    { label: t("Other"), value: result.incomeByCategory.other },
                  ]}
                />
              </CardContent>
            </Card>
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>{t("Tax breakdown")}</CardTitle>
                <CardDescription>
                  {t("How {amount} is made up.", { amount: formatLKR(result.totalTax) })}{" "}
                  <Link href="/tax" className="text-primary underline-offset-4 hover:underline">
                    {t("See the full calculation")}
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.taxLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("Your taxable income is within the personal relief, so no tax is estimated.")}</p>
                ) : (
                  <ul className="space-y-3">
                    {result.taxLines.map((line, index) => (
                      <li key={`${line.code}-${index}`} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">{line.label}</span>
                          <span className="tabular font-medium">{formatLKR(line.amount)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div className="h-full rounded-full bg-chart-1" style={{ width: `${result.totalTax > 0 ? (line.amount / result.totalTax) * 100 : 0}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-xs lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("Tax payment timeline")}</CardTitle>
                <CardDescription>{schedule.basisNote}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {schedule.rows.map((row) => {
                    const done = row.amountDue <= 1 || row.amountPaid >= row.amountDue - 1;
                    const overdue = !done && row.dueOn < today;
                    return (
                      <li key={row.instalmentNo} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5">
                        <span className="tabular flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{row.instalmentNo}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{row.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("Due {date}", { date: formatDate(row.dueOn) })} · {done ? t("Paid") : overdue ? t("Overdue") : t("{days} days left", { days: daysBetween(today, row.dueOn) })}
                          </p>
                        </div>
                        <p className="tabular text-right text-sm">
                          <span className="font-medium">{formatLKR(row.amountPaid)}</span>
                          <span className="text-muted-foreground"> / {formatLKR(row.amountDue)}</span>
                        </p>
                        <Progress className="col-span-3" value={row.amountDue > 0 ? Math.min((row.amountPaid / row.amountDue) * 100, 100) : 100} aria-label={t("{title}: {paid} paid of {due}", { title: row.title, paid: formatLKR(row.amountPaid), due: formatLKR(row.amountDue) })} />
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>{t("Upcoming deadlines")}</CardTitle>
                <CardDescription>
                  <Link href="/calendar" className="text-primary underline-offset-4 hover:underline">
                    {t("Open the tax calendar")}
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {deadlines.map((d) => (
                    <li key={d.id} className="flex items-center gap-3">
                      <div className="tabular flex w-11 shrink-0 flex-col items-center rounded-lg border py-1 text-center leading-tight">
                        <span className="text-[0.65rem] uppercase text-muted-foreground">{d.dueOn.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}</span>
                        <span className="text-base font-semibold">{d.dueOn.getUTCDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t(d.title)}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.taxYear.code} · {t("in {days} days", { days: daysBetween(today, toISODate(d.dueOn)) })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-muted-foreground" aria-hidden /> {t("Insights")}
              </CardTitle>
              <CardDescription>{t("Facts drawn from your own records. Nothing here is advice.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-x-8 gap-y-2.5 text-sm md:grid-cols-2">
                {notes.map((note) => (
                  <li key={note.id} className="flex gap-2.5">
                    <span className={`mt-2 size-1.5 shrink-0 rounded-full ${note.tone === "attention" ? "bg-warning" : "bg-primary"}`} aria-hidden />
                    {note.text}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
      <Disclaimer />
    </>
  );
}
