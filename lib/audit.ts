import "server-only";
import type { Prisma } from "@prisma/client";
import { requestMeta } from "@/lib/auth/session";
import { db } from "@/lib/db";

export interface AuditEvent {
  userId: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

const REDACTED = new Set(["passwordHash", "twoFactorSecret", "nicEncrypted", "tokenHash", "codeHash", "password"]);

function sanitise(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value, (key, v) => (REDACTED.has(key) ? "[redacted]" : v))) as Prisma.InputJsonValue;
}

/** Writes an audit record. Never throws: a logging failure must not fail the user's action. */
export async function audit(event: AuditEvent): Promise<void> {
  try {
    const meta = await requestMeta().catch(() => ({ ipAddress: null, userAgent: null }));
    await db.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        before: sanitise(event.before),
        after: sanitise(event.after),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write", event.action, error);
  }
}
