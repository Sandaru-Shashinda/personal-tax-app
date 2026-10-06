"use server";

import { redirect } from "next/navigation";
import { run } from "@/lib/action";
import { getSessionUser } from "@/lib/auth/session";
import { AppError, type ActionResult } from "@/lib/errors";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, totpCodeSchema } from "@/lib/validation/auth";
import * as auth from "@/services/auth/auth-service";

export async function registerAction(input: unknown): Promise<ActionResult> {
  const result = await run(async () => {
    await auth.register(registerSchema.parse(input));
  }, "We couldn't create your account. Please try again.");
  if (result.ok) redirect("/onboarding");
  return result;
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  const result = await run(() => auth.login(loginSchema.parse(input)), "We couldn't sign you in. Please try again.");
  if (!result.ok) return result;
  redirect(result.data.twoFactorRequired ? "/login/two-factor" : "/dashboard");
}

export async function twoFactorAction(input: unknown): Promise<ActionResult> {
  const result = await run(async () => {
    const user = await getSessionUser();
    if (!user) throw new AppError("Your sign-in has expired. Please start again.", 401);
    await auth.completeTwoFactor(user, totpCodeSchema.parse(input).code);
  }, "We couldn't verify that code. Please try again.");
  if (result.ok) redirect("/dashboard");
  return result;
}

export async function logoutAction(): Promise<void> {
  await auth.logout(await getSessionUser());
  redirect("/login");
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      await auth.requestPasswordReset(forgotPasswordSchema.parse(input).email);
    },
    "We couldn't process that request. Please try again.",
    "If that address has an account, a reset link is on its way.",
  );
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const result = await run(async () => {
    const data = resetPasswordSchema.parse(input);
    await auth.resetPassword(data.token, data.password);
  }, "We couldn't reset your password. Please try again.");
  if (result.ok) redirect("/login?reset=1");
  return result;
}

export async function resendVerificationAction(): Promise<ActionResult> {
  return run(
    async () => {
      const user = await getSessionUser();
      if (!user) throw new AppError("Please sign in to continue.", 401);
      await auth.resendVerification(user);
    },
    "We couldn't send the e-mail. Please try again.",
    "Verification e-mail sent.",
  );
}
