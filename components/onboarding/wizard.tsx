"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { completeOnboardingAction } from "@/app/actions/account";
import { IncomeTypeFields, PersonalFields, TaxProfileFields } from "@/components/settings/profile-fields";
import { applyActionResult, FormError, submitHandler } from "@/components/shared/form";
import { parseForm } from "@/components/shared/record-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/translate";
import { onboardingSchema, profileSchema, taxProfileSchema } from "@/lib/validation/records";

const STEPS = [
  { title: msg("About you"), description: msg("Used on your reports. Only your name is required."), schema: profileSchema },
  { title: msg("Your tax profile"), description: msg("This decides which reliefs and rules apply to you."), schema: taxProfileSchema },
  { title: msg("Your income"), description: msg("We'll set up your workspace around the income you actually have."), schema: null },
] as const;

export function OnboardingWizard({ fullName }: { fullName: string }) {
  const [step, setStep] = useState(0);
  const t = useT();
  const form = useForm<FieldValues>({
    defaultValues: {
      fullName, dateOfBirth: "", phone: "", addressLine1: "", addressLine2: "", city: "", district: "", province: "", postalCode: "",
      tin: "", nic: "", residencyStatus: "RESIDENT", employmentStatus: "EMPLOYED", incomeTypes: [],
    },
  });
  const { isSubmitting, errors } = form.formState;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const stepLabel = t("Step {step} of {total}", { step: step + 1, total: STEPS.length });

  const next = () => {
    form.clearErrors();
    // Each step is checked with its slice of the shared schema before moving on.
    if (current.schema && !parseForm(form, current.schema, form.getValues())) return;
    setStep((s) => s + 1);
  };
  const submit = submitHandler(form, async (values: FieldValues) => {
    const data = parseForm(form, onboardingSchema, values);
    if (data) applyActionResult(form, await completeOnboardingAction(data));
  });

  return (
    <form onSubmit={last ? submit : (event) => (event.preventDefault(), next())} className="space-y-6" noValidate>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium">{stepLabel}</p>
          <p className="text-muted-foreground">{t(current.title)}</p>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label={stepLabel} />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t(current.title)}</h1>
        <p className="text-sm text-muted-foreground">{t(current.description)}</p>
      </div>

      <FormError message={errors.root?.message} />
      {step === 0 && <PersonalFields form={form} />}
      {step === 1 && <TaxProfileFields form={form} />}
      {step === 2 && <IncomeTypeFields form={form} />}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={() => (form.clearErrors(), setStep((s) => s - 1))} disabled={step === 0 || isSubmitting}>
          <ArrowLeft aria-hidden /> {t("Back")}
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {last ? (
            <>
              {t("Finish setup")} <Check aria-hidden />
            </>
          ) : (
            <>
              {t("Continue")} <ArrowRight aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
