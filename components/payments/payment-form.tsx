"use client";

import { Plus } from "lucide-react";
import { useForm, type FieldValues } from "react-hook-form";
import { addPaymentAction } from "@/app/actions/records";
import { Field, fieldError, nativeSelectClass } from "@/components/shared/form";
import { RecordDialog } from "@/components/shared/record-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayInSriLanka } from "@/lib/format";
import { PAYMENT_TYPE_LABELS, paymentSchema } from "@/lib/validation/records";
import { useT } from "@/lib/i18n/client";

export function PaymentForm({ taxYear }: { taxYear: { code: string; startsOn: string } }) {
  const t = useT();
  const today = todayInSriLanka();
  const form = useForm<FieldValues>({
    defaultValues: { type: "INSTALMENT", paidOn: today, amount: "", reference: "", bank: "", instalmentNo: "", notes: "", confirmExceeds: false },
  });
  const { register, watch, formState } = form;
  const errors = formState.errors as Record<string, unknown>;
  const err = (name: string) => fieldError(errors, name);
  const needsConfirmation = Boolean(errors.confirmExceeds) || Boolean(watch("confirmExceeds"));

  return (
    <RecordDialog
      trigger={
        <Button>
          <Plus aria-hidden /> {t("Record payment")}
        </Button>
      }
      title={t("Record a tax payment")}
      description={t("A payment you made to the Inland Revenue Department for {year}. Recording it here does not pay anything.", { year: taxYear.code })}
      form={form}
      schema={paymentSchema}
      prepare={(values) => ({ ...values, taxYear: taxYear.code })}
      action={addPaymentAction}
      submitLabel={t("Record payment")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Payment type")} error={err("type")}>
          {(p) => (
            <select className={nativeSelectClass} {...p} {...register("type")}>
              {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
        {watch("type") === "INSTALMENT" && (
          <Field label={t("Instalment")} error={err("instalmentNo")} optional>
            {(p) => (
              <select className={nativeSelectClass} {...p} {...register("instalmentNo")}>
                <option value="">{t("Not specified")}</option>
                {[1, 2, 3, 4].map((no) => (
                  <option key={no} value={no}>
                    {t("Instalment {number}", { number: no })}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label={t("Date paid")} error={err("paidOn")}>
          {(p) => <Input type="date" min={taxYear.startsOn} max={today} {...p} {...register("paidOn")} />}
        </Field>
        <Field label={t("Amount")} error={err("amount")}>
          {(p) => <Input inputMode="decimal" placeholder="0.00" className="tabular" {...p} {...register("amount")} />}
        </Field>
        <Field label={t("Reference number")} error={err("reference")} optional hint={t("From the bank slip or online receipt")}>
          {(p) => <Input {...p} {...register("reference")} />}
        </Field>
        <Field label={t("Bank")} error={err("bank")} optional>
          {(p) => <Input {...p} {...register("bank")} />}
        </Field>
      </div>
      <Field label={t("Notes")} error={err("notes")} optional>
        {(p) => <Textarea rows={2} {...p} {...register("notes")} />}
      </Field>
      {needsConfirmation && (
        <label className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register("confirmExceeds")} />
          <span>{t("Yes, record this payment even though it is more than my estimated outstanding tax.")}</span>
        </label>
      )}
    </RecordDialog>
  );
}
