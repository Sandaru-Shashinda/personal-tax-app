import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { db } from "@/lib/db";
import { emailProvider, type EmailMessage } from "@/lib/email";
import { register } from "@/services/auth/auth-service";
import { request } from "./setup/env";

let counter = 0;

/** A fresh client address per call, so per-IP rate limits never couple unrelated tests. */
export function freshIp(): string {
  counter += 1;
  return `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${counter % 250}`;
}

export const uniqueEmail = (label = "user") => `${label}-${randomUUID().slice(0, 8)}@test.example.lk`;

export const PASSWORD = "correct-horse-battery-9";

/** Captures outgoing e-mail instead of logging it. */
export function captureEmail(): EmailMessage[] {
  const sent: EmailMessage[] = [];
  vi.spyOn(emailProvider(), "send").mockImplementation(async (message) => void sent.push(message));
  return sent;
}

/** Registers a user through the real service and returns their id. Leaves them signed in. */
export async function createUser(label = "user"): Promise<{ id: string; email: string }> {
  request.reset(freshIp());
  const email = uniqueEmail(label);
  await register({ fullName: "Test Person", email, password: PASSWORD, acceptTerms: true });
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  return { id: user.id, email };
}

export async function removeUsers(...ids: string[]): Promise<void> {
  await db.user.deleteMany({ where: { id: { in: ids } } });
}

export function tokenFrom(message: EmailMessage): string {
  const match = message.text.match(/token=([\w-]+)/);
  if (!match) throw new Error("No token in e-mail");
  return match[1];
}
