"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { run } from "@/lib/action";
import { authenticate, getSessionUser } from "@/lib/auth/session";
import { AppError, type ActionResult } from "@/lib/errors";
import { changePasswordSchema, deleteAccountSchema, totpCodeSchema } from "@/lib/validation/auth";
import { uuid } from "@/lib/validation/common";
import { INCOME_TYPES, onboardingSchema, profileSchema, taxProfileSchema } from "@/lib/validation/records";
import * as account from "@/services/account/account-service";
import * as auth from "@/services/auth/auth-service";

export async function completeOnboardingAction(input: unknown): Promise<ActionResult> {
  const result = await run(async () => {
    // Onboarding is the one place a signed-in user without a completed profile may write.
    const user = await getSessionUser();
    if (!user || !user.twoFactorOk) throw new AppError("Please sign in to continue.", 401);
    await account.completeOnboarding(user.id, onboardingSchema.parse(input));
  }, "We couldn't save your details. Please try again.");
  if (result.ok) redirect("/dashboard?welcome=1");
  return result;
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await account.updateProfile(user.id, profileSchema.parse(input));
      revalidatePath("/", "layout");
    },
    "We couldn't save your profile. Please try again.",
    "Profile saved.",
  );
}

const taxProfileUpdateSchema = taxProfileSchema.extend({ incomeTypes: z.array(z.enum(INCOME_TYPES)).min(1, "Choose at least one type of income") });

export async function updateTaxProfileAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await account.updateTaxProfile(user.id, taxProfileUpdateSchema.parse(input));
      revalidatePath("/", "layout");
    },
    "We couldn't save your tax profile. Please try again.",
    "Tax profile saved.",
  );
}

export async function updateRemindersAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await account.updateReminderPreferences(user.id, z.object({ emailReminders: z.boolean(), inAppReminders: z.boolean() }).parse(input));
      revalidatePath("/settings");
    },
    "We couldn't save your preferences. Please try again.",
    "Reminder preferences saved.",
  );
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      const data = changePasswordSchema.parse(input);
      await auth.changePassword(user, data.currentPassword, data.newPassword);
    },
    "We couldn't change your password. Please try again.",
    "Password changed. Other devices have been signed out.",
  );
}

export async function beginTwoFactorAction(): Promise<ActionResult<{ secret: string; qrDataUrl: string }>> {
  return run(async () => {
    const user = await authenticate();
    const { secret, uri } = await auth.beginTwoFactorSetup(user);
    return { secret, qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
  }, "We couldn't start two-factor setup. Please try again.");
}

export async function enableTwoFactorAction(input: unknown): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  return run(async () => {
    const user = await authenticate();
    const recoveryCodes = await auth.enableTwoFactor(user, totpCodeSchema.parse(input).code);
    revalidatePath("/settings");
    return { recoveryCodes };
  }, "We couldn't enable two-factor authentication. Please try again.");
}

export async function disableTwoFactorAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await auth.disableTwoFactor(user, z.object({ password: z.string().min(1).max(200) }).parse(input).password);
      revalidatePath("/settings");
    },
    "We couldn't disable two-factor authentication. Please try again.",
    "Two-factor authentication disabled.",
  );
}

export async function revokeSessionAction(id: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await auth.revokeSession(user, uuid.parse(id));
      revalidatePath("/settings");
    },
    "We couldn't sign that device out. Please try again.",
    "Device signed out.",
  );
}

export async function revokeOtherSessionsAction(): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      await auth.revokeOtherSessions(user);
      revalidatePath("/settings");
    },
    "We couldn't sign the other devices out. Please try again.",
    "All other devices signed out.",
  );
}

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  const result = await run(async () => {
    const user = await authenticate();
    await account.deleteAccount(user.id, deleteAccountSchema.parse(input).password);
  }, "We couldn't delete your account. Please try again.");
  if (result.ok) redirect("/?deleted=1");
  return result;
}
