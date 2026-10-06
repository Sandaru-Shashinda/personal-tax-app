import { readFileSync } from "node:fs";
import path from "node:path";

/** Connection string for the dedicated test database: the development URL with another database name. */
export function testDatabaseUrl(): string {
  const fromEnv = process.env.TEST_DATABASE_URL;
  if (fromEnv) return fromEnv;
  const base = process.env.DATABASE_URL ?? readEnvFile().DATABASE_URL;
  if (!base) throw new Error("Set DATABASE_URL (or TEST_DATABASE_URL) to run integration tests.");
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/_test$/, "")}_test`;
  return url.toString();
}

export function readEnvFile(): Record<string, string> {
  try {
    const text = readFileSync(path.resolve(import.meta.dirname, "../../../.env"), "utf8").replace(/^﻿/, "");
    return Object.fromEntries(
      text
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => [m[1], m[2]]),
    );
  } catch {
    return {};
  }
}
