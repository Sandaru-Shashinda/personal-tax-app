import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { readEnvFile, testDatabaseUrl } from "./database";

// Environment for the services under test. Set before any application module is imported.
const fileEnv = readEnvFile();
process.env.DATABASE_URL = testDatabaseUrl();
process.env.ENCRYPTION_KEY ??= fileEnv.ENCRYPTION_KEY ?? Buffer.alloc(32, 7).toString("base64");
process.env.APP_URL = "http://localhost:3000";
process.env.STORAGE_DIR = mkdtempSync(path.join(tmpdir(), "ayakara-test-"));

// A stand-in for the request: a cookie jar and request headers the tests control.
export const request = {
  cookies: new Map<string, string>(),
  ip: "10.0.0.1",
  reset(ip: string) {
    this.cookies.clear();
    this.ip = ip;
  },
};

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (request.cookies.has(name) ? { name, value: request.cookies.get(name)! } : undefined),
    set: (name: string, value: string) => void request.cookies.set(name, value),
    delete: (name: string) => void request.cookies.delete(name),
    has: (name: string) => request.cookies.has(name),
  }),
  headers: async () => new Headers({ "x-forwarded-for": request.ip, "user-agent": "vitest" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
