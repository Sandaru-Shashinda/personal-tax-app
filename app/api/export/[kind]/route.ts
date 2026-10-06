import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { taxYearCode } from "@/lib/validation/common";
import { buildCsv, buildTaxSummaryPdf } from "@/services/reports/report-service";
import { getCurrentTaxYear } from "@/services/tax/rule-repository";

const kinds = z.enum(["income", "expenses", "payments", "tax-summary", "tax-summary-pdf"]);

function download(body: BodyInit, type: string, filename: string) {
  return new NextResponse(body, {
    headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}

export const GET = authed<RouteContext<"/api/export/[kind]">>("We couldn't prepare this export. Please try again.", async (request, user, context) => {
  const kind = kinds.parse((await context.params).kind);
  const year = request.nextUrl.searchParams.get("year");
  const code = year ? taxYearCode.parse(year) : (await getCurrentTaxYear()).code;

  if (kind === "tax-summary-pdf") {
    const { filename, bytes } = await buildTaxSummaryPdf(user.id, code);
    return download(new Uint8Array(bytes), "application/pdf", filename);
  }
  const { filename, body } = await buildCsv(user.id, code, kind);
  return download(body, "text/csv; charset=utf-8", filename);
});
