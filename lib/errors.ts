import { z } from "zod";

/** An error whose message is safe to show to the user. Anything else is logged and replaced. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 429 = 400,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "record") => new AppError(`We couldn't find that ${what}.`, 404);

export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_form";
    (out[path] ??= []).push(issue.message);
  }
  return out;
}

/** Converts any thrown value into a user-safe failure; technical detail goes to the server log only. */
export function toFailure(error: unknown, fallback: string): { ok: false; error: string; fieldErrors?: Record<string, string[]>; status: number } {
  if (error instanceof AppError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors, status: error.status };
  if (error instanceof z.ZodError) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(error), status: 422 };
  }
  console.error("[unhandled]", error);
  return { ok: false, error: fallback, status: 500 };
}
