import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { uuid } from "@/lib/validation/common";
import { readDocument } from "@/services/documents/document-service";

/** Streams a document to its owner only. Files are never served from a public path. */
export const GET = authed<RouteContext<"/api/documents/[id]">>("We couldn't open this document.", async (request, user, context) => {
  const { id } = await context.params;
  const doc = await readDocument(user.id, uuid.parse(id));
  const inline = request.nextUrl.searchParams.get("inline") === "1";
  return new NextResponse(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${doc.originalName.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // An uploaded file must never be able to run script in this origin.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
});
