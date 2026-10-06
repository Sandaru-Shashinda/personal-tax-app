import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP's recommended minimum parameters (19 MiB, 2 iterations, 1 lane).
const options = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}
