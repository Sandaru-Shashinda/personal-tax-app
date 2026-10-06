import type { Metadata } from "next";
import { FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { MonthlyChart } from "@/components/charts/lazy";
import { Disclaimer } from "@/components/shared/disclaimer";
import { PageHeader } from "@/components/shared/page";
import { PrintButton } from "@/components/shared/print-button";
import { TaxStatement } from "@/components/tax/statement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatLKR, formatPercent } from "@/lib/format";
import { resolveTaxYear } from "@/lib/tax-year";
import { INCOME_TYPE_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/validation/records";
import { getAccount } from "@/services/account/account-service";
import { getMonthlySeries } from "@/services/insights/year-facts";
import { listExpenses } from "@/services/records/expense-service";
import { listIncome } from "@/services/records/income-service";
import { getTaxSummary } from "@/services/tax/tax-service";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Reports") };
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 px-4 py-2.5 text-sm ${strong ? "bg-muted/50 font-semibold" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

export default async function ReportsPage() {
  const t = await getT();
  const user = await requireUser();
  const taxYear = await resolveTaxYear();
  const year = encodeURIComponent(taxYear.code);
  // Aggregates only: the per-type and per-category totals come from GROUP BY queries.
  const [{ result }, account, months, income, expenses, expenseByCategory, payments] = await Promise.all([
    getTaxSummary(user.id, taxYear.code, t),
    getAccount(user.id),
    getMonthlySeries(user.id, taxYear.id, taxYear.startsOn),
    listIncome(user.id, taxYear.code, { page: 1, pageSize: 1 }),
    listExpenses(user.id, taxYear.code, { page: 1, pageSize: 1 }),
    db.expense.groupBy({ by: ["category"], where: { userId: user.id, taxYearId: taxYear.id, deletedAt: null }, _sum: { amount: true, deductibleAmount: true }, _count: true, orderBy: { _sum: { amount: "desc" } } }),
    db.taxPayment.findMany({ where: { userId: user.id, taxYearId: taxYear.id, deletedAt: null }, orderBy: { paidOn: "asc" }, take: 100 }),
  ]);
  const credit = (code: string) => result.creditLines.find((l) => l.code === code)?.amount ?? 0;
  const exports = [
    { href: `/api/export/tax-summary-pdf?year=${year}`, label: t("Annual tax report (PDF)"), icon: FileDown },
    { href: `/api/export/tax-summary?year=${year}`, label: t("Tax summary (CSV)"), icon: FileSpreadsheet },
    { href: `/api/export/income?year=${year}`, label: t("Income (CSV)"), icon: FileSpreadsheet },
    { href: `/api/export/expenses?year=${year}`, label: t("Expenses (CSV)"), icon: FileSpreadsheet },
    { href: `/api/export/payments?year=${year}`, label: t("Payments (CSV)"), icon: FileSpreadsheet },
  ];

  return (
    <>
      <PageHeader title={t("Reports")} description={t("Summaries of your {year} records, ready to print or export.", { year: taxYear.code })}>
        <PrintButton>
          <Printer aria-hidden /> {t("Print")}
        </PrintButton>
      </PageHeader>

      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>{t("Export")}</CardTitle>
          <CardDescription>{t("Downloads contain your own records for {year}. They are your working papers, not IRD forms.", { year: taxYear.code })}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {exports.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="outline">
              <a href={href}>
                <Icon aria-hidden /> {label}
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="annual">
        <TabsList className="no-print h-auto flex-wrap">
          <TabsTrigger value="annual">{t("Annual summary")}</TabsTrigger>
          <TabsTrigger value="breakdown">{t("Calculation breakdown")}</TabsTrigger>
          <TabsTrigger value="monthly">{t("Monthly")}</TabsTrigger>
          <TabsTrigger value="income">{t("Income")}</TabsTrigger>
          <TabsTrigger value="expenses">{t("Expenses")}</TabsTrigger>
          <TabsTrigger value="payments">{t("Payments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="annual">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Annual tax summary — {year}", { year: taxYear.code })}</CardTitle>
              <CardDescription>
                {account.profile.fullName} · {account.taxpayer.tin ? t("TIN {tin}", { tin: account.taxpayer.tin }) : t("TIN not entered")} · {t("{from} to {to}", { from: formatDate(taxYear.startsOn), to: formatDate(taxYear.endsOn) })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y rounded-xl border">
                <Row label={t("Gross income (assessable)")} value={formatLKR(result.assessableIncome)} strong />
                <Row label={`  ${t("Employment")}`} value={formatLKR(result.incomeByCategory.employment)} />
                <Row label={`  ${t("Business")}`} value={formatLKR(result.incomeByCategory.business)} />
                <Row label={`  ${t("Investment")}`} value={formatLKR(result.incomeByCategory.investment)} />
                <Row label={`  ${t("Other")}`} value={formatLKR(result.incomeByCategory.other)} />
                <Row label={t("Reliefs")} value={formatLKR(result.reliefLines.reduce((t, l) => t + l.amount, 0))} />
                <Row label={t("Qualifying payments")} value={formatLKR(result.qualifyingPaymentLines.reduce((t, l) => t + l.amount, 0))} />
                <Row label={t("Taxable income")} value={formatLKR(result.taxableIncome)} strong />
                <Row label={t("Tax before credits")} value={formatLKR(result.totalTax)} strong />
                <Row label={t("APIT")} value={formatLKR(credit("APIT"))} />
                <Row label={t("AIT / withholding tax")} value={formatLKR(credit("AIT"))} />
                <Row label={t("Instalments and other payments")} value={formatLKR(credit("INSTALMENTS") + credit("FINAL_PAYMENT") + credit("OTHER_PAYMENTS") + credit("CGT_PAID") + credit("FOREIGN_TAX_CREDIT"))} />
                <Row label={t("Tax paid")} value={formatLKR(result.totalCredits)} strong />
                <Row label={result.balancePayable >= 0 ? t("Remaining liability") : t("Overpaid")} value={formatLKR(Math.abs(result.balancePayable))} strong />
                <Row label={t("Effective tax rate")} value={formatPercent(result.effectiveRate)} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Tax calculation breakdown")}</CardTitle>
              <CardDescription>{t("Every step from income to remaining liability.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <TaxStatement result={result} compact />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Monthly summary")}</CardTitle>
              <CardDescription>{t("Income received and expenses recorded in each month.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={months.map(({ label, income, expenses }) => ({ label, income, expenses }))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Income summary")}</CardTitle>
              <CardDescription>{t("Gross amounts and tax withheld, by type of income.")}</CardDescription>
            </CardHeader>
            <CardContent>
              {income.byType.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No income recorded for this year.")}</p>
              ) : (
                <table className="tabular w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 font-medium">{t("Type")}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t("Records")}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t("Gross")}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t("Tax withheld")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.byType.map((row) => (
                      <tr key={row.type} className="border-t">
                        <th scope="row" className="py-2 text-left font-normal">{t(INCOME_TYPE_LABELS[row.type])}</th>
                        <td className="py-2 text-right">{row.count}</td>
                        <td className="py-2 text-right">{formatLKR(row.gross)}</td>
                        <td className="py-2 text-right">{formatLKR(row.withheld)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Expense summary")}</CardTitle>
              <CardDescription>
                {t("{total} recorded, of which {deductible} is treated as deductible.", { total: formatLKR(expenses.byStatus.reduce((sum, s) => sum + s.amount, 0)), deductible: formatLKR(expenses.byStatus.reduce((sum, s) => sum + s.deductible, 0)) })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenseByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No expenses recorded for this year.")}</p>
              ) : (
                <table className="tabular w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 font-medium">{t("Category")}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t("Records")}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t("Amount")}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t("Deductible")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseByCategory.map((row) => (
                      <tr key={row.category} className="border-t">
                        <th scope="row" className="py-2 text-left font-normal">{t(row.category)}</th>
                        <td className="py-2 text-right">{row._count}</td>
                        <td className="py-2 text-right">{formatLKR(Number(row._sum.amount ?? 0))}</td>
                        <td className="py-2 text-right">{formatLKR(Number(row._sum.deductibleAmount ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Payment summary")}</CardTitle>
              <CardDescription>{t("Payments you recorded, plus tax withheld at source.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="divide-y rounded-xl border">
                {result.creditLines.map((line) => (
                  <Row key={line.code} label={t(line.label)} value={formatLKR(line.amount)} />
                ))}
                <Row label={t("Total")} value={formatLKR(result.totalCredits)} strong />
              </dl>
              {payments.length > 0 && (
                <table className="tabular w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 font-medium">{t("Date")}</th>
                      <th scope="col" className="py-2 font-medium">{t("Type")}</th>
                      <th scope="col" className="py-2 font-medium">{t("Reference")}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t("Amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-2">{formatDate(p.paidOn)}</td>
                        <td className="py-2">{t(PAYMENT_TYPE_LABELS[p.type])}</td>
                        <td className="py-2">{p.reference ?? "—"}</td>
                        <td className="py-2 text-right">{formatLKR(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Disclaimer />
    </>
  );
}
