import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authenticate, type CurrentUser } from "@/lib/auth/session";
import { AppError, toFailure } from "@/lib/errors";
import { getT } from "@/lib/i18n/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for Route Handlers: a state-changing request must come from this origin.
 * (Server Actions get the same check from Next.js; the session cookie is also SameSite=Lax.)
 */
export function assertSameOrigin(request: NextRequest): void {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new AppError("This request was blocked.", 403);
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** The error as JSON, with its messages in the language of the request. */
export async function failure(error: unknown, fallback: string): Promise<NextResponse> {
  const { status, error: message, fieldErrors } = toFailure(error, fallback);
  const t = await getT();
  const translated = fieldErrors && Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, messages.map((m) => t(m))]));
  return json({ error: t(message), fieldErrors: translated }, status);
}

/** Wraps an authenticated JSON endpoint: origin check, session check, safe error mapping. */
export function authed<C>(fallback: string, handler: (request: NextRequest, user: CurrentUser, context: C) => Promise<NextResponse>) {
  return async (request: NextRequest, context: C): Promise<NextResponse> => {
    try {
      assertSameOrigin(request);
      return await handler(request, await authenticate(), context);
    } catch (error) {
      return failure(error, fallback);
    }
  };
}

export function searchParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}
