import type { Metadata } from "next";
import { Download, Paperclip, Upload, Wallet } from "lucide-react";
import Link from "next/link";
import { deleteIncomeAction } from "@/app/actions/records";
import { IncomeForm } from "@/components/income/income-form";
import { FilterBar } from "@/components/shared/filters";
import { EmptyState, PageHeader, Pagination, StatCard } from "@/components/shared/page";
import { DeleteButton } from "@/components/shared/record-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatForeign, formatLKR, formatMonth } from "@/lib/format";
import { resolveTaxYear } from "@/lib/tax-year";
import { INCOME_TYPES, INCOME_TYPE_LABELS, type IncomeTypeValue } from "@/lib/validation/records";
import { listIncome, listIncomeSources } from "@/services/records/income-service";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Income") };
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function IncomePage({ searchParams }: PageProps<"/income">) {
  const t = await getT();
  const user = await requireUser();
  const params = await searchParams;
  const taxYear = await resolveTaxYear();
  const typeParam = one(params.type);
  const type = INCOME_TYPES.includes(typeParam as IncomeTypeValue) ? (typeParam as IncomeTypeValue) : undefined;
  const q = one(params.q)?.slice(0, 80);
  const page = Math.max(Number(one(params.page)) || 1, 1);

  const [list, sources, taxpayer] = await Promise.all([
    listIncome(user.id, taxYear.code, { page, pageSize: 15, type, q }),
    listIncomeSources(user.id),
    db.taxpayer.findUnique({ where: { userId: user.id }, select: { incomeTypes: true } }),
  ]);
  const gross = list.byType.reduce((t, row) => t + row.gross, 0);
  const withheld = list.byType.reduce((t, row) => t + row.withheld, 0);
  const preferred = (taxpayer?.incomeTypes[0] as IncomeTypeValue | undefined) ?? "SALARY";
  const filtered = Boolean(type || q);

  return (
    <>
      <PageHeader title={t("Income")} description={t("Everything you received in {year}, by source. Enter gross amounts and the tax deducted at source.", { year: taxYear.code })}>
        <Button asChild variant="outline">
          <a href={`/api/export/income?year=${encodeURIComponent(taxYear.code)}`}>
            <Download aria-hidden /> {t("CSV")}
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href="/import">
            <Upload aria-hidden /> {t("Import")}
          </Link>
        </Button>
        <IncomeForm taxYear={taxYear} sources={sources} preferredType={preferred} defaultOpen={Boolean(one(params.new))} />
      </PageHeader>

      <section aria-label={t("Income totals")} className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("Gross income recorded")} value={formatLKR(gross)} hint={t("{count} records", { count: list.byType.reduce((sum, r) => sum + r.count, 0) })} />
        <StatCard label={t("Tax withheld at source")} value={formatLKR(withheld)} hint={t("APIT, AIT and other withholding")} />
        <StatCard label={t("Income types")} value={String(list.byType.length)} hint={list.byType.map((r) => t(INCOME_TYPE_LABELS[r.type])).join(", ") || t("None yet")} />
      </section>

      <FilterBar
        action="/income"
        q={q}
        placeholder={t("Search income by source or description")}
        selects={[{ name: "type", label: t("Type"), value: type, options: INCOME_TYPES.map((value) => ({ value, label: t(INCOME_TYPE_LABELS[value]) })) }]}
      />

      {list.items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={filtered ? t("No income matches those filters") : t("No income recorded for {year}", { year: taxYear.code })}
          description={filtered ? t("Try a different search, or clear the filters.") : t("Add your salary, freelance invoices, rent, interest or any other income to start your estimate.")}
        />
      ) : (
        <Card className="shadow-xs">
          <CardContent className="p-0">
            <ul className="divide-y">
              {list.items.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate font-medium">{entry.sourceName}</p>
                      <Badge variant="secondary">{t(INCOME_TYPE_LABELS[entry.type])}</Badge>
                      {entry.remittedViaBank && <Badge variant="outline">{t("Foreign currency, remitted")}</Badge>}
                      {entry.investment?.isExempt && <Badge variant="outline">{t("Exempt")}</Badge>}
                      {entry.business && entry.period === "MONTHLY" && <Badge variant="outline">{t("Monthly total")}</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {entry.business && entry.period === "MONTHLY" ? formatMonth(entry.receivedOn) : formatDate(entry.receivedOn)}
                      {entry.period === "MONTHLY" && !entry.business && ` · ${t("{count} months", { count: entry.salary?.months ?? entry.rental?.months ?? 1 })}`}
                      {entry.description && ` · ${entry.description}`}
                      {entry.currency !== "LKR" && entry.originalAmount !== null && ` · ${t("{amount} at {rate} ({source})", { amount: formatForeign(entry.originalAmount, entry.currency), rate: String(entry.exchangeRate), source: entry.exchangeRateSource ?? "" })}`}
                    </p>
                  </div>
                  <div className="tabular shrink-0 text-right">
                    <p className="font-medium">{entry.capitalGain ? formatLKR(entry.capitalGain.gain) : formatLKR(entry.grossAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.capitalGain ? (entry.capitalGain.gain >= 0 ? t("gain") : t("loss")) : entry.withholdingTax > 0 ? t("{amount} withheld", { amount: formatLKR(entry.withholdingTax) }) : t("No tax withheld")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {entry.documentCount > 0 && (
                      <span className="mr-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground" title={t("Supporting documents")}>
                        <Paperclip className="size-3.5" aria-hidden />
                        {entry.documentCount}
                        <span className="sr-only"> {t("supporting documents")}</span>
                      </span>
                    )}
                    <IncomeForm taxYear={taxYear} sources={sources} entry={entry} />
                    <DeleteButton
                      label={t("Delete {name} record", { name: entry.sourceName })}
                      description={t("{amount} received on {date} will be removed from your {year} calculation.", { amount: formatLKR(entry.grossAmount), date: formatDate(entry.receivedOn), year: taxYear.code })}
                      action={deleteIncomeAction.bind(null, entry.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} basePath="/income" params={{ type, q }} />
    </>
  );
}
