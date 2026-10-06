import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./database";

/** Creates/migrates the test database and loads reference data (tax years, rules, deadlines). */
export default function setup() {
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: testDatabaseUrl(), NODE_ENV: "production", ADMIN_EMAILS: "" };
  // NODE_ENV=production makes the seed skip the demo account; only reference data is loaded.
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
}
