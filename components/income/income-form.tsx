"use client";

import { Pencil, Plus } from "lucide-react";
import { useForm, type FieldValues } from "react-hook-form";
import { saveIncomeAction } from "@/app/actions/records";
import { Field, fieldError, nativeSelectClass } from "@/components/shared/form";
import { RecordDialog } from "@/components/shared/record-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatLKR } from "@/lib/format";
import { INCOME_TYPE_LABELS, incomeEntrySchema, type IncomeTypeValue } from "@/lib/validation/records";
import type { IncomeEntryDTO } from "@/services/records/income-service";
import { useT } from "@/lib/i18n/client";

const SELECTABLE: IncomeTypeValue[] = ["SALARY", "FREELANCE", "BUSINESS", "PROFESSIONAL", "RENTAL", "INTEREST", "DIVIDEND", "INVESTMENT_OTHER", "CAPITAL_GAIN", "FOREIGN", "OTHER"];
const BUSINESS_TYPES = ["FREELANCE", "BUSINESS", "PROFESSIONAL"];
const INVESTMENT_TYPES = ["INTEREST", "DIVIDEND", "INVESTMENT_OTHER"];

function defaults(entry: IncomeEntryDTO | undefined, taxYearStart: string, preferred: IncomeTypeValue): FieldValues {
  const months = entry?.salary?.months ?? entry?.rental?.months ?? 1;
  const perPeriod = (total: number) => (entry?.period === "MONTHLY" && months > 0 ? Math.round((total / months) * 100) / 100 : total);
  return {
    type: entry?.type ?? preferred,
    sourceName: entry?.sourceName ?? "",
    receivedOn: entry?.receivedOn ?? taxYearStart,
    description: entry?.description ?? "",
    withholdingTax: entry ? perPeriod(entry.capitalGain ? entry.capitalGain.taxPaid : entry.withholdingTax) : "",
    grossAmount: entry ? perPeriod(entry.grossAmount) : "",
    currency: entry?.currency ?? "LKR",
    originalAmount: entry?.originalAmount ?? "",
    exchangeRate: entry?.exchangeRate ?? "",
    exchangeRateSource: entry?.exchangeRateSource ?? "",
    exchangeRateDate: entry?.exchangeRateDate ?? "",
    isForeignSource: entry?.isForeignSource ?? false,
    remittedViaBank: entry?.remittedViaBank ?? false,
    foreignTaxPaid: entry?.foreignTaxPaid || "",
    // Salary
    period: entry?.period === "ANNUAL" ? "ANNUAL" : "MONTHLY",
    months: entry?.salary?.months ?? entry?.rental?.months ?? (entry ? 1 : 12),
    isPrimaryEmployment: entry?.isPrimaryEmployment ?? true,
    basicSalary: entry?.salary?.basicSalary ?? "",
    allowances: entry?.salary?.allowances || "",
    bonuses: entry?.salary?.bonuses || "",
    overtime: entry?.salary?.overtime || "",
    benefits: entry?.salary?.benefits || "",
    otherEmployment: entry?.salary?.otherEmployment || "",
    terminalBenefits: entry?.salary?.terminalBenefits || "",
    epfEmployee: entry?.salary?.epfEmployee || "",
    otherDeductions: entry?.salary?.otherDeductions || "",
    // Business
    clientName: entry?.business?.clientName ?? "",
    invoiceNumber: entry?.business?.invoiceNumber ?? "",
    isServiceExport: entry?.business?.isServiceExport ?? false,
    isSpecialRateBusiness: entry?.business?.isSpecialRateBusiness ?? false,
    // Rental
    propertyName: entry?.rental?.propertyName ?? "",
    tenantName: entry?.rental?.tenantName ?? "",
    // Investment
    institution: entry?.institution ?? "",
    accountRef: entry?.investment?.accountRef ?? "",
    dividendFromResidentCompany: entry?.investment ? entry.investment.kind !== "DIVIDEND_OTHER" : true,
    isExempt: entry?.investment?.isExempt ?? false,
    exemptReason: entry?.investment?.exemptReason ?? "",
    // Capital gain
    assetName: entry?.capitalGain?.assetName ?? "",
    acquiredOn: entry?.capitalGain?.acquiredOn ?? "",
    acquisitionCost: entry?.capitalGain?.acquisitionCost ?? "",
    disposalValue: entry?.capitalGain?.disposalValue ?? "",
    allowableCosts: entry?.capitalGain?.allowableCosts || "",
    exemption: entry?.capitalGain?.exemption ?? "NONE",
  };
}

interface IncomeFormProps {
  taxYear: { code: string; startsOn: string; endsOn: string };
  sources: { id: string; name: string; type: string }[];
  entry?: IncomeEntryDTO;
  preferredType?: IncomeTypeValue;
  defaultOpen?: boolean;
}

export function IncomeForm({ taxYear, sources, entry, preferredType = "SALARY", defaultOpen }: IncomeFormProps) {
  const t = useT();
  const form = useForm<FieldValues>({ defaultValues: defaults(entry, taxYear.startsOn, preferredType) });
  const { register, watch, formState } = form;
  const errors = formState.errors as Record<string, unknown>;
  const err = (name: string) => fieldError(errors, name);
  const type = watch("type") as IncomeTypeValue;
  const currency = watch("currency") as string;
  const period = watch("period") as string;
  const isSalary = type === "SALARY";
  const isBusiness = BUSINESS_TYPES.includes(type);
  const isInvestment = INVESTMENT_TYPES.includes(type);
  const isGain = type === "CAPITAL_GAIN";
  const isRental = type === "RENTAL";
  const foreign = currency !== "LKR";

  const money = (name: string, label: string, options: { optional?: boolean; hint?: string } = {}) => (
    <Field label={label} error={err(name)} optional={options.optional} hint={options.hint}>
      {(p) => <Input inputMode="decimal" placeholder="0.00" className="tabular" {...p} {...register(name)} />}
    </Field>
  );
  const check = (name: string, label: string, hint?: string) => (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register(name)} />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );

  const gain = isGain ? Number(watch("disposalValue") || 0) - Number(watch("acquisitionCost") || 0) - Number(watch("allowableCosts") || 0) : 0;
  const sourceLabel = isSalary ? t("Employer") : isRental ? t("Property") : isGain ? t("Asset") : isInvestment ? t("Account or holding") : t("Income source");
  const withholdingLabel = isSalary
    ? period === "MONTHLY"
      ? t("APIT deducted per month")
      : t("APIT deducted")
    : isGain
      ? t("Capital gains tax already paid")
      : type === "DIVIDEND"
        ? t("Withholding tax deducted")
        : isRental
          ? t("AIT / WHT deducted per month")
          : t("AIT / WHT deducted");

  return (
    <RecordDialog
      trigger={
        entry ? (
          <Button variant="ghost" size="icon-sm" aria-label={t("Edit {name}", { name: entry.sourceName })}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden /> {t("Add income")}
          </Button>
        )
      }
      title={entry ? t("Edit income") : t("Add income")}
      description={t("Year of assessment {year}. Enter amounts in the period you actually received them.", { year: taxYear.code })}
      form={form}
      schema={incomeEntrySchema}
      prepare={(values) => ({
        ...values,
        taxYear: taxYear.code,
        // The name the user typed identifies the stream; type-specific name fields mirror it.
        employerName: values.sourceName,
        propertyName: values.sourceName,
        assetName: values.sourceName,
        institution: values.institution || values.sourceName,
      })}
      action={(data) => saveIncomeAction(entry?.id ?? null, data)}
      submitLabel={entry ? t("Save changes") : t("Add income")}
      defaultOpen={defaultOpen}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Type of income")} error={err("type")}>
          {(p) => (
            <select className={nativeSelectClass} disabled={Boolean(entry)} {...p} {...register("type")}>
              {SELECTABLE.map((value) => (
                <option key={value} value={value}>
                  {t(INCOME_TYPE_LABELS[value])}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={sourceLabel} error={err("sourceName") ?? err("propertyName") ?? err("assetName")}>
          {(p) => (
            <>
              <Input list="income-sources" autoComplete="off" {...p} {...register("sourceName")} />
              <datalist id="income-sources">
                {sources.filter((s) => s.type === type).map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>

      {isSalary && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("Entered as")} error={err("period")}>
              {(p) => (
                <select className={nativeSelectClass} {...p} {...register("period")}>
                  <option value="MONTHLY">{t("Monthly figures")}</option>
                  <option value="ANNUAL">{t("Annual totals")}</option>
                </select>
              )}
            </Field>
            <Field label={period === "MONTHLY" ? t("First month") : t("Year ending / paid on")} error={err("receivedOn")}>
              {(p) => <Input type="date" min={taxYear.startsOn} max={taxYear.endsOn} {...p} {...register("receivedOn")} />}
            </Field>
            {period === "MONTHLY" && (
              <Field label={t("Number of months")} error={err("months")} hint={t("Months paid at these figures")}>
                {(p) => <Input type="number" min={1} max={12} {...p} {...register("months")} />}
              </Field>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {money("basicSalary", t("Basic salary"))}
            {money("allowances", t("Allowances"), { optional: true })}
            {money("bonuses", t("Bonuses"), { optional: true })}
            {money("overtime", t("Overtime"), { optional: true })}
            {money("benefits", t("Taxable non-cash benefits"), { optional: true, hint: t("As valued on your T.10 certificate") })}
            {money("otherEmployment", t("Other employment income"), { optional: true })}
            {money("withholdingTax", withholdingLabel, { optional: true })}
            {money("epfEmployee", t("Your EPF contribution"), { optional: true, hint: t("Recorded for your reference; not deducted from taxable income") })}
            {money("terminalBenefits", t("Terminal benefits"), { optional: true, hint: t("Gratuity, commuted pension or ETF, total for the year") })}
            {money("otherDeductions", t("Other payroll deductions"), { optional: true })}
          </div>
          {check("isPrimaryEmployment", t("This is my primary employment"))}
        </>
      )}

      {!isSalary && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={isGain ? t("Date of disposal") : isRental ? t("First month") : t("Date received")} error={err("receivedOn")}>
            {(p) => <Input type="date" min={taxYear.startsOn} max={taxYear.endsOn} {...p} {...register("receivedOn")} />}
          </Field>
          {!isGain && money("grossAmount", isRental ? t("Monthly rent") : foreign ? t("Gross amount in LKR") : t("Gross amount"))}
          {isRental && (
            <Field label={t("Number of months")} error={err("months")}>
              {(p) => <Input type="number" min={1} max={12} {...p} {...register("months")} />}
            </Field>
          )}
          {isGain && (
            <>
              <Field label={t("Date acquired")} error={err("acquiredOn")}>
                {(p) => <Input type="date" max={taxYear.endsOn} {...p} {...register("acquiredOn")} />}
              </Field>
              {money("acquisitionCost", t("Acquisition cost"))}
              {money("disposalValue", t("Disposal value"))}
              {money("allowableCosts", t("Allowable costs"), { optional: true, hint: t("Costs of improving or disposing of the asset") })}
              <Field label={t("Exemption")} error={err("exemption")}>
                {(p) => (
                  <select className={nativeSelectClass} {...p} {...register("exemption")}>
                    <option value="NONE">{t("None")}</option>
                    <option value="LISTED_SHARES">{t("Shares listed on a licensed stock exchange")}</option>
                    <option value="PRINCIPAL_RESIDENCE">{t("Principal residence (owned 3 years, lived in 2)")}</option>
                  </select>
                )}
              </Field>
            </>
          )}
          {money("withholdingTax", withholdingLabel, { optional: true })}
          {isBusiness && (
            <>
              <Field label={t("Client or customer")} error={err("clientName")} optional>
                {(p) => <Input {...p} {...register("clientName")} />}
              </Field>
              <Field label={t("Invoice number")} error={err("invoiceNumber")} optional>
                {(p) => <Input {...p} {...register("invoiceNumber")} />}
              </Field>
            </>
          )}
          {isRental && (
            <Field label={t("Tenant")} error={err("tenantName")} optional>
              {(p) => <Input {...p} {...register("tenantName")} />}
            </Field>
          )}
          {isInvestment && (
            <Field label={t("Account reference")} error={err("accountRef")} optional hint={t("Use the last few digits only")}>
              {(p) => <Input {...p} {...register("accountRef")} />}
            </Field>
          )}
        </div>
      )}

      {isGain && (
        <p className="tabular rounded-lg bg-muted px-3 py-2 text-sm" role="status">
          {gain >= 0 ? t("Gain") : t("Loss")}: <span className="font-medium">{formatLKR(Math.abs(gain))}</span>
        </p>
      )}

      {isBusiness && (
        <div className="space-y-2.5">
          {check("isServiceExport", t("This is a service export"), t("Services used outside Sri Lanka, paid in foreign currency."))}
          {check("isSpecialRateBusiness", t("Betting, gaming, liquor or tobacco business"), t("Taxed at the special flat rate."))}
        </div>
      )}
      {type === "DIVIDEND" && check("dividendFromResidentCompany", t("Paid by a company resident in Sri Lanka"), t("Subject to final withholding tax and not taxed again."))}
      {isInvestment && (
        <div className="space-y-2.5">
          {check("isExempt", t("This income is exempt"), t("For example interest on a foreign-currency account approved by the Central Bank."))}
          {Boolean(watch("isExempt")) && (
            <Field label={t("Why it is exempt")} error={err("exemptReason")}>
              {(p) => <Input {...p} {...register("exemptReason")} />}
            </Field>
          )}
        </div>
      )}

      <Field label={t("Description")} error={err("description")} optional>
        {(p) => <Input placeholder={isSalary ? t("e.g. Software Engineer salary") : t("e.g. Invoice INV-014")} {...p} {...register("description")} />}
      </Field>

      {!isGain && (
        <fieldset className="space-y-4 rounded-xl border p-4">
          <legend className="px-1 text-sm font-medium">{t("Foreign income")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Currency received")} error={err("currency")} hint={t("LKR unless you were paid in another currency")}>
              {(p) => <Input maxLength={3} className="uppercase" {...p} {...register("currency", { setValueAs: (v: string) => String(v ?? "").toUpperCase() })} />}
            </Field>
            {foreign && (
              <>
                {money("originalAmount", currency ? t("Amount in {currency}", { currency }) : t("Amount in foreign currency"))}
                <Field label={t("Exchange rate used")} error={err("exchangeRate")} hint={t("LKR per 1 {currency}", { currency })}>
                  {(p) => <Input inputMode="decimal" className="tabular" {...p} {...register("exchangeRate")} />}
                </Field>
                <Field label={t("Where the rate came from")} error={err("exchangeRateSource")} hint={t("e.g. your bank's credit advice")}>
                  {(p) => <Input {...p} {...register("exchangeRateSource")} />}
                </Field>
                <Field label={t("Rate date")} error={err("exchangeRateDate")} optional>
                  {(p) => <Input type="date" {...p} {...register("exchangeRateDate")} />}
                </Field>
                {money("foreignTaxPaid", t("Foreign tax paid, in LKR"), { optional: true })}
              </>
            )}
          </div>
          {foreign && <p className="text-xs text-muted-foreground">{t("Nothing is converted for you: the LKR amount above is what is used, and the original amount and rate are kept alongside it.")}</p>}
          <div className="space-y-2.5">
            {check("isForeignSource", t("This income arose outside Sri Lanka"))}
            {check("remittedViaBank", t("Earned in foreign currency and remitted to Sri Lanka through a bank"), t("Taxed under this year's rule for foreign-currency income; the Tax page shows how."))}
          </div>
        </fieldset>
      )}
    </RecordDialog>
  );
}
