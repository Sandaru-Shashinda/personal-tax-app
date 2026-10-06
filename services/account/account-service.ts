import "server-only";
import type { z } from "zod";
import { audit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { destroyCurrentSession } from "@/lib/auth/session";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseISODate, toISODate } from "@/lib/format";
import { storage } from "@/lib/storage";
import type { OnboardingInput, profileSchema, taxProfileSchema } from "@/lib/validation/records";

function maskNic(nic: string): string {
  return nic.length <= 4 ? "••••" : `${"•".repeat(nic.length - 4)}${nic.slice(-4)}`;
}

export async function getAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true, taxpayer: true } });
  const { profile, taxpayer } = user;
  return {
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt.toISOString(),
    profile: {
      fullName: profile?.fullName ?? "",
      dateOfBirth: profile?.dateOfBirth ? toISODate(profile.dateOfBirth) : "",
      phone: profile?.phone ?? "",
      addressLine1: profile?.addressLine1 ?? "",
      addressLine2: profile?.addressLine2 ?? "",
      city: profile?.city ?? "",
      district: profile?.district ?? "",
      province: profile?.province ?? "",
      postalCode: profile?.postalCode ?? "",
      emailReminders: profile?.emailReminders ?? true,
      inAppReminders: profile?.inAppReminders ?? true,
    },
    taxpayer: {
      tin: taxpayer?.tin ?? "",
      // The NIC is never sent back in full once stored.
      nicMasked: taxpayer?.nicEncrypted ? maskNic(decrypt(taxpayer.nicEncrypted)) : "",
      residencyStatus: taxpayer?.residencyStatus ?? "RESIDENT",
      employmentStatus: taxpayer?.employmentStatus ?? "EMPLOYED",
      incomeTypes: taxpayer?.incomeTypes ?? [],
    },
  };
}

function profileData(input: z.infer<typeof profileSchema>) {
  return {
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth ? parseISODate(input.dateOfBirth) : null,
    phone: input.phone ?? null,
    addressLine1: input.addressLine1 ?? null,
    addressLine2: input.addressLine2 ?? null,
    city: input.city ?? null,
    district: input.district ?? null,
    province: input.province ?? null,
    postalCode: input.postalCode ?? null,
  };
}

function taxpayerData(input: z.infer<typeof taxProfileSchema>) {
  return {
    tin: input.tin ?? null,
    residencyStatus: input.residencyStatus,
    employmentStatus: input.employmentStatus,
    // Left untouched when the field is blank, so editing other details does not erase it.
    ...(input.nic ? { nicEncrypted: encrypt(input.nic) } : {}),
  };
}

export async function completeOnboarding(userId: string, input: OnboardingInput): Promise<void> {
  await db.$transaction([
    db.profile.upsert({ where: { userId }, update: profileData(input), create: { userId, ...profileData(input) } }),
    db.taxpayer.upsert({
      where: { userId },
      update: { ...taxpayerData(input), incomeTypes: input.incomeTypes },
      create: { userId, ...taxpayerData(input), incomeTypes: input.incomeTypes },
    }),
    db.user.update({ where: { id: userId }, data: { onboardingDoneAt: new Date() } }),
  ]);
  await audit({ userId, action: "account.onboarding_completed", after: { incomeTypes: input.incomeTypes, residencyStatus: input.residencyStatus } });
}

export async function updateProfile(userId: string, input: z.infer<typeof profileSchema>): Promise<void> {
  await db.profile.upsert({ where: { userId }, update: profileData(input), create: { userId, ...profileData(input) } });
  await audit({ userId, action: "account.profile_updated" });
}

export async function updateTaxProfile(userId: string, input: z.infer<typeof taxProfileSchema> & { incomeTypes: OnboardingInput["incomeTypes"] }): Promise<void> {
  await db.taxpayer.upsert({
    where: { userId },
    update: { ...taxpayerData(input), incomeTypes: input.incomeTypes },
    create: { userId, ...taxpayerData(input), incomeTypes: input.incomeTypes },
  });
  await audit({ userId, action: "account.tax_profile_updated", after: { residencyStatus: input.residencyStatus, incomeTypes: input.incomeTypes } });
}

export async function updateReminderPreferences(userId: string, prefs: { emailReminders: boolean; inAppReminders: boolean }): Promise<void> {
  await db.profile.update({ where: { userId }, data: prefs });
}

/** Everything the user has entered, as one JSON document. Files are listed, not embedded. */
export async function exportAccountData(userId: string) {
  const [account, sources, entries, expenses, qualifyingPayments, payments, documents, calculations, activity] = await Promise.all([
    getAccount(userId),
    db.incomeSource.findMany({ where: { userId, deletedAt: null } }),
    db.incomeEntry.findMany({ where: { userId, deletedAt: null }, include: { taxYear: { select: { code: true } }, salary: true, business: true, rental: true, investment: true, capitalGain: true } }),
    db.expense.findMany({ where: { userId, deletedAt: null }, include: { taxYear: { select: { code: true } } } }),
    db.qualifyingPayment.findMany({ where: { userId, deletedAt: null }, include: { taxYear: { select: { code: true } } } }),
    db.taxPayment.findMany({ where: { userId, deletedAt: null }, include: { taxYear: { select: { code: true } } } }),
    db.document.findMany({ where: { userId, deletedAt: null }, select: { id: true, title: true, category: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } }),
    db.taxCalculation.findMany({ where: { userId }, select: { id: true, createdAt: true, isLatest: true, result: true, taxYear: { select: { code: true } } } }),
    db.auditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1000, select: { action: true, entity: true, createdAt: true, ipAddress: true } }),
  ]);
  await audit({ userId, action: "account.data_exported" });
  return {
    exportedAt: new Date().toISOString(),
    notice: "Exported from Ayakara. Amounts are in Sri Lankan Rupees unless a currency is shown. Uploaded files are listed here and can be downloaded individually from Documents.",
    account,
    incomeSources: sources,
    incomeEntries: entries,
    expenses,
    qualifyingPayments,
    taxPayments: payments,
    documents,
    calculations,
    activity,
  };
}

export async function listActivity(userId: string, take = 50) {
  const rows = await db.auditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take, select: { id: true, action: true, entity: true, createdAt: true, ipAddress: true, userAgent: true } });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/**
 * Permanently deletes the account: uploaded files first, then the user row, which cascades to
 * every table holding their data. Audit entries survive without a user reference.
 */
export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError("Your password is incorrect.", 422, { password: ["Incorrect password"] });
  }
  const documents = await db.document.findMany({ where: { userId }, select: { storageKey: true } });
  await Promise.all(documents.map((d) => storage().delete(d.storageKey).catch(() => undefined)));
  await audit({ userId, action: "account.deleted", entity: "User", entityId: userId });
  await db.user.delete({ where: { id: userId } });
  await destroyCurrentSession();
}
