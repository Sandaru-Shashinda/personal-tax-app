import "server-only";
import { type ActionResult, toFailure } from "@/lib/errors";
import { getT } from "@/lib/i18n/server";

/**
 * Runs the body of a Server Action and turns any failure into a user-safe result.
 * Raw database or runtime errors never reach the browser; they are logged on the server.
 * Messages are written in English at their source and translated here, in one place.
 */
export async function run<T>(fn: () => Promise<T>, fallback: string, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message: message && (await getT())(message) };
  } catch (error) {
    const { ok, error: text, fieldErrors } = toFailure(error, fallback);
    const t = await getT();
    const translated = fieldErrors && Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, messages.map((m) => t(m))]));
    return { ok, error: t(text), fieldErrors: translated };
  }
}
