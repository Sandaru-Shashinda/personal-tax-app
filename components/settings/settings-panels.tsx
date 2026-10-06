"use client";

import { Loader2, MonitorSmartphone, ShieldCheck, ShieldOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  beginTwoFactorAction,
  changePasswordAction,
  deleteAccountAction,
  disableTwoFactorAction,
  enableTwoFactorAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
  updateProfileAction,
  updateTaxProfileAction,
} from "@/app/actions/account";
import { resendVerificationAction } from "@/app/actions/auth";
import { applyActionResult, Field, fieldError, FormError, submitHandler } from "@/components/shared/form";
import { parseForm } from "@/components/shared/record-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/errors";
import { changePasswordSchema, deleteAccountSchema } from "@/lib/validation/auth";
import { INCOME_TYPES, profileSchema, taxProfileSchema } from "@/lib/validation/records";
import { IncomeTypeFields, PersonalFields, TaxProfileFields } from "./profile-fields";
import { useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";
import { msg, type Translate } from "@/lib/i18n/translate";

function useSimpleForm<S extends z.ZodType>(schema: S, defaultValues: FieldValues, action: (data: z.output<S>) => Promise<ActionResult>, options: { resetOnSuccess?: boolean } = {}) {
  const form = useForm<FieldValues>({ defaultValues });
  const router = useRouter();
  const onSubmit = submitHandler(form, async (values: FieldValues) => {
    const data = parseForm(form, schema, values);
    if (!data) return;
    if (applyActionResult(form, await action(data))) {
      if (options.resetOnSuccess) form.reset();
      router.refresh();
    }
  });
  return { form, onSubmit };
}

function Save({ pending, children }: { pending: boolean; children?: React.ReactNode }) {
  const t = useT();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children ?? t("Save changes")}
    </Button>
  );
}

export function ProfilePanel({ profile }: { profile: FieldValues }) {
  const { form, onSubmit } = useSimpleForm(profileSchema, profile, updateProfileAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={form.formState.errors.root?.message} />
      <PersonalFields form={form} />
      <Save pending={form.formState.isSubmitting} />
    </form>
  );
}

const taxProfileFormSchema = taxProfileSchema.extend({ incomeTypes: z.array(z.enum(INCOME_TYPES)).min(1, msg("Choose at least one type of income")) });

export function TaxProfilePanel({ taxpayer }: { taxpayer: { tin: string; nicMasked: string; residencyStatus: string; employmentStatus: string; incomeTypes: string[] } }) {
  const { form, onSubmit } = useSimpleForm(taxProfileFormSchema, { ...taxpayer, nic: "" }, updateTaxProfileAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormError message={form.formState.errors.root?.message} />
      <TaxProfileFields form={form} nicMasked={taxpayer.nicMasked} />
      <IncomeTypeFields form={form} />
      <Save pending={form.formState.isSubmitting} />
    </form>
  );
}

export function VerifyEmailNotice({ email }: { email: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        {rich(t("<b>Confirm your e-mail address.</b> We sent a link to {email}. E-mail reminders start once it is confirmed.", { email }), { b: (text) => <span className="font-medium">{text}</span> })}
      </p>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await resendVerificationAction();
            if (result.ok) toast.success(result.message ?? t("Sent."));
            else toast.error(result.error);
          })
        }
      >
        {t("Send again")}
      </Button>
    </div>
  );
}

export function PasswordPanel() {
  const t = useT();
  const { form, onSubmit } = useSimpleForm(changePasswordSchema, { currentPassword: "", newPassword: "" }, changePasswordAction, { resetOnSuccess: true });
  const err = (name: string) => fieldError(form.formState.errors as Record<string, unknown>, name);
  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4" noValidate>
      <FormError message={form.formState.errors.root?.message} />
      <Field label={t("Current password")} error={err("currentPassword")}>
        {(p) => <Input type="password" autoComplete="current-password" {...p} {...form.register("currentPassword")} />}
      </Field>
      <Field label={t("New password")} error={err("newPassword")} hint={t("At least 10 characters, with a letter and a number.")}>
        {(p) => <Input type="password" autoComplete="new-password" {...p} {...form.register("newPassword")} />}
      </Field>
      <Save pending={form.formState.isSubmitting}>{t("Change password")}</Save>
    </form>
  );
}

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const t = useT();
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (codes) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{t("Two-factor authentication is on. Save these recovery codes.")}</p>
        <p className="text-sm text-muted-foreground">{t("Each code works once if you lose your authenticator. They will not be shown again.")}</p>
        <ul className="tabular grid max-w-sm grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-4 font-mono text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button onClick={() => (setCodes(null), router.refresh())}>{t("I have saved them")}</Button>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-success" aria-hidden /> {t("Two-factor authentication is on")}
        </p>
        <form
          className="max-w-sm space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await disableTwoFactorAction({ password });
              if (result.ok) {
                toast.success(result.message ?? t("Disabled."));
                setPassword("");
                setError(null);
                router.refresh();
              } else setError(result.error);
            });
          }}
        >
          <FormError message={error} />
          <Field label={t("Password")} hint={t("Enter your password to turn two-factor authentication off.")}>
            {(p) => <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} {...p} />}
          </Field>
          <Button type="submit" variant="destructive" disabled={pending || !password}>
            <ShieldOff aria-hidden /> {t("Turn off")}
          </Button>
        </form>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("Add a second step at sign-in using an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password.")}</p>
        <FormError message={error} />
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await beginTwoFactorAction();
              if (result.ok) setSetup(result.data);
              else setError(result.error);
            })
          }
        >
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {t("Set up two-factor authentication")}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await enableTwoFactorAction({ code });
          if (result.ok) {
            setCodes(result.data.recoveryCodes);
            setSetup(null);
            setCode("");
            setError(null);
          } else setError(result.error);
        });
      }}
    >
      <p className="text-sm">{t("Scan this code with your authenticator app, then enter the 6-digit code it shows.")}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Image src={setup.qrDataUrl} alt={t("QR code for your authenticator app")} width={176} height={176} unoptimized className="rounded-xl border bg-white p-2" />
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">{t("Can't scan? Enter this key manually:")}</p>
          <p className="tabular font-mono break-all">{setup.secret}</p>
        </div>
      </div>
      <FormError message={error} />
      <div className="max-w-xs">
        <Field label={t("Authentication code")}>
          {(p) => <Input inputMode="numeric" autoComplete="one-time-code" className="tabular tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} {...p} />}
        </Field>
      </div>
      <Button type="submit" disabled={pending || code.trim().length < 6}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {t("Turn on")}
      </Button>
    </form>
  );
}

interface SessionRow {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  isCurrent: boolean;
}

function describeAgent(userAgent: string | null, t: Translate): string {
  if (!userAgent) return t("Unknown device");
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const os = /Windows/.test(userAgent) ? "Windows" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Mac OS/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "";
  return os ? t("{browser} on {os}", { browser, os }) : browser;
}

export function SessionsPanel({ sessions }: { sessions: SessionRow[] }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const act = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) toast.success(result.message ?? t("Done."));
      else toast.error(result.error);
      router.refresh();
    });
  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-xl border">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center gap-3 px-4 py-3">
            <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {describeAgent(session.userAgent, t)}
                {session.isCurrent && <Badge variant="secondary">{t("This device")}</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Last active {time}", { time: new Date(session.lastSeenAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) })}
                {session.ipAddress && ` · ${session.ipAddress}`}
              </p>
            </div>
            {!session.isCurrent && (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => act(() => revokeSessionAction(session.id))}>
                {t("Sign out")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {sessions.length > 1 && (
        <Button variant="outline" disabled={pending} onClick={() => act(revokeOtherSessionsAction)}>
          {t("Sign out of all other devices")}
        </Button>
      )}
    </div>
  );
}

export function DeleteAccountPanel() {
  const t = useT();
  const form = useForm<FieldValues>({ defaultValues: { password: "", confirm: "" } });
  const err = (name: string) => fieldError(form.formState.errors as Record<string, unknown>, name);
  return (
    <Dialog onOpenChange={() => form.reset()}>
      <DialogTrigger asChild>
        <Button variant="destructive">{t("Delete my account")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Delete your account?")}</DialogTitle>
          <DialogDescription>
            {t("This permanently deletes your profile, income, expenses, payments, calculations and every uploaded document. It cannot be undone. Export your data first if you want a copy.")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={submitHandler(form, async (values: FieldValues) => {
            const data = parseForm(form, deleteAccountSchema, values);
            if (data) applyActionResult(form, await deleteAccountAction(data));
          })}
        >
          <FormError message={form.formState.errors.root?.message} />
          <Field label={t("Password")} error={err("password")}>
            {(p) => <Input type="password" autoComplete="current-password" {...p} {...form.register("password")} />}
          </Field>
          <Field label={t("Type DELETE to confirm")} error={err("confirm")}>
            {(p) => <Input autoComplete="off" {...p} {...form.register("confirm")} />}
          </Field>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              {t("Permanently delete")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
