import type { Metadata } from "next";
import { CreditCard, Download, Paperclip } from "lucide-react";
import { deletePaymentAction } from "@/app/actions/records";
import { PaymentForm } from "@/components/payments/payment-form";
import { EmptyState, PageHeader, Pagination, StatCard } from "@/components/shared/page";
import { DeleteButton } from "@/components/shared/record-dialog";
import { Why } from "@/components/shared/why";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatLKR, todayInSriLanka } from "@/lib/format";
import { findRule, toRuleUse } from "@/lib/tax/rule-set";
import { resolveTaxYear } from "@/lib/tax-year";
import { PAYMENT_TYPE_LABELS } from "@/lib/validation/records";
import { getInstalmentSchedule, listPayments } from "@/services/records/payment-service";
import { getTaxSummary } from "@/services/tax/tax-service";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Payments") };
}

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const t = await getT();
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1, 1);
  const taxYear = await resolveTaxYear();
  const [summary, list, schedule] = await Promise.all([
    getTaxSummary(user.id, taxYear.code, t),
    listPayments(user.id, taxYear.code, { page, pageSize: 15 }),
    getInstalmentSchedule(user.id, taxYear.code),
  ]);
  const { result, ruleSet } = summary;
  const today = todayInSriLanka();
  const credits = (codes: string[]) => result.creditLines.filter((l) => codes.includes(l.code)).reduce((t, l) => t + l.amount, 0);
  const basisRule = findRule(ruleSet, "INSTALMENT_BASIS", "individual");

  return (
    <>
      <PageHeader title={t("Payments")} description={t("Tax paid and withheld for {year}, reconciled against your estimated liability.", { year: taxYear.code })}>
        <Button asChild variant="outline">
          <a href={`/api/export/payments?year=${encodeURIComponent(taxYear.code)}`}>
            <Download aria-hidden /> {t("CSV")}
          </a>
        </Button>
        <PaymentForm taxYear={taxYear} />
      </PageHeader>

      <section aria-label={t("Reconciliation")} className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("Total liability")} value={formatLKR(result.totalTax)} hint={t("Estimated tax for the year")} />
        <StatCard label={t("Total paid")} value={formatLKR(result.totalCredits)} hint={t("Withheld {withheld} · paid by you {paid}", { withheld: formatLKR(credits(["APIT", "AIT", "CGT_PAID", "FOREIGN_TAX_CREDIT"])), paid: formatLKR(credits(["INSTALMENTS", "FINAL_PAYMENT", "OTHER_PAYMENTS"])) })} />
        <StatCard label={result.balancePayable >= 0 ? t("Outstanding") : t("Overpaid")} value={formatLKR(Math.abs(result.balancePayable))} tone="primary" hint={t("Total liability − total paid")} />
      </section>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {t("Instalment schedule")}
            <Why
              question={t("Why are my instalments this amount?")}
              explanation={schedule.basisNote}
              rule={basisRule ? toRuleUse(basisRule) : null}
              taxYear={taxYear.code}
            />
          </CardTitle>
          <CardDescription>{schedule.basisNote}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {schedule.rows.map((row) => {
              const done = row.amountDue <= 1 || row.amountPaid >= row.amountDue - 1;
              const overdue = !done && row.dueOn < today;
              return (
                <li key={row.instalmentNo} className="space-y-2 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{row.title}</p>
                    <Badge variant={done ? "secondary" : "outline"} className={overdue ? "border-destructive/40 text-destructive" : undefined}>
                      {done ? t("Paid") : overdue ? t("Overdue") : t("Upcoming")}
                    </Badge>
                  </div>
                  <p className="tabular text-xl font-semibold">{formatLKR(row.amountDue)}</p>
                  <Progress value={row.amountDue > 0 ? Math.min((row.amountPaid / row.amountDue) * 100, 100) : 100} aria-label={t("{paid} paid of {due}", { paid: formatLKR(row.amountPaid), due: formatLKR(row.amountDue) })} />
                  <p className="text-xs text-muted-foreground">
                    {t("Due {date}", { date: formatDate(row.dueOn) })} · {t("{amount} paid", { amount: formatLKR(row.amountPaid) })}
                  </p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {list.items.length === 0 ? (
        <EmptyState icon={CreditCard} title={t("No payments recorded for {year}", { year: taxYear.code })} description={t("Record instalments and other payments you make to IRD. APIT and AIT entered on your income records are already counted above.")} />
      ) : (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>{t("Payments you made")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y border-t">
              {list.items.map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {t(PAYMENT_TYPE_LABELS[payment.type])}
                      {payment.instalmentNo ? ` ${payment.instalmentNo}` : ""}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {formatDate(payment.paidOn)}
                      {payment.bank && ` · ${payment.bank}`}
                      {payment.reference && ` · ${t("Ref {reference}", { reference: payment.reference })}`}
                    </p>
                  </div>
                  {payment.documentCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Paperclip className="size-3.5" aria-hidden />
                      {payment.documentCount}
                      <span className="sr-only"> {t("supporting documents")}</span>
                    </span>
                  )}
                  <p className="tabular font-medium">{formatLKR(payment.amount)}</p>
                  <DeleteButton label={t("Delete payment")} description={t("{amount} paid on {date} will be removed from your records.", { amount: formatLKR(payment.amount), date: formatDate(payment.paidOn) })} action={deletePaymentAction.bind(null, payment.id)} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} basePath="/payments" params={{}} />
    </>
  );
}
