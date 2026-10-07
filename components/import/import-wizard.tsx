"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { importRecordsAction } from "@/app/actions/records";
import { Field, FormError, nativeSelectClass } from "@/components/shared/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseCsv } from "@/lib/csv";
import { formatDate, formatLKR, todayInSriLanka } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import {
  detectColumns,
  findHeaderRow,
  guessCategory,
  monthlyTotals,
  toStatementRows,
  type ColumnMapping,
  type ExpenseCategory,
} from "@/lib/import/statement";
import { EXPENSE_CATEGORIES, IMPORT_INCOME_TYPES, IMPORT_MAX_ROWS, importSchema, INCOME_TYPE_LABELS } from "@/lib/validation/records";

const MAX_BYTES = 10 * 1024 * 1024;
const PAGE_SIZE = 25;

interface ImportWizardProps {
  taxYear: { code: string; startsOn: string; endsOn: string };
  sources: { id: string; name: string; type: string }[];
}

interface Statement {
  name: string;
  headers: string[];
  rows: string[][];
}

const checkClass = "mt-0.5 size-4 accent-primary";

export function ImportWizard({ taxYear, sources }: ImportWizardProps) {
  const t = useT();
  const router = useRouter();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  // What the user changed on individual rows, keyed by the row's position in the file.
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<Record<number, ExpenseCategory>>({});
  const [settings, setSettings] = useState({
    saveAs: "ONE_OFF" as "ONE_OFF" | "MONTHLY",
    moneyOut: true,
    moneyIn: true,
    paymentMethod: "BANK_TRANSFER",
    expenseSourceId: "",
    confirmed: false,
    incomeType: "BUSINESS" as (typeof IMPORT_INCOME_TYPES)[number],
    incomeSourceName: "",
  });
  const set = (patch: Partial<typeof settings>) => setSettings((current) => ({ ...current, ...patch }));
  const map = (patch: Partial<ColumnMapping>) => {
    setMapping((current) => current && { ...current, ...patch });
    setPage(1);
  };

  async function onFile(file: File | undefined) {
    setError(null);
    setStatement(null);
    setMapping(null);
    setExcluded(new Set());
    setCategories({});
    setPage(1);
    if (!file) return;
    if (file.size > MAX_BYTES) return setError(t("Files can be up to 10 MB."));
    const table = parseCsv(await file.text());
    const header = findHeaderRow(table);
    const rows = table.slice(header + 1);
    if (rows.length === 0 || table[header].length < 2) return setError(t("We couldn't find any rows in that file. Save the statement as a CSV file and try again."));
    setStatement({ name: file.name, headers: table[header], rows });
    setMapping(detectColumns(table[header], rows.slice(0, 50)));
  }

  // Statement rows dated inside the tax year, each with its category (the user's choice, or a guess).
  const parsed = useMemo(() => {
    if (!statement || !mapping) return null;
    const { rows, unreadable } = toStatementRows(statement.rows, mapping);
    const latest = [taxYear.endsOn, todayInSriLanka()].sort()[0];
    const inYear = rows.filter((row) => row.date >= taxYear.startsOn && row.date <= latest).sort((a, b) => a.date.localeCompare(b.date) || a.line - b.line);
    return { rows: inYear.map((row) => ({ ...row, guess: guessCategory(row.description) })), unreadable, outside: rows.length - inYear.length };
  }, [statement, mapping, taxYear.startsOn, taxYear.endsOn]);

  const rows = useMemo(() => (parsed?.rows ?? []).filter((row) => (row.direction === "OUT" ? settings.moneyOut : settings.moneyIn)), [parsed, settings.moneyOut, settings.moneyIn]);
  const chosen = rows.filter((row) => !excluded.has(row.line));
  const out = chosen.filter((row) => row.direction === "OUT");
  const into = chosen.filter((row) => row.direction === "IN");
  const sum = (list: { amount: number }[]) => list.reduce((total, row) => total + row.amount, 0);
  const pages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const linked = Boolean(settings.expenseSourceId);

  function toggle(line: number) {
    setExcluded((current) => {
      const next = new Set(current);
      if (!next.delete(line)) next.add(line);
      return next;
    });
  }

  /** The same payee nearly always belongs in the same category, so one choice covers its other rows. */
  function setCategory(description: string, category: ExpenseCategory) {
    const same = (parsed?.rows ?? []).filter((row) => row.direction === "OUT" && row.description.toLowerCase() === description.toLowerCase());
    setCategories((current) => ({ ...current, ...Object.fromEntries(same.map((row) => [row.line, category])) }));
  }

  async function onImport() {
    setError(null);
    const monthly = settings.saveAs === "MONTHLY";
    const withCategory = out.map((row) => ({ ...row, category: categories[row.line] ?? row.guess }));
    const covers = (count: number) => t("{count} imported transactions", { count });
    const payload = {
      taxYear: taxYear.code,
      paymentMethod: settings.paymentMethod,
      expenseSourceId: settings.expenseSourceId,
      userConfirmedBusinessPurpose: settings.confirmed,
      incomeType: settings.incomeType,
      incomeSourceName: settings.incomeSourceName,
      expenses: monthly
        ? monthlyTotals(withCategory).map((total) => ({ incurredOn: total.month, amount: total.amount, category: total.category, description: covers(total.count), period: "MONTHLY" }))
        : withCategory.map((row) => ({ incurredOn: row.date, amount: row.amount, category: row.category, description: row.description || t(row.category) })),
      income: monthly
        ? monthlyTotals(into.map((row) => ({ ...row, category: null }))).map((total) => ({ receivedOn: total.month, amount: total.amount, description: covers(total.count), period: "MONTHLY" }))
        : into.map((row) => ({ receivedOn: row.date, amount: row.amount, description: row.description })),
    };
    if (Math.max(payload.expenses.length, payload.income.length) > IMPORT_MAX_ROWS) {
      return setError(t("That is more than {max} rows at once. Save them as monthly totals, or import the statement in parts.", { max: IMPORT_MAX_ROWS }));
    }
    const data = importSchema.safeParse(payload);
    if (!data.success) return setError(t(data.error.issues[0].message));

    setPending(true);
    try {
      const result = await importRecordsAction(data.data);
      if (!result.ok) return setError(result.error);
      const { expenses, income, duplicates } = result.data;
      toast.success(t("Imported {expenses} expense records and {income} income records.", { expenses, income }));
      if (duplicates > 0) toast.info(t("{count} rows were already recorded and were skipped.", { count: duplicates }));
      router.push(expenses > 0 || income === 0 ? "/expenses" : "/income");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const column = (label: string, value: number | null, onChange: (index: number) => void) => (
    <Field label={label}>
      {(p) => (
        <select className={nativeSelectClass} value={value ?? 0} onChange={(event) => onChange(Number(event.target.value))} {...p}>
          {statement?.headers.map((header, index) => (
            <option key={index} value={index}>
              {header || t("Column {number}", { number: index + 1 })}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>{t("1. Choose the file")}</CardTitle>
          <CardDescription>{t("Download the statement from your bank, card or till as a CSV file. It is read on this device, and only the rows you choose are saved.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label={t("File")}>{(p) => <Input type="file" accept=".csv,text/csv,text/plain" onChange={(event) => onFile(event.target.files?.[0])} {...p} />}</Field>
          {!statement && <FormError message={error} />}
          {statement && <p className="text-sm text-muted-foreground">{t("{count} rows read from {name}.", { count: statement.rows.length, name: statement.name })}</p>}
        </CardContent>
      </Card>

      {statement && mapping && parsed && (
        <>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("2. Match the columns")}</CardTitle>
              <CardDescription>{t("Check that each column was recognised. The rows below update as you change these.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {column(t("Date"), mapping.date, (date) => map({ date }))}
              <Field label={t("Date format")}>
                {(p) => (
                  <select className={nativeSelectClass} value={mapping.dateOrder} onChange={(event) => map({ dateOrder: event.target.value as ColumnMapping["dateOrder"] })} {...p}>
                    <option value="DMY">{t("Day first (31/12/2025)")}</option>
                    <option value="MDY">{t("Month first (12/31/2025)")}</option>
                    <option value="YMD">{t("Year first (2025-12-31)")}</option>
                  </select>
                )}
              </Field>
              {column(t("Description"), mapping.description, (description) => map({ description }))}
              <Field label={t("Amounts are in")}>
                {(p) => (
                  <select
                    className={nativeSelectClass}
                    value={mapping.amount === null ? "TWO" : "ONE"}
                    onChange={(event) => map(event.target.value === "ONE" ? { amount: mapping.moneyOut ?? 0, moneyOut: null, moneyIn: null } : { amount: null, moneyOut: mapping.amount ?? 0, moneyIn: mapping.amount ?? 0 })}
                    {...p}
                  >
                    <option value="ONE">{t("One column")}</option>
                    <option value="TWO">{t("Separate columns for money out and money in")}</option>
                  </select>
                )}
              </Field>
              {mapping.amount !== null ? (
                <>
                  {column(t("Amount"), mapping.amount, (amount) => map({ amount }))}
                  <Field label={t("A positive amount is")}>
                    {(p) => (
                      <select className={nativeSelectClass} value={mapping.positiveIs} onChange={(event) => map({ positiveIs: event.target.value as ColumnMapping["positiveIs"] })} {...p}>
                        <option value="OUT">{t("Money out")}</option>
                        <option value="IN">{t("Money in")}</option>
                      </select>
                    )}
                  </Field>
                </>
              ) : (
                <>
                  {column(t("Money out"), mapping.moneyOut, (moneyOut) => map({ moneyOut }))}
                  {column(t("Money in"), mapping.moneyIn, (moneyIn) => map({ moneyIn }))}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("3. Choose how to save them")}</CardTitle>
              <CardDescription>{t("These choices apply to every row you import. You can edit any record afterwards.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("Save as")} hint={settings.saveAs === "MONTHLY" ? t("One expense total per month and category, and one income total per month. Import each statement once.") : undefined} className="sm:max-w-sm">
                {(p) => (
                  <select className={nativeSelectClass} value={settings.saveAs} onChange={(event) => set({ saveAs: event.target.value as "ONE_OFF" | "MONTHLY" })} {...p}>
                    <option value="ONE_OFF">{t("One record for each transaction")}</option>
                    <option value="MONTHLY">{t("Monthly totals")}</option>
                  </select>
                )}
              </Field>
              <div className="grid gap-4 lg:grid-cols-2">
                <fieldset className="space-y-3 rounded-xl border p-4">
                  <legend className="px-1 text-sm font-medium">{t("Money out")}</legend>
                  <label className="flex items-start gap-2.5 text-sm">
                    <input type="checkbox" className={checkClass} checked={settings.moneyOut} onChange={(event) => set({ moneyOut: event.target.checked })} />
                    <span>{t("Import money out as expenses")}</span>
                  </label>
                  {settings.moneyOut && (
                    <>
                      <Field label={t("Payment method")}>
                        {(p) => (
                          <select className={nativeSelectClass} value={settings.paymentMethod} onChange={(event) => set({ paymentMethod: event.target.value })} {...p}>
                            <option value="BANK_TRANSFER">{t("Bank transfer")}</option>
                            <option value="CARD">{t("Card")}</option>
                            <option value="CHEQUE">{t("Cheque")}</option>
                            <option value="CASH">{t("Cash")}</option>
                            <option value="OTHER">{t("Other")}</option>
                          </select>
                        )}
                      </Field>
                      <Field label={t("Related income source")} hint={t("Rows you categorise as Personal are never linked or deducted.")}>
                        {(p) => (
                          <select className={nativeSelectClass} value={settings.expenseSourceId} onChange={(event) => set({ expenseSourceId: event.target.value })} {...p}>
                            <option value="">{t("Personal / not linked")}</option>
                            {sources.map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                      {linked && (
                        <label className="flex items-start gap-2.5 text-sm">
                          <input type="checkbox" className={checkClass} checked={settings.confirmed} onChange={(event) => set({ confirmed: event.target.checked })} />
                          <span>{t("I confirm the rows I import were incurred in earning that income and are not personal.")}</span>
                        </label>
                      )}
                    </>
                  )}
                </fieldset>
                <fieldset className="space-y-3 rounded-xl border p-4">
                  <legend className="px-1 text-sm font-medium">{t("Money in")}</legend>
                  <label className="flex items-start gap-2.5 text-sm">
                    <input type="checkbox" className={checkClass} checked={settings.moneyIn} onChange={(event) => set({ moneyIn: event.target.checked })} />
                    <span>
                      {t("Import money in as business income")}
                      <span className="block text-xs text-muted-foreground">{t("Untick transfers, loans, refunds and salary below; they are not business income.")}</span>
                    </span>
                  </label>
                  {settings.moneyIn && (
                    <>
                      <Field label={t("Type of income")}>
                        {(p) => (
                          <select className={nativeSelectClass} value={settings.incomeType} onChange={(event) => set({ incomeType: event.target.value as typeof settings.incomeType })} {...p}>
                            {IMPORT_INCOME_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {t(INCOME_TYPE_LABELS[type])}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                      <Field label={t("Income source")}>
                        {(p) => (
                          <>
                            <Input list="import-sources" autoComplete="off" value={settings.incomeSourceName} onChange={(event) => set({ incomeSourceName: event.target.value })} {...p} />
                            <datalist id="import-sources">
                              {sources.filter((source) => source.type === settings.incomeType).map((source) => (
                                <option key={source.id} value={source.name} />
                              ))}
                            </datalist>
                          </>
                        )}
                      </Field>
                    </>
                  )}
                </fieldset>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("4. Check the rows")}</CardTitle>
              <CardDescription>
                {t("Untick anything that should not be recorded. Changing a category also changes the other rows with the same description.")}
                {parsed.outside + parsed.unreadable > 0 &&
                  ` ${t("{outside} rows dated outside {year} and {unreadable} rows without a readable date or amount were left out.", { outside: parsed.outside, year: taxYear.code, unreadable: parsed.unreadable })}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No rows to import. Check the columns and the date format above.")}</p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {visible.map((row) => (
                    <li key={row.line} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 text-sm">
                      <input type="checkbox" className="size-4 accent-primary" checked={!excluded.has(row.line)} onChange={() => toggle(row.line)} aria-label={t("Import {name}", { name: row.description || formatDate(row.date) })} />
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="truncate font-medium">{row.description || "—"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(row.date)}</p>
                      </div>
                      {row.direction === "OUT" ? (
                        <select
                          className={`${nativeSelectClass} sm:w-52`}
                          value={categories[row.line] ?? row.guess}
                          onChange={(event) => setCategory(row.description, event.target.value as ExpenseCategory)}
                          aria-label={t("Category")}
                        >
                          {EXPENSE_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {t(category)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground sm:w-52">{t("Income")}</span>
                      )}
                      <p className={`tabular w-32 shrink-0 text-right font-medium ${row.direction === "IN" ? "text-success" : ""}`}>
                        {row.direction === "IN" ? "+" : "−"}
                        {formatLKR(row.amount, { cents: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {pages > 1 && (
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <p>{t("Showing {from}–{to} of {total}", { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, rows.length), total: rows.length })}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      {t("Previous")}
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                      {t("Next")}
                    </Button>
                  </div>
                </div>
              )}
              <FormError message={error} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="tabular text-sm">
                  {t("{expenses} expenses totalling {out}, and {income} receipts totalling {in}.", { expenses: out.length, out: formatLKR(sum(out)), income: into.length, in: formatLKR(sum(into)) })}
                </p>
                <Button onClick={onImport} disabled={pending || chosen.length === 0}>
                  {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
                  {t("Import {count} rows", { count: chosen.length })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
