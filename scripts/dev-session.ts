// Development helper: prints a session cookie value for an existing account so pages and API
// routes can be exercised with curl. Refuses to run in production.
//
//   npx tsx scripts/dev-session.ts kasun.demo@example.lk

import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Not available in production.");
  const email = process.argv[2];
  if (!email) throw new Error("Usage: tsx scripts/dev-session.ts <email>");
  const db = new PrismaClient();
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw new Error(`No user with e-mail ${email}`);
    const token = randomBytes(32).toString("base64url");
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        twoFactorOk: true,
        userAgent: "dev-session script",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    console.log(token);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
