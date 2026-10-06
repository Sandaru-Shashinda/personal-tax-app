import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "ENCRYPTION_KEY must be 32 bytes, base64-encoded"),
  STORAGE_DIR: z.string().default("./.storage"),
  EMAIL_FROM: z.string().default("Ayakara <no-reply@localhost>"),
});

let cached: z.infer<typeof schema> | undefined;

/** Validated server environment. Read lazily so a missing variable fails the request, not the build. */
export function env() {
  cached ??= schema.parse(process.env);
  return cached;
}
