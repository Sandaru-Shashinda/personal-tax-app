import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

interface Limit {
  /** Attempts allowed per window. */
  max: number;
  windowSeconds: number;
}

export const LIMITS = {
  login: { max: 8, windowSeconds: 15 * 60 },
  register: { max: 5, windowSeconds: 60 * 60 },
  passwordReset: { max: 4, windowSeconds: 60 * 60 },
  twoFactor: { max: 6, windowSeconds: 10 * 60 },
  publicCalculator: { max: 60, windowSeconds: 60 },
  upload: { max: 40, windowSeconds: 60 * 60 },
} satisfies Record<string, Limit>;

/**
 * Fixed-window counter in PostgreSQL. A single atomic upsert, so concurrent requests cannot
 * slip past the limit. Throws a 429 AppError when the limit is exceeded. Does nothing when
 * RATE_LIMIT_ENABLED is "false".
 */
export async function rateLimit(bucket: keyof typeof LIMITS, subject: string): Promise<void> {
  if (!env().RATE_LIMIT_ENABLED) return;
  const { max, windowSeconds } = LIMITS[bucket];
  const key = `${bucket}:${subject}`.slice(0, 200);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, now(), now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."expiresAt" < now() THEN now() ELSE "RateLimit"."windowStart" END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE "RateLimit"."expiresAt" END
    RETURNING "count"`;
  if ((rows[0]?.count ?? 0) > max) {
    throw new AppError("Too many attempts. Please wait a few minutes and try again.", 429);
  }
}
