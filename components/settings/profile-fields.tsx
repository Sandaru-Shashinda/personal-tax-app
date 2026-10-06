"use client";

import type { FieldValues, UseFormReturn } from "react-hook-form";
import { Field, fieldError, nativeSelectClass } from "@/components/shared/form";
import { Input } from "@/components/ui/input";
import { DISTRICTS, INCOME_TYPES, INCOME_TYPE_LABELS, PROVINCES } from "@/lib/validation/records";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

// Field groups shared by the onboarding wizard and the Settings page.

type Form = UseFormReturn<FieldValues>;
const errorOf = (form: Form, name: string) => fieldError(form.formState.errors as Record<string, unknown>, name);

export function PersonalFields({ form }: { form: Form }) {
  const t = useT();
  const { register } = form;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("Full name")} error={errorOf(form, "fullName")} className="sm:col-span-2">
        {(p) => <Input autoComplete="name" {...p} {...register("fullName")} />}
      </Field>
      <Field label={t("Date of birth")} error={errorOf(form, "dateOfBirth")} optional>
        {(p) => <Input type="date" autoComplete="bday" {...p} {...register("dateOfBirth")} />}
      </Field>
      <Field label={t("Phone")} error={errorOf(form, "phone")} optional>
        {(p) => <Input type="tel" autoComplete="tel" placeholder="+94 7X XXX XXXX" {...p} {...register("phone")} />}
      </Field>
      <Field label={t("Address line 1")} error={errorOf(form, "addressLine1")} optional className="sm:col-span-2">
        {(p) => <Input autoComplete="address-line1" {...p} {...register("addressLine1")} />}
      </Field>
      <Field label={t("Address line 2")} error={errorOf(form, "addressLine2")} optional className="sm:col-span-2">
        {(p) => <Input autoComplete="address-line2" {...p} {...register("addressLine2")} />}
      </Field>
      <Field label={t("City / town")} error={errorOf(form, "city")} optional>
        {(p) => <Input autoComplete="address-level2" {...p} {...register("city")} />}
      </Field>
      <Field label={t("Postal code")} error={errorOf(form, "postalCode")} optional>
        {(p) => <Input inputMode="numeric" autoComplete="postal-code" maxLength={5} {...p} {...register("postalCode")} />}
      </Field>
      <Field label={t("District")} error={errorOf(form, "district")} optional>
        {(p) => (
          <select className={nativeSelectClass} {...p} {...register("district")}>
            <option value="">{t("Select a district")}</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {t(d)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t("Province")} error={errorOf(form, "province")} optional>
        {(p) => (
          <select className={nativeSelectClass} {...p} {...register("province")}>
            <option value="">{t("Select a province")}</option>
            {PROVINCES.map((d) => (
              <option key={d} value={d}>
                {t(d)}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  );
}

export function TaxProfileFields({ form, nicMasked }: { form: Form; nicMasked?: string }) {
  const t = useT();
  const { register } = form;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("Taxpayer Identification Number (TIN)")} error={errorOf(form, "tin")} optional hint={t("Nine digits. Add it later if you do not have it to hand.")}>
        {(p) => <Input inputMode="numeric" maxLength={9} className="tabular" {...p} {...register("tin")} />}
      </Field>
      <Field
        label={t("NIC or passport number")}
        error={errorOf(form, "nic")}
        optional
        hint={nicMasked ? t("On file: {value}. Leave blank to keep it.", { value: nicMasked }) : t("Only if you want it on your reports. Stored encrypted.")}
      >
        {(p) => <Input autoComplete="off" {...p} {...register("nic")} />}
      </Field>
      <Field label={t("Tax residency")} error={errorOf(form, "residencyStatus")} hint={t("Resident: you live in Sri Lanka or are here 183 days or more in a 12-month period.")}>
        {(p) => (
          <select className={nativeSelectClass} {...p} {...register("residencyStatus")}>
            <option value="RESIDENT">{t("Resident in Sri Lanka")}</option>
            <option value="NON_RESIDENT_CITIZEN">{t("Non-resident, citizen of Sri Lanka")}</option>
            <option value="NON_RESIDENT">{t("Non-resident, not a citizen")}</option>
          </select>
        )}
      </Field>
      <Field label={t("Employment status")} error={errorOf(form, "employmentStatus")}>
        {(p) => (
          <select className={nativeSelectClass} {...p} {...register("employmentStatus")}>
            <option value="EMPLOYED">{t("Employed")}</option>
            <option value="SELF_EMPLOYED">{t("Self-employed / business")}</option>
            <option value="BOTH">{t("Employed and self-employed")}</option>
            <option value="RETIRED">{t("Retired")}</option>
            <option value="NOT_EMPLOYED">{t("Not employed")}</option>
          </select>
        )}
      </Field>
    </div>
  );
}

export function IncomeTypeFields({ form }: { form: Form }) {
  const t = useT();
  const selected = (form.watch("incomeTypes") as string[] | undefined) ?? [];
  const error = errorOf(form, "incomeTypes");
  const toggle = (type: string) =>
    form.setValue("incomeTypes", selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type], { shouldValidate: form.formState.isSubmitted });
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{t("What types of income do you receive?")}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {INCOME_TYPES.map((type) => {
          const checked = selected.includes(type);
          return (
            <label
              key={type}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked ? "border-primary/50 bg-accent text-accent-foreground" : "hover:bg-muted/60",
              )}
            >
              <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={() => toggle(type)} />
              {t(INCOME_TYPE_LABELS[type])}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
