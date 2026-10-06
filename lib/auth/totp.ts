import "server-only";
import { Secret, TOTP } from "otpauth";

const ISSUER = "Ayakara";

function totp(secretBase32: string, label: string) {
  return new TOTP({ issuer: ISSUER, label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secretBase32) });
}

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function totpUri(secretBase32: string, email: string): string {
  return totp(secretBase32, email).toString();
}

/** Accepts the current code and one step either side to tolerate clock drift. */
export function verifyTotp(secretBase32: string, code: string): boolean {
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  return totp(secretBase32, "").validate({ token: cleaned, window: 1 }) !== null;
}
