"use client";

import { Pencil, Plus } from "lucide-react";
import { useForm, type FieldValues } from "react-hook-form";
import { addQualifyingPaymentAction, saveExpenseAction } from "@/app/actions/records";
import { Field, fieldError, nativeSelectClass } from "@/components/shared/form";
import { RecordDialog } from "@/components/shared/record-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { firstOfMonth, formatMonth, monthsFrom, todayInSriLanka } from "@/lib/format";
import { EXPENSE_CATEGORIES, expenseSchema, QP_LABELS, qualifyingPaymentSchema } from "@/lib/validation/records";
import type { ExpenseDTO } from "@/services/records/expense-service";
import { useT } from "@/lib/i18n/client";

interface YearProps {
  taxYear: { code: string; startsOn: string; endsOn: string };
}

/** Latest date a record in this tax year can carry: today, or the year's last day if it has ended. */
function latestDate(taxYear: YearProps["taxYear"]): string {
  const today = todayInSriLanka();
  return today < taxYear.endsOn ? today : taxYear.endsOn;
}

export function ExpenseForm({ taxYear, sources, expense }: YearProps & { sources: { id: string; name: string; type: string }[]; expense?: ExpenseDTO }) {
  const t = useT();
  const max = latestDate(taxYear);
  const form = useForm<FieldValues>({
    defaultValues: {
      period: expense?.period === "MONTHLY" ? "MONTHLY" : "ONE_OFF",
      incurredMonth: firstOfMonth(expense?.incurredOn ?? (max >= taxYear.startsOn ? max : taxYear.startsOn)),
      incurredOn: expense?.incurredOn ?? (max >= taxYear.startsOn ? max : taxYear.startsOn),
      amount: expense?.amount ?? "",
      category: expense?.category ?? EXPENSE_CATEGORIES[0],
      description: expense?.description ?? "",
      paymentMethod: expense?.paymentMethod ?? "CARD",
      incomeSourceId: expense?.incomeSourceId ?? "",
      isCapital: expense?.isCapital ?? false,
      userConfirmedBusinessPurpose: expense?.userConfirmedBusinessPurpose ?? false,
      businessUsePercent: expense?.businessUsePercent ?? 100,
      notes: expense?.notes ?? "",
    },
  });
  const { register, watch, formState } = form;
  const err = (name: string) => fieldError(formState.errors as Record<string, unknown>, name);
  const linked = Boolean(watch("incomeSourceId"));
  // Many small payments in a month can be recorded as one total per category.
  const monthTotal = watch("period") === "MONTHLY";

  return (
    <RecordDialog
      trigger={
        expense ? (
          <Button variant="ghost" size="icon-sm" aria-label={t("Edit {name}", { name: expense.description })}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden /> {t("Add expense")}
          </Button>
        )
      }
      title={expense ? t("Edit expense") : t("Add expense")}
      description={t("Record what you spent. Whether it reduces your tax is worked out from the details below, and you can see why.")}
      form={form}
      schema={expenseSchema}
      prepare={(values) => ({ ...values, taxYear: taxYear.code, ...(values.period === "MONTHLY" && { incurredOn: values.incurredMonth }) })}
      action={(data) => saveExpenseAction(expense?.id ?? null, data)}
      submitLabel={expense ? t("Save changes") : t("Add expense")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Entered as")} error={err("period")} className="sm:col-span-2">
          {(p) => (
            <select className={nativeSelectClass} {...p} {...register("period")}>
              <option value="ONE_OFF">{t("Single expense")}</option>
              <option value="MONTHLY">{t("Monthly total")}</option>
            </select>
          )}
        </Field>
        {monthTotal ? (
          <Field label={t("Month")} error={err("incurredOn")}>
            {(p) => (
              <select className={nativeSelectClass} {...p} {...register("incurredMonth")}>
                {monthsFrom(taxYear.startsOn)
                  .filter((month) => month <= max)
                  .map((month) => (
                    <option key={month} value={month}>
                      {formatMonth(month)}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        ) : (
          <Field label={t("Date")} error={err("incurredOn")}>
            {(p) => <Input type="date" min={taxYear.startsOn} max={max} {...p} {...register("incurredOn")} />}
          </Field>
        )}
        <Field label={monthTotal ? t("Total for the month") : t("Amount")} error={err("amount")}>
          {(p) => <Input inputMode="decimal" placeholder="0.00" className="tabular" {...p} {...register("amount")} />}
        </Field>
        <Field label={t("Category")} error={err("category")}>
          {(p) => (
            <select className={nativeSelectClass} {...p} {...register("category")}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(category)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t("Payment method")} error={err("paymentMethod")}>
          {(p) => (
            <select className={nativeSelectClass} {...p} {...register("paymentMethod")}>
              <option value="CARD">{t("Card")}</option>
              <option value="BANK_TRANSFER">{t("Bank transfer")}</option>
              <option value="CHEQUE">{t("Cheque")}</option>
              <option value="CASH">{t("Cash")}</option>
              <option value="OTHER">{t("Other")}</option>
            </select>
          )}
        </Field>
      </div>
      <Field label={t("Description")} error={err("description")}>
        {(p) => <Input {...p} {...register("description")} />}
      </Field>
      <Field label={t("Related income source")} error={err("incomeSourceId")} hint={t("Leave as personal if this was not spent to earn income.")}>
        {(p) => (
          <select className={nativeSelectClass} {...p} {...register("incomeSourceId")}>
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
        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="px-1 text-sm font-medium">{t("Tax treatment")}</legend>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register("userConfirmedBusinessPurpose")} />
            <span>{t("I confirm this was incurred in earning that income and is not personal.")}</span>
          </label>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register("isCapital")} />
            <span>
              {t("This is a capital purchase")}
              <span className="block text-xs text-muted-foreground">{t("Equipment, vehicles or other assets that last more than a year.")}</span>
            </span>
          </label>
          <Field label={t("Share used for the business (%)")} error={err("businessUsePercent")} hint={t("Use less than 100 for costs that are partly private, such as a home internet line.")}>
            {(p) => <Input type="number" min={1} max={100} className="sm:w-32" {...p} {...register("businessUsePercent")} />}
          </Field>
        </fieldset>
      )}
      {monthTotal && <p className="text-xs text-muted-foreground">{t("Keep the bills, receipts or statements behind this total. The tax office can ask for them, and you can store them under Documents.")}</p>}
      <Field label={t("Notes")} error={err("notes")} optional>
        {(p) => <Textarea rows={2} {...p} {...register("notes")} />}
      </Field>
    </RecordDialog>
  );
}

export function QualifyingPaymentForm({ taxYear }: YearProps) {
  const t = useT();
  const max = latestDate(taxYear);
  const form = useForm<FieldValues>({
    defaultValues: { type: "CHARITY_DONATION", paidOn: max >= taxYear.startsOn ? max : taxYear.startsOn, amount: "", recipient: "", description: "" },
  });
  const { register, formState } = form;
  const err = (name: string) => fieldError(formState.errors as Record<string, unknown>, name);
  return (
    <RecordDialog
      trigger={
        <Button variant="outline">
          <Plus aria-hidden /> {t("Add relief claim")}
        </Button>
      }
      title={t("Add a relief claim")}
      description={t("Donations and solar expenditure that the law lets you deduct. Limits are applied automatically and shown on the Tax page.")}
      form={form}
      schema={qualifyingPaymentSchema}
      prepare={(values) => ({ ...values, taxYear: taxYear.code })}
      action={addQualifyingPaymentAction}
      submitLabel={t("Add claim")}
    >
      <Field label={t("Type")} error={err("type")}>
        {(p) => (
          <select className={nativeSelectClass} {...p} {...register("type")}>
            {Object.entries(QP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Date paid")} error={err("paidOn")}>
          {(p) => <Input type="date" min={taxYear.startsOn} max={max} {...p} {...register("paidOn")} />}
        </Field>
        <Field label={t("Amount")} error={err("amount")} hint={t("For solar panels, the amount you are claiming this year.")}>
          {(p) => <Input inputMode="decimal" placeholder="0.00" className="tabular" {...p} {...register("amount")} />}
        </Field>
      </div>
      <Field label={t("Paid to")} error={err("recipient")}>
        {(p) => <Input {...p} {...register("recipient")} />}
      </Field>
      <Field label={t("Description")} error={err("description")} optional>
        {(p) => <Input {...p} {...register("description")} />}
      </Field>
    </RecordDialog>
  );
}
