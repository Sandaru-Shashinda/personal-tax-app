import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const SESSION_COOKIE = "ayk_session";
const SESSION_DAYS = 30;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export async function requestMeta(): Promise<RequestMeta> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: (forwarded || h.get("x-real-ip") || null)?.slice(0, 64) ?? null,
    userAgent: h.get("user-agent")?.slice(0, 400) ?? null,
  };
}

export async function createSession(userId: string, twoFactorOk: boolean): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const meta = await requestMeta();
  await db.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt, twoFactorOk, ipAddress: meta.ipAddress, userAgent: meta.userAgent },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export interface CurrentUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  fullName: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  onboardingDone: boolean;
  isDemo: boolean;
  sessionId: string;
  /** False while a 2FA user has entered a password but not yet a code. */
  twoFactorOk: boolean;
}

/** Looks the session up in the database on every request; the cookie alone grants nothing. */
export const getSessionUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { profile: { select: { fullName: true } } } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.deletedAt) return null;

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.profile?.fullName ?? user.email,
    emailVerified: user.emailVerifiedAt !== null,
    twoFactorEnabled: user.twoFactorEnabled,
    onboardingDone: user.onboardingDoneAt !== null,
    isDemo: user.isDemo,
    sessionId: session.id,
    twoFactorOk: !user.twoFactorEnabled || session.twoFactorOk,
  };
});

/** For pages: a fully signed-in user, or a redirect. */
export async function requireUser(options: { allowIncompleteOnboarding?: boolean } = {}): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.twoFactorOk) redirect("/login/two-factor");
  if (!user.onboardingDone && !options.allowIncompleteOnboarding) redirect("/onboarding");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** For Server Actions and Route Handlers: throws instead of redirecting. */
export async function authenticate(): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user || !user.twoFactorOk) throw new AppError("Please sign in to continue.", 401);
  return user;
}

export async function authenticateAdmin(): Promise<CurrentUser> {
  const user = await authenticate();
  if (user.role !== "ADMIN") throw new AppError("You don't have permission to do that.", 403);
  return user;
}
