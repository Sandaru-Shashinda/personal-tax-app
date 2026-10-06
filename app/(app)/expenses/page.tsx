import type { Metadata } from "next";
import { CircleCheck, CircleDashed, CircleHelp, CircleSlash, Download, Paperclip, Receipt } from "lucide-react";
import { deleteExpenseAction, deleteQualifyingPaymentAction } from "@/app/actions/records";
import { ExpenseForm, QualifyingPaymentForm } from "@/components/expenses/expense-forms";
import { Disclaimer } from "@/components/shared/disclaimer";
import { FilterBar } from "@/components/shared/filters";
import { EmptyState, PageHeader, Pagination, StatCard } from "@/components/shared/page";
import { DeleteButton } from "@/components/shared/record-dialog";
import { Why } from "@/components/shared/why";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatLKR } from "@/lib/format";
import { explainReason } from "@/lib/tax/expense-classifier";
import { findRule, toRuleUse } from "@/lib/tax/rule-set";
import { resolveTaxYear } from "@/lib/tax-year";
import { EXPENSE_CATEGORIES, QP_LABELS } from "@/lib/validation/records";
import { listExpenses, listQualifyingPayments } from "@/services/records/expense-service";
import { listIncomeSources } from "@/services/records/income-service";
import { loadRuleSet } from "@/services/tax/rule-repository";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Expenses") };
}

const STATUS = {
  DEDUCTIBLE: { label: msg("Deductible"), icon: CircleCheck, className: "text-success" },
  PARTIALLY_DEDUCTIBLE: { label: msg("Partially deductible"), icon: CircleDashed, className: "text-success" },
  NON_DEDUCTIBLE: { label: msg("Not deductible"), icon: CircleSlash, className: "text-muted-foreground" },
  REQUIRES_REVIEW: { label: msg("Requires review"), icon: CircleHelp, className: "text-warning" },
} as const;
type StatusKey = keyof typeof STATUS;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const t = await getT();
  const user = await requireUser();
  const params = await searchParams;
  const taxYear = await resolveTaxYear();
  const q = one(params.q)?.slice(0, 80);
  const category = EXPENSE_CATEGORIES.find((c) => c === one(params.category));
  const statusParam = one(params.deductibility);
  const deductibility = statusParam && statusParam in STATUS ? (statusParam as StatusKey) : undefined;
  const page = Math.max(Number(one(params.page)) || 1, 1);

  const [list, sources, claims, ruleSet] = await Promise.all([
    listExpenses(user.id, taxYear.code, { page, pageSize: 15, q, category, deductibility }),
    listIncomeSources(user.id),
    listQualifyingPayments(user.id, taxYear.code),
    loadRuleSet(taxYear.code),
  ]);
  const rule = findRule(ruleSet, "EXPENSE_DEDUCTIBILITY", "general");
  const total = list.byStatus.reduce((t, s) => t + s.amount, 0);
  const deductible = list.byStatus.reduce((t, s) => t + s.deductible, 0);
  const review = list.byStatus.find((s) => s.deductibility === "REQUIRES_REVIEW");
  const filtered = Boolean(q || category || deductibility);

  return (
    <>
      <PageHeader title={t("Expenses")} description={t("Track what you spend. Each expense is classified as deductible, partly deductible, not deductible or needing review, with the reason shown.")}>
        <Button asChild variant="outline">
          <a href={`/api/export/expenses?year=${encodeURIComponent(taxYear.code)}`}>
            <Download aria-hidden /> {t("CSV")}
          </a>
        </Button>
        <QualifyingPaymentForm taxYear={taxYear} />
        <ExpenseForm taxYear={taxYear} sources={sources} />
      </PageHeader>

      <section aria-label={t("Expense totals")} className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("Total recorded")} value={formatLKR(total)} hint={t("{count} expenses in {year}", { count: list.byStatus.reduce((sum, s) => sum + s.count, 0), year: taxYear.code })} />
        <StatCard label={t("Treated as deductible")} value={formatLKR(deductible)} hint={t("Reduces business income in your estimate")} />
        <StatCard label={t("Waiting for review")} value={formatLKR(review?.amount ?? 0)} hint={review ? t("{count} not yet deducted", { count: review.count }) : t("Nothing to review")} />
      </section>

      <FilterBar
        action="/expenses"
        q={q}
        placeholder={t("Search expenses")}
        selects={[
          { name: "category", label: t("Category"), value: category, options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(c) })) },
          { name: "deductibility", label: t("Treatment"), value: deductibility, options: Object.entries(STATUS).map(([value, s]) => ({ value, label: t(s.label) })) },
        ]}
      />

      {list.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filtered ? t("No expenses match those filters") : t("No expenses recorded for {year}", { year: taxYear.code })}
          description={filtered ? t("Try a different search, or clear the filters.") : t("Record business costs and keep the receipts together. Personal spending can be tracked too; it is simply never deducted.")}
        />
      ) : (
        <Card className="shadow-xs">
          <CardContent className="p-0">
            <ul className="divide-y">
              {list.items.map((expense) => {
                const status = STATUS[expense.deductibility];
                const Icon = status.icon;
                return (
                  <li key={expense.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate font-medium">{expense.description}</p>
                        <Badge variant="secondary">{t(expense.category)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(expense.incurredOn)} · {expense.incomeSourceName ?? t("Personal")}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className={`inline-flex items-center gap-1 font-medium ${status.className}`}>
                          <Icon className="size-4" aria-hidden />
                          {t(status.label)}
                          {expense.deductibility === "PARTIALLY_DEDUCTIBLE" && ` (${formatLKR(expense.deductibleAmount)})`}
                        </span>
                        <Why
                          question={expense.deductibility === "DEDUCTIBLE" ? t("Why is this expense deductible?") : t("Why is this expense treated this way?")}
                          explanation={`${explainReason(expense.deductibilityReason, t)} ${t("This is how the estimate treats it, not a legal ruling; ask a tax professional where the amount matters.")}`}
                          rule={rule ? toRuleUse(rule) : null}
                          taxYear={taxYear.code}
                        />
                      </div>
                    </div>
                    <p className="tabular shrink-0 pt-0.5 text-right font-medium">{formatLKR(expense.amount)}</p>
                    <div className="flex shrink-0 items-center">
                      {expense.receiptCount > 0 && (
                        <span className="mr-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Paperclip className="size-3.5" aria-hidden />
                          {expense.receiptCount}
                          <span className="sr-only"> {t("receipts attached")}</span>
                        </span>
                      )}
                      <ExpenseForm taxYear={taxYear} sources={sources} expense={expense} />
                      <DeleteButton label={t("Delete {name}", { name: expense.description })} description={t("{amount} on {date} will be removed.", { amount: formatLKR(expense.amount), date: formatDate(expense.incurredOn) })} action={deleteExpenseAction.bind(null, expense.id)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} basePath="/expenses" params={{ q, category, deductibility }} />

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>{t("Relief claims")}</CardTitle>
          <CardDescription>{t("Donations and solar expenditure for {year}. Statutory limits are applied in the calculation.", { year: taxYear.code })}</CardDescription>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No relief claims recorded for this year.")}</p>
          ) : (
            <ul className="divide-y">
              {claims.map((claim) => (
                <li key={claim.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{claim.recipient}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(QP_LABELS[claim.type])} · {formatDate(claim.paidOn)}
                    </p>
                  </div>
                  <p className="tabular font-medium">{formatLKR(claim.amount)}</p>
                  <DeleteButton label={t("Delete relief claim")} description={t("{amount} paid to {recipient} will no longer be claimed.", { amount: formatLKR(claim.amount), recipient: claim.recipient })} action={deleteQualifyingPaymentAction.bind(null, claim.id)} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Disclaimer>
        {t("Whether an expense is deductible can depend on facts and interpretation the app cannot check. Classifications here are a working estimate. Confirm significant items with the Inland Revenue Department or a qualified tax professional.")}
      </Disclaimer>
    </>
  );
}
