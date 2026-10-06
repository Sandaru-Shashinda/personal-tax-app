import type { Metadata } from "next";
import { CircleAlert, CircleCheck, ExternalLink, FileDown, OctagonAlert } from "lucide-react";
import Link from "next/link";
import { Disclaimer } from "@/components/shared/disclaimer";
import { PageHeader } from "@/components/shared/page";
import { RecordFiledForm, ReviewToggle } from "@/components/tax/return-controls";
import { TaxStatement } from "@/components/tax/statement";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatLKR } from "@/lib/format";
import { returnIssues } from "@/lib/tax/health";
import { resolveTaxYear } from "@/lib/tax-year";
import { getAccount } from "@/services/account/account-service";
import { getYearFacts } from "@/services/insights/year-facts";
import { listExpenses } from "@/services/records/expense-service";
import { getReturnWorkspace } from "@/services/tax/return-service";
import { getTaxSummary } from "@/services/tax/tax-service";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Prepare your return") };
}

const RESIDENCY_LABEL = { RESIDENT: msg("Resident in Sri Lanka"), NON_RESIDENT_CITIZEN: msg("Non-resident, citizen of Sri Lanka"), NON_RESIDENT: msg("Non-resident, not a citizen") } as const;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular text-right font-medium">{value}</dd>
    </div>
  );
}

export default async function ReturnPage() {
  const t = await getT();
  const user = await requireUser();
  const taxYear = await resolveTaxYear();
  const summary = await getTaxSummary(user.id, taxYear.code, t);
  const { result } = summary;
  const [workspace, account, facts, expenses] = await Promise.all([
    getReturnWorkspace(user.id, taxYear.code),
    getAccount(user.id),
    getYearFacts(user.id, summary, user.emailVerified),
    listExpenses(user.id, taxYear.code, { page: 1, pageSize: 1 }),
  ]);
  const issues = returnIssues(facts, t);
  const blockers = issues.filter((i) => i.severity === "blocker");
  const reviewedCount = workspace.sections.filter((s) => s.reviewedAt).length;
  const section = (key: string) => workspace.sections.find((s) => s.key === key)!;
  const year = encodeURIComponent(taxYear.code);
  const status = (key: "DEDUCTIBLE" | "PARTIALLY_DEDUCTIBLE" | "NON_DEDUCTIBLE" | "REQUIRES_REVIEW") => expenses.byStatus.find((s) => s.deductibility === key);

  const body: Record<string, React.ReactNode> = {
    TAXPAYER_DETAILS: (
      <dl>
        <Line label={t("Name")} value={account.profile.fullName} />
        <Line label={t("TIN")} value={account.taxpayer.tin || t("Not entered")} />
        <Line label={t("Residency")} value={t(RESIDENCY_LABEL[result.residency])} />
        <Line label={t("Address")} value={[account.profile.addressLine1, account.profile.city, account.profile.district].filter(Boolean).join(", ") || t("Not entered")} />
        <p className="pt-2 text-sm">
          <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
            {t("Edit in Settings")}
          </Link>
        </p>
      </dl>
    ),
    INCOME: (
      <dl>
        <Line label={t("Employment income")} value={formatLKR(result.incomeByCategory.employment)} />
        <Line label={t("Business income")} value={formatLKR(result.incomeByCategory.business)} />
        <Line label={t("Investment income")} value={formatLKR(result.incomeByCategory.investment)} />
        <Line label={t("Other income")} value={formatLKR(result.incomeByCategory.other)} />
        <Line label={t("Assessable income")} value={formatLKR(result.assessableIncome)} />
        {result.excludedLines.length > 0 && <Line label={t("Excluded or exempt receipts")} value={formatLKR(result.excludedLines.reduce((t, l) => t + l.amount, 0))} />}
        <p className="pt-2 text-sm">
          <Link href="/income" className="text-primary underline-offset-4 hover:underline">
            {t("Open income records")}
          </Link>
        </p>
      </dl>
    ),
    DEDUCTIONS: (
      <dl>
        <Line label={t("Expenses treated as deductible")} value={formatLKR((status("DEDUCTIBLE")?.deductible ?? 0) + (status("PARTIALLY_DEDUCTIBLE")?.deductible ?? 0))} />
        <Line label={t("Expenses not deducted")} value={formatLKR(status("NON_DEDUCTIBLE")?.amount ?? 0)} />
        <Line label={t("Expenses waiting for review")} value={`${status("REQUIRES_REVIEW")?.count ?? 0} (${formatLKR(status("REQUIRES_REVIEW")?.amount ?? 0)})`} />
        <p className="pt-2 text-sm">
          <Link href="/expenses" className="text-primary underline-offset-4 hover:underline">
            {t("Open expenses")}
          </Link>
        </p>
      </dl>
    ),
    RELIEFS: (
      <dl>
        {[...result.reliefLines, ...result.qualifyingPaymentLines].map((line) => (
          <Line key={line.code} label={t(line.label)} value={formatLKR(line.amount)} />
        ))}
        <Line label={t("Deductions used")} value={formatLKR(result.totalDeductions)} />
        <Line label={t("Taxable income")} value={formatLKR(result.taxableIncome)} />
      </dl>
    ),
    CALCULATION: <TaxStatement result={result} compact />,
    PAYMENTS: (
      <dl>
        {result.creditLines.map((line) => (
          <Line key={line.code} label={t(line.label)} value={formatLKR(line.amount)} />
        ))}
        <Line label={t("Total credits")} value={formatLKR(result.totalCredits)} />
        <Line label={result.balancePayable >= 0 ? t("Remaining liability") : t("Overpaid")} value={formatLKR(Math.abs(result.balancePayable))} />
      </dl>
    ),
    VALIDATION:
      issues.length === 0 ? (
        <p className="flex items-center gap-2 text-sm">
          <CircleCheck className="size-4 text-success" aria-hidden /> {t("No missing information found.")}
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              {issue.severity === "blocker" ? <OctagonAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />}
              <span>
                <span className="sr-only">{issue.severity === "blocker" ? `${t("Must fix:")} ` : `${t("Check:")} `}</span>
                <Link href={issue.href} className="underline-offset-4 hover:underline">
                  {t(issue.message)}
                </Link>
              </span>
            </li>
          ))}
        </ul>
      ),
    SUMMARY: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("Download your figures, then enter them in your return on IRD e-Services. The summary follows the order of the return: income, reliefs, tax, credits.")}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/api/export/tax-summary-pdf?year=${year}`}>
              <FileDown aria-hidden /> {t("Tax summary (PDF)")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/export/tax-summary?year=${year}`}>
              <FileDown aria-hidden /> {t("Tax summary (CSV)")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="https://www.ird.gov.lk" target="_blank" rel="noopener noreferrer">
              {t("IRD website")} <ExternalLink aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    ),
  };

  return (
    <>
      <PageHeader title={t("Prepare your {year} return", { year: taxYear.code })} description={t("Work through your figures step by step, fix anything missing, then export a summary to use when you file with the Inland Revenue Department yourself.")}>
        {workspace.filed ? <Badge variant="secondary">{t("Filed by you on {date}", { date: formatDate(workspace.filed.filedOn) })}</Badge> : <RecordFiledForm taxYear={taxYear.code} />}
      </PageHeader>

      <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
        <strong className="font-medium">{t("Ayakara does not submit returns.")}</strong> {t("There is no connection to IRD. Filing and payment are done by you on IRD e-Services.")}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <p className="font-medium">
            {t("{done} of {total} steps reviewed", { done: reviewedCount, total: workspace.sections.length })}
          </p>
          {blockers.length > 0 && <p className="text-destructive">{blockers.length > 1 ? t("{count} items must be fixed", { count: blockers.length }) : t("1 item must be fixed")}</p>}
        </div>
        <Progress value={(reviewedCount / workspace.sections.length) * 100} aria-label={t("Return preparation progress")} />
      </div>

      <ol className="space-y-4">
        {workspace.sections.map((s, index) => (
          <li key={s.key}>
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className={`tabular flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s.reviewedAt ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {s.reviewedAt ? <CircleCheck className="size-4" aria-hidden /> : index + 1}
                  </span>
                  {t(s.title)}
                  {s.reviewedAt && <span className="sr-only">{t("(reviewed)")}</span>}
                </CardTitle>
                <ReviewToggle taxYear={taxYear.code} sectionKey={s.key} reviewed={Boolean(section(s.key).reviewedAt)} label={s.key === "SUMMARY" ? t("Generate summary") : t("Mark as reviewed")} />
              </CardHeader>
              <CardContent>{body[s.key]}</CardContent>
            </Card>
          </li>
        ))}
      </ol>
      <Disclaimer />
    </>
  );
}
