"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction, twoFactorAction } from "@/app/actions/auth";
import { applyActionResult, Field, FormError } from "@/components/shared/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, totpCodeSchema } from "@/lib/validation/auth";

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

export function LoginForm({ demo }: { demo?: { email: string; password: string } }) {
  const t = useT();
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;
  const submit = form.handleSubmit(async (values) => {
    applyActionResult(form, await loginAction(values));
  });
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormError message={errors.root?.message} />
      <Field label={t("E-mail address")} error={errors.email?.message}>
        {(p) => <Input type="email" autoComplete="email" autoFocus {...p} {...form.register("email")} />}
      </Field>
      <Field label={t("Password")} error={errors.password?.message}>
        {(p) => <Input type="password" autoComplete="current-password" {...p} {...form.register("password")} />}
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
          {t("Forgot your password?")}
        </Link>
      </div>
      <Submit pending={isSubmitting}>{t("Sign in")}</Submit>
      {demo && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
          onClick={() => {
            form.setValue("email", demo.email);
            form.setValue("password", demo.password);
            void submit();
          }}
        >
          {t("Explore the demo account")}
        </Button>
      )}
    </form>
  );
}

export function RegisterForm() {
  const t = useT();
  const form = useForm<z.input<typeof registerSchema>, unknown, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", acceptTerms: false as unknown as true },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={form.handleSubmit(async (values) => void applyActionResult(form, await registerAction(values)))} className="space-y-4" noValidate>
      <FormError message={errors.root?.message} />
      <Field label={t("Full name")} error={errors.fullName?.message}>
        {(p) => <Input autoComplete="name" autoFocus {...p} {...form.register("fullName")} />}
      </Field>
      <Field label={t("E-mail address")} error={errors.email?.message}>
        {(p) => <Input type="email" autoComplete="email" {...p} {...form.register("email")} />}
      </Field>
      <Field label={t("Password")} error={errors.password?.message} hint={t("At least 10 characters, with a letter and a number.")}>
        {(p) => <Input type="password" autoComplete="new-password" {...p} {...form.register("password")} />}
      </Field>
      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-sm leading-snug">
          <Checkbox
            className="mt-0.5"
            checked={Boolean(form.watch("acceptTerms"))}
            onCheckedChange={(checked) => form.setValue("acceptTerms", (checked === true) as true, { shouldValidate: true })}
            aria-invalid={Boolean(errors.acceptTerms)}
          />
          <span className="text-muted-foreground">
            {t("I understand Ayakara provides estimates and record-keeping tools, not professional tax advice, and does not file returns with the Inland Revenue Department.")}
          </span>
        </label>
        {errors.acceptTerms && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {t(errors.acceptTerms.message ?? "")}
          </p>
        )}
      </div>
      <Submit pending={isSubmitting}>{t("Create account")}</Submit>
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;
  if (sent) {
    return (
      <p role="status" className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
        {t("If that address has an account, a reset link is on its way. The link is valid for 60 minutes.")}
      </p>
    );
  }
  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        const result = await forgotPasswordAction(values);
        if (result.ok) setSent(true);
        else applyActionResult(form, result);
      })}
      className="space-y-4"
      noValidate
    >
      <FormError message={errors.root?.message} />
      <Field label={t("E-mail address")} error={errors.email?.message}>
        {(p) => <Input type="email" autoComplete="email" autoFocus {...p} {...form.register("email")} />}
      </Field>
      <Submit pending={isSubmitting}>{t("Send reset link")}</Submit>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const form = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: "" } });
  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={form.handleSubmit(async (values) => void applyActionResult(form, await resetPasswordAction(values)))} className="space-y-4" noValidate>
      <FormError message={errors.root?.message ?? errors.token?.message} />
      <Field label={t("New password")} error={errors.password?.message} hint={t("At least 10 characters, with a letter and a number.")}>
        {(p) => <Input type="password" autoComplete="new-password" autoFocus {...p} {...form.register("password")} />}
      </Field>
      <Submit pending={isSubmitting}>{t("Set new password")}</Submit>
    </form>
  );
}

export function TwoFactorForm() {
  const t = useT();
  const form = useForm<z.infer<typeof totpCodeSchema>>({ resolver: zodResolver(totpCodeSchema), defaultValues: { code: "" } });
  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={form.handleSubmit(async (values) => void applyActionResult(form, await twoFactorAction(values)))} className="space-y-4" noValidate>
      <FormError message={errors.root?.message} />
      <Field label={t("Authentication code")} error={errors.code?.message} hint={t("The 6-digit code from your authenticator app, or one of your recovery codes.")}>
        {(p) => <Input inputMode="numeric" autoComplete="one-time-code" autoFocus className="tabular tracking-widest" {...p} {...form.register("code")} />}
      </Field>
      <Submit pending={isSubmitting}>{t("Verify")}</Submit>
    </form>
  );
}
