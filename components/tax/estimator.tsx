"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { estimateAction } from "@/app/actions/public";
import { Field, FormError, nativeSelectClass } from "@/components/shared/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatLKR, formatPercent } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";
import { msg } from "@/lib/i18n/translate";
import type { TaxResult } from "@/lib/tax/types";

const FIELDS = [
  { name: "annualSalary", label: msg("Annual salary"), hint: msg("Before APIT and EPF") },
  { name: "businessIncome", label: msg("Business or freelance income"), hint: msg("Gross receipts for the year") },
  { name: "businessExpenses", label: msg("Deductible business expenses"), hint: msg("Costs of earning that business income") },
  { name: "interestIncome", label: msg("Interest income"), hint: msg("Gross, before AIT") },
  { name: "rentalIncome", label: msg("Rental income"), hint: msg("Gross rent for the year") },
  { name: "otherIncome", label: msg("Other income"), hint: "" },
] as const;

/** Public estimator. The figures are sent to the server; the browser does no tax arithmetic. */
export function Estimator({ years, defaultYear }: { years: string[]; defaultYear: string }) {
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = useT();
  const locale = useLocale();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    startTransition(async () => {
      const response = await estimateAction(values);
      if (response.ok) {
        setResult(response.data);
        setError(null);
      } else {
        setError(response.fieldErrors ? t("Enter amounts as numbers, zero or above.") : response.error);
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>{t("Your figures")}</CardTitle>
          <CardDescription>{t("For a resident individual. Leave anything that does not apply blank.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormError message={error} />
            <Field label={t("Year of assessment")}>
              {(p) => (
                <select name="taxYear" defaultValue={defaultYear} className={nativeSelectClass} {...p}>
                  {years.map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <Field key={field.name} label={t(field.label)} hint={field.hint ? t(field.hint) : undefined}>
                  {(p) => (
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>
                        {t("Rs.")}
                      </span>
                      <Input name={field.name} inputMode="decimal" placeholder="0" className="tabular pl-9" {...p} />
                    </div>
                  )}
                </Field>
              ))}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("Estimate my tax")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-xs" aria-live="polite">
        <CardHeader>
          <CardTitle>{t("Estimate")}</CardTitle>
          <CardDescription>{result ? t("Year of assessment {year}", { year: result.taxYear }) : t("Your result appears here.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!result ? (
            <p className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">{t("Enter your income and choose “Estimate my tax”.")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("Estimated tax")}</p>
                  <p className="tabular text-3xl font-semibold tracking-tight">{formatLKR(result.totalTax)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("Effective rate")}</p>
                  <p className="tabular text-3xl font-semibold tracking-tight">{formatPercent(result.effectiveRate)}</p>
                </div>
              </div>
              <dl className="divide-y rounded-xl border text-sm">
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt>{t("Assessable income")}</dt>
                  <dd className="tabular font-medium">{formatLKR(result.assessableIncome)}</dd>
                </div>
                {[...result.reliefLines, ...result.qualifyingPaymentLines].map((line) => (
                  <div key={line.code} className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-muted-foreground">{t("Less: {label}", { label: locale === "en" ? line.label.toLowerCase() : line.label })}</dt>
                    <dd className="tabular">− {formatLKR(line.amount)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 bg-muted/50 px-4 py-2.5 font-semibold">
                  <dt>{t("Taxable income")}</dt>
                  <dd className="tabular">{formatLKR(result.taxableIncome)}</dd>
                </div>
                {result.taxLines.map((line, index) => (
                  <div key={index} className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-muted-foreground">
                      {line.label}
                      {line.base !== undefined && <span className="tabular block text-xs">{t("on {amount}", { amount: formatLKR(line.base) })}</span>}
                    </dt>
                    <dd className="tabular">{formatLKR(line.amount)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 bg-muted/50 px-4 py-2.5 font-semibold">
                  <dt>{t("Estimated tax for the year")}</dt>
                  <dd className="tabular">{formatLKR(result.totalTax)}</dd>
                </div>
              </dl>
              <p className="text-sm text-muted-foreground">
                {rich(t("About <b>{amount}</b> a month. The next rupee you earn would be taxed at {rate}.", { amount: formatLKR(Math.round(result.totalTax / 12)), rate: formatPercent(result.marginalRate, 0) }), {
                  b: (text) => <span className="tabular font-medium text-foreground">{text}</span>,
                })}
              </p>
              <div className="rounded-xl bg-accent p-4">
                <p className="text-sm font-medium text-accent-foreground">{t("Create an account to save this calculation.")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("Add APIT, withholding and payments to see what is still due, and get reminders before each deadline.")}</p>
                <Button asChild className="mt-3">
                  <Link href="/register">
                    {t("Create a free account")} <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("This is an estimate, not a tax assessment. It assumes you are resident in Sri Lanka, ignores withholding already deducted and reliefs other than those shown, and uses the rules on record for the selected year. Tax rules may change.")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
