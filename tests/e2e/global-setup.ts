import { PrismaClient } from "@prisma/client";

/**
 * Repeated runs register and sign in from one address and would trip the rate limiter, so the
 * development database's counters are cleared first. Never point this at production.
 */
export default async function globalSetup() {
  if (process.env.NODE_ENV === "production") throw new Error("End-to-end tests must not run against production.");
  const db = new PrismaClient();
  try {
    await db.rateLimit.deleteMany();
    await db.user.updateMany({ where: { isDemo: true }, data: { failedLoginCount: 0, lockedUntil: null } });
  } finally {
    await db.$disconnect();
  }
}
