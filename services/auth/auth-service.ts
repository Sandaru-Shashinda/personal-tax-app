import "server-only";
import { audit } from "@/lib/audit";
import { getT } from "@/lib/i18n/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroyCurrentSession, requestMeta, type CurrentUser } from "@/lib/auth/session";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/auth/totp";
import { decrypt, encrypt, randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { emailProvider } from "@/lib/email";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";

const VERIFY_HOURS = 48;
const RESET_MINUTES = 60;
const MAX_FAILED_LOGINS = 10;
const LOCK_MINUTES = 15;
const RECOVERY_CODE_COUNT = 8;

// A real hash to compare against when the account does not exist, so response time does not
// reveal whether an e-mail address is registered.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken()));

async function clientKey(): Promise<string> {
  return (await requestMeta()).ipAddress ?? "unknown";
}

async function issueToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET", ttlMs: number): Promise<string> {
  const token = randomToken();
  await db.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await db.authToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) } });
  return token;
}

async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = await issueToken(userId, "EMAIL_VERIFICATION", VERIFY_HOURS * 3_600_000);
  const t = await getT();
  await emailProvider().send({
    to: email,
    subject: t("Confirm your e-mail address"),
    text: [
      t("Welcome to Ayakara."),
      "",
      t("Confirm your e-mail address by opening this link (valid for {hours} hours):", { hours: VERIFY_HOURS }),
      `${env().APP_URL}/verify-email?token=${token}`,
      "",
      t("If you did not create an account, you can ignore this message."),
    ].join("\n"),
  });
}

export async function register(input: RegisterInput): Promise<void> {
  await rateLimit("register", await clientKey());
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    // Same outcome as success, so the form cannot be used to discover registered addresses.
    if (!existing.deletedAt) {
      const t = await getT();
      await emailProvider().send({
        to: input.email,
        subject: t("You already have an Ayakara account"),
        text: t("Someone tried to register with this address. If it was you, sign in at {url} or reset your password.", { url: `${env().APP_URL}/login` }),
      });
    }
    throw new AppError("We couldn't create an account with those details. If you already have one, try signing in.", 409);
  }
  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      profile: { create: { fullName: input.fullName } },
      taxpayer: { create: {} },
    },
  });
  await sendVerificationEmail(user.id, user.email);
  await createSession(user.id, true);
  await audit({ userId: user.id, action: "auth.register", entity: "User", entityId: user.id });
}

export async function login(input: LoginInput): Promise<{ twoFactorRequired: boolean }> {
  await rateLimit("login", `${await clientKey()}:${input.email}`);
  const user = await db.user.findUnique({ where: { email: input.email } });
  const generic = new AppError("That e-mail address or password is incorrect.", 401);

  if (!user || user.deletedAt) {
    await verifyPassword(await getDummyHash(), input.password);
    throw generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError("This account is temporarily locked after too many attempts. Try again in a few minutes.", 429);
  }
  if (!(await verifyPassword(user.passwordHash, input.password))) {
    const failed = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data: failed >= MAX_FAILED_LOGINS
        ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
        : { failedLoginCount: failed },
    });
    await audit({ userId: user.id, action: "auth.login_failed", entity: "User", entityId: user.id });
    throw generic;
  }
  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  await createSession(user.id, !user.twoFactorEnabled);
  await audit({ userId: user.id, action: "auth.login", entity: "User", entityId: user.id });
  return { twoFactorRequired: user.twoFactorEnabled };
}

export async function logout(user: CurrentUser | null): Promise<void> {
  await destroyCurrentSession();
  if (user) await audit({ userId: user.id, action: "auth.logout", entity: "User", entityId: user.id });
}

/** Second step of sign-in for 2FA users: a TOTP code or a one-time recovery code. */
export async function completeTwoFactor(user: CurrentUser, code: string): Promise<void> {
  await rateLimit("twoFactor", user.id);
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!record.twoFactorEnabled || !record.twoFactorSecret) throw new AppError("Two-factor authentication is not enabled.");

  let ok = verifyTotp(decrypt(record.twoFactorSecret), code);
  if (!ok) {
    const hash = sha256(code.trim().toLowerCase());
    const recovery = await db.recoveryCode.findFirst({ where: { userId: user.id, codeHash: hash, usedAt: null } });
    if (recovery) {
      await db.recoveryCode.update({ where: { id: recovery.id }, data: { usedAt: new Date() } });
      ok = true;
    }
  }
  if (!ok) {
    await audit({ userId: user.id, action: "auth.two_factor_failed" });
    throw new AppError("That code is not valid. Check your authenticator app and try again.", 401);
  }
  await db.session.update({ where: { id: user.sessionId }, data: { twoFactorOk: true } });
  await audit({ userId: user.id, action: "auth.two_factor_ok" });
}

export async function resendVerification(user: CurrentUser): Promise<void> {
  if (user.emailVerified) return;
  await rateLimit("passwordReset", `verify:${user.id}`);
  await sendVerificationEmail(user.id, user.email);
}

export async function verifyEmail(token: string): Promise<boolean> {
  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "EMAIL_VERIFICATION" || record.usedAt || record.expiresAt < new Date()) return false;
  await db.$transaction([
    db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  await audit({ userId: record.userId, action: "auth.email_verified" });
  return true;
}

/** Always resolves the same way, whether or not the address is registered. */
export async function requestPasswordReset(email: string): Promise<void> {
  await rateLimit("passwordReset", `${await clientKey()}:${email}`);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) return;
  const token = await issueToken(user.id, "PASSWORD_RESET", RESET_MINUTES * 60_000);
  const t = await getT();
  await emailProvider().send({
    to: user.email,
    subject: t("Reset your Ayakara password"),
    text: [
      t("Open this link to choose a new password (valid for {minutes} minutes):", { minutes: RESET_MINUTES }),
      `${env().APP_URL}/reset-password?token=${token}`,
      "",
      t("If you did not ask for this, you can ignore this message; your password has not changed."),
    ].join("\n"),
  });
  await audit({ userId: user.id, action: "auth.password_reset_requested" });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("This reset link is no longer valid. Request a new one.");
  }
  await db.$transaction([
    db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword), failedLoginCount: 0, lockedUntil: null },
    }),
    // A reset signs every device out.
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await audit({ userId: record.userId, action: "auth.password_reset" });
}

export async function changePassword(user: CurrentUser, currentPassword: string, newPassword: string): Promise<void> {
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(record.passwordHash, currentPassword))) {
    throw new AppError("Your current password is incorrect.", 422, { currentPassword: ["Incorrect password"] });
  }
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } }),
    db.session.deleteMany({ where: { userId: user.id, id: { not: user.sessionId } } }),
  ]);
  await audit({ userId: user.id, action: "auth.password_changed" });
}

// ── Two-factor authentication

export async function beginTwoFactorSetup(user: CurrentUser): Promise<{ secret: string; uri: string }> {
  const secret = generateTotpSecret();
  // Stored encrypted but not yet enabled; enabling requires proving possession of the secret.
  await db.user.update({ where: { id: user.id }, data: { twoFactorSecret: encrypt(secret), twoFactorEnabled: false } });
  return { secret, uri: totpUri(secret, user.email) };
}

export async function enableTwoFactor(user: CurrentUser, code: string): Promise<string[]> {
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!record.twoFactorSecret) throw new AppError("Start two-factor setup first.");
  if (!verifyTotp(decrypt(record.twoFactorSecret), code)) {
    throw new AppError("That code is not valid. Check your authenticator app and try again.", 422);
  }
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => randomToken(6).toLowerCase());
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } }),
    db.session.update({ where: { id: user.sessionId }, data: { twoFactorOk: true } }),
    db.recoveryCode.deleteMany({ where: { userId: user.id } }),
    db.recoveryCode.createMany({ data: codes.map((c) => ({ userId: user.id, codeHash: sha256(c) })) }),
  ]);
  await audit({ userId: user.id, action: "auth.two_factor_enabled" });
  return codes;
}

export async function disableTwoFactor(user: CurrentUser, password: string): Promise<void> {
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(record.passwordHash, password))) throw new AppError("Your password is incorrect.", 422);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } }),
    db.recoveryCode.deleteMany({ where: { userId: user.id } }),
  ]);
  await audit({ userId: user.id, action: "auth.two_factor_disabled" });
}

// ── Sessions

export async function listSessions(user: CurrentUser) {
  const sessions = await db.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastSeenAt: true },
  });
  return sessions.map((s) => ({ ...s, isCurrent: s.id === user.sessionId }));
}

export async function revokeSession(user: CurrentUser, sessionId: string): Promise<void> {
  // The userId predicate is the ownership check.
  const { count } = await db.session.deleteMany({ where: { id: sessionId, userId: user.id } });
  if (count === 0) throw new AppError("We couldn't find that session.", 404);
  await audit({ userId: user.id, action: "auth.session_revoked", entity: "Session", entityId: sessionId });
}

export async function revokeOtherSessions(user: CurrentUser): Promise<void> {
  await db.session.deleteMany({ where: { userId: user.id, id: { not: user.sessionId } } });
  await audit({ userId: user.id, action: "auth.sessions_revoked" });
}
