import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { generateTotpSecret } from "@/lib/auth/totp";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { deleteAccount, exportAccountData } from "@/services/account/account-service";
import * as auth from "@/services/auth/auth-service";
import { TOTP, Secret } from "otpauth";
import { captureEmail, createUser, freshIp, PASSWORD, removeUsers, tokenFrom, uniqueEmail } from "./helpers";
import { request } from "./setup/env";

const created: string[] = [];
afterEach(() => vi.restoreAllMocks());
afterAll(() => removeUsers(...created));

async function signedIn(label?: string) {
  const user = await createUser(label);
  created.push(user.id);
  const session = await getSessionUser();
  if (!session) throw new Error("expected a session");
  return { user, session };
}

describe("registration and sign-in", () => {
  it("registers a user with a hashed password, a session and a verification e-mail", async () => {
    const sent = captureEmail();
    const { user, session } = await signedIn();
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).not.toContain(PASSWORD);
    expect(row.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(session.email).toBe(user.email);
    expect(session.onboardingDone).toBe(false);
    expect(sent.some((m) => m.to === user.email && m.subject.includes("Confirm"))).toBe(true);
    // Only a hash of the session token is stored.
    const token = request.cookies.get(SESSION_COOKIE)!;
    expect(await db.session.count({ where: { tokenHash: token } })).toBe(0);
  });

  it("does not reveal whether an e-mail address is already registered", async () => {
    captureEmail();
    const { user } = await signedIn();
    request.reset(freshIp());
    await expect(auth.register({ fullName: "Other", email: user.email, password: PASSWORD, acceptTerms: true })).rejects.toThrow(/couldn't create an account/);
  });

  it("rejects a wrong password and an unknown address with the same message", async () => {
    captureEmail();
    const { user } = await signedIn();
    request.reset(freshIp());
    const wrong = await auth.login({ email: user.email, password: "not-the-password-1" }).catch((e: AppError) => e);
    const unknown = await auth.login({ email: uniqueEmail("nobody"), password: PASSWORD }).catch((e: AppError) => e);
    expect(wrong).toBeInstanceOf(AppError);
    expect((wrong as AppError).message).toBe((unknown as AppError).message);
    expect(await getSessionUser()).toBeNull();
  });

  it("signs in with the right password and signs out", async () => {
    captureEmail();
    const { user } = await signedIn();
    request.reset(freshIp());
    expect(await auth.login({ email: user.email, password: PASSWORD })).toEqual({ twoFactorRequired: false });
    // getSessionUser is cached per render in React; here each call reads the jar afresh.
    const session = await getSessionUser();
    expect(session?.id).toBe(user.id);
    await auth.logout(session);
    expect(request.cookies.has(SESSION_COOKIE)).toBe(false);
  });

  it("throttles repeated sign-in attempts from one address", async () => {
    captureEmail();
    const { user } = await signedIn();
    request.reset(freshIp());
    const attempts = [];
    for (let i = 0; i < 9; i++) attempts.push(await auth.login({ email: user.email, password: "bad-password-123" }).catch((e: AppError) => e.status));
    expect(attempts.slice(0, 8).every((s) => s === 401)).toBe(true);
    expect(attempts[8]).toBe(429);
  });
});

describe("e-mail verification and password reset", () => {
  it("verifies an e-mail address once per token", async () => {
    const sent = captureEmail();
    const { user } = await signedIn();
    const token = tokenFrom(sent.find((m) => m.to === user.email)!);
    expect(await auth.verifyEmail(token)).toBe(true);
    expect(await auth.verifyEmail(token)).toBe(false);
    expect(await auth.verifyEmail("not-a-real-token")).toBe(false);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerifiedAt).not.toBeNull();
  });

  it("resets a password with a single-use token and signs every device out", async () => {
    const sent = captureEmail();
    const { user } = await signedIn();
    request.reset(freshIp());
    await auth.requestPasswordReset(user.email);
    await auth.requestPasswordReset(uniqueEmail("ghost")); // silently ignored
    const reset = sent.filter((m) => m.subject.includes("Reset"));
    expect(reset).toHaveLength(1);

    const token = tokenFrom(reset[0]);
    await auth.resetPassword(token, "a-brand-new-password-7");
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    await expect(auth.resetPassword(token, "another-password-88")).rejects.toThrow(/no longer valid/);

    request.reset(freshIp());
    await expect(auth.login({ email: user.email, password: PASSWORD })).rejects.toThrow();
    await expect(auth.login({ email: user.email, password: "a-brand-new-password-7" })).resolves.toEqual({ twoFactorRequired: false });
  });

  it("changes a password only with the current one", async () => {
    captureEmail();
    const { session } = await signedIn();
    await expect(auth.changePassword(session, "wrong-current-1", "new-password-123")).rejects.toThrow(/current password/);
    await expect(auth.changePassword(session, PASSWORD, "new-password-123")).resolves.toBeUndefined();
  });
});

describe("two-factor authentication", () => {
  it("requires a valid code to enable, then a code or recovery code at sign-in", async () => {
    captureEmail();
    const { user, session } = await signedIn();
    const { secret } = await auth.beginTwoFactorSetup(session);
    const code = () => new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 }).generate();

    // The secret is encrypted at rest.
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).twoFactorSecret).not.toContain(secret);
    await expect(auth.enableTwoFactor(session, "000000")).rejects.toThrow(/not valid/);
    const recovery = await auth.enableTwoFactor(session, code());
    expect(recovery).toHaveLength(8);

    request.reset(freshIp());
    expect(await auth.login({ email: user.email, password: PASSWORD })).toEqual({ twoFactorRequired: true });
    let pending = (await getSessionUser())!;
    expect(pending.twoFactorOk).toBe(false);
    await expect(auth.completeTwoFactor(pending, "123456")).rejects.toThrow(/not valid/);
    await auth.completeTwoFactor(pending, code());
    expect((await getSessionUser())!.twoFactorOk).toBe(true);

    // A recovery code works once.
    request.reset(freshIp());
    await auth.login({ email: user.email, password: PASSWORD });
    pending = (await getSessionUser())!;
    await auth.completeTwoFactor(pending, recovery[0]);
    request.reset(freshIp());
    await auth.login({ email: user.email, password: PASSWORD });
    await expect(auth.completeTwoFactor((await getSessionUser())!, recovery[0])).rejects.toThrow(/not valid/);

    await expect(auth.disableTwoFactor(session, "wrong-password-1")).rejects.toThrow();
    await auth.disableTwoFactor(session, PASSWORD);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).twoFactorEnabled).toBe(false);
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]+$/);
  });
});

describe("sessions and account", () => {
  it("lists a user's sessions and refuses to revoke someone else's", async () => {
    captureEmail();
    const a = await signedIn("a");
    const b = await signedIn("b");
    const sessionsOfA = await auth.listSessions(a.session);
    expect(sessionsOfA).toHaveLength(1);
    await expect(auth.revokeSession(b.session, sessionsOfA[0].id)).rejects.toThrow(/couldn't find/);
    expect(await db.session.count({ where: { id: sessionsOfA[0].id } })).toBe(1);
    await auth.revokeOtherSessions(b.session);
    expect(await db.session.count({ where: { userId: b.user.id } })).toBe(1);
  });

  it("exports a user's data and deletes the account with everything in it", async () => {
    captureEmail();
    const { user } = await signedIn();
    const data = await exportAccountData(user.id);
    expect(data.account.email).toBe(user.email);
    expect(JSON.stringify(data)).not.toContain("passwordHash");

    await expect(deleteAccount(user.id, "wrong-password-1")).rejects.toThrow(/incorrect/);
    await deleteAccount(user.id, PASSWORD);
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.profile.count({ where: { userId: user.id } })).toBe(0);
    // The audit trail survives without pointing at a person.
    expect(await db.auditLog.count({ where: { action: "account.deleted", entityId: user.id, userId: null } })).toBe(1);
  });
});
