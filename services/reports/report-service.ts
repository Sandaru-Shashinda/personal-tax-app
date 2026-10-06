import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { formatDate, formatPercent, toISODate } from "@/lib/format";
import { buildStatement } from "@/lib/tax/statement";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { getAccount } from "@/services/account/account-service";
import { getTaxYear } from "@/services/tax/rule-repository";
import { getTaxSummary } from "@/services/tax/tax-service";

const n = (value: unknown) => Number(value ?? 0);

export type CsvKind = "income" | "expenses" | "payments" | "tax-summary";

/** Whole-year CSV. Streams are unnecessary at personal-data sizes, but rows are fetched lean. */
export async function buildCsv(userId: string, taxYearCode: string, kind: CsvKind): Promise<{ filename: string; body: string }> {
  const taxYear = await getTaxYear(taxYearCode);
  const where = { userId, taxYearId: taxYear.id, deletedAt: null };
  const slug = taxYear.code.replace("/", "-");
  await audit({ userId, action: "report.exported", after: { kind, taxYear: taxYear.code, format: "csv" } });

  if (kind === "income") {
    const rows = await db.incomeEntry.findMany({ where, orderBy: { receivedOn: "asc" }, include: { source: { select: { name: true } } } });
    return {
      filename: `income-${slug}.csv`,
      body: toCsv(
        ["Date", "Type", "Source", "Description", "Gross (LKR)", "Tax withheld (LKR)", "Currency", "Original amount", "Exchange rate", "Rate source", "Foreign source", "Remitted via bank"],
        rows.map((r) => [
          toISODate(r.receivedOn), r.type, r.source.name, r.description, n(r.grossAmount), n(r.withholdingTax), r.currency,
          r.originalAmount === null ? null : n(r.originalAmount), r.exchangeRate === null ? null : n(r.exchangeRate), r.exchangeRateSource,
          r.isForeignSource ? "Yes" : "No", r.remittedViaBank ? "Yes" : "No",
        ]),
      ),
    };
  }
  if (kind === "expenses") {
    const rows = await db.expense.findMany({ where, orderBy: { incurredOn: "asc" }, include: { incomeSource: { select: { name: true } } } });
    return {
      filename: `expenses-${slug}.csv`,
      body: toCsv(
        ["Date", "Category", "Description", "Amount (LKR)", "Payment method", "Linked income source", "Treatment", "Deductible amount (LKR)", "Reason"],
        rows.map((r) => [toISODate(r.incurredOn), r.category, r.description, n(r.amount), r.paymentMethod, r.incomeSource?.name, r.deductibility, n(r.deductibleAmount), r.deductibilityReason]),
      ),
    };
  }
  if (kind === "payments") {
    const rows = await db.taxPayment.findMany({ where, orderBy: { paidOn: "asc" } });
    return {
      filename: `tax-payments-${slug}.csv`,
      body: toCsv(
        ["Date", "Type", "Instalment", "Amount (LKR)", "Reference", "Bank", "Notes"],
        rows.map((r) => [toISODate(r.paidOn), r.type, r.instalmentNo, n(r.amount), r.reference, r.bank, r.notes]),
      ),
    };
  }
  const { result } = await getTaxSummary(userId, taxYear.code);
  return {
    filename: `tax-summary-${slug}.csv`,
    body: toCsv(
      ["Section", "Item", "Amount (LKR)", "Detail"],
      buildStatement(result).flatMap((section) => section.rows.map((row) => [section.title, row.label, row.amount, row.detail ?? ""])),
    ),
  };
}

// â”€â”€ PDF

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const INK = rgb(0.11, 0.14, 0.17);
const MUTED = rgb(0.42, 0.45, 0.48);
const TEAL = rgb(0.05, 0.36, 0.38);
const RULE = rgb(0.86, 0.87, 0.87);

/** The standard PDF fonts cover Latin-1 only; anything else is replaced so drawing cannot throw. */
const latin = (text: string) =>
  text.replace(/[−–—]/g, "-").replaceAll("×", "x").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

const rupees = (amount: number) => `Rs. ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of latin(text).split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

/** A printable annual tax summary. It is the user's own working paper, not an IRD form. */
export async function buildTaxSummaryPdf(userId: string, taxYearCode: string): Promise<{ filename: string; bytes: Uint8Array }> {
  const [{ taxYear, result }, account] = await Promise.all([getTaxSummary(userId, taxYearCode), getAccount(userId)]);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Tax summary ${taxYear.code}`);
  pdf.setCreator("Ayakara");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = A4.width - MARGIN * 2;

  let page: PDFPage = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;
  const ensure = (space: number) => {
    if (y - space < MARGIN + 30) {
      page = pdf.addPage([A4.width, A4.height]);
      y = A4.height - MARGIN;
    }
  };
  const text = (value: string, x: number, size: number, font = regular, color = INK) => page.drawText(latin(value), { x, y, size, font, color });
  const right = (value: string, size: number, font = regular, color = INK) =>
    page.drawText(latin(value), { x: MARGIN + width - font.widthOfTextAtSize(latin(value), size), y, size, font, color });

  text("Ayakara", MARGIN, 11, bold, TEAL);
  right(`Generated ${formatDate(new Date())}`, 9, regular, MUTED);
  y -= 30;
  text("Annual tax summary", MARGIN, 20, bold);
  y -= 18;
  text(`Year of assessment ${taxYear.code}  (${formatDate(taxYear.startsOn)} - ${formatDate(taxYear.endsOn)})`, MARGIN, 10, regular, MUTED);
  y -= 22;
  text(account.profile.fullName, MARGIN, 11, bold);
  y -= 14;
  text(`TIN: ${account.taxpayer.tin || "not entered"}    Residency: ${result.residency.replaceAll("_", " ").toLowerCase()}`, MARGIN, 9, regular, MUTED);
  y -= 22;

  for (const section of buildStatement(result)) {
    ensure(48);
    page.drawLine({ start: { x: MARGIN, y: y + 10 }, end: { x: MARGIN + width, y: y + 10 }, thickness: 0.6, color: RULE });
    y -= 6;
    text(section.title.toUpperCase(), MARGIN, 8, bold, TEAL);
    y -= 16;
    for (const row of section.rows) {
      const labelLines = wrap(row.label, row.emphasis ? bold : regular, 10, width - 150);
      ensure(labelLines.length * 13 + (row.detail && !row.line?.why ? 12 : 0) + 4);
      const font = row.emphasis ? bold : regular;
      right(`${row.sign && row.sign !== "=" ? `${row.sign} ` : ""}${rupees(row.amount)}`, 10, font);
      for (const line of labelLines) {
        text(line, MARGIN, 10, font);
        y -= 13;
      }
      // Arithmetic detail (base x rate) is printed; long explanations stay in the app.
      if (row.detail && row.line?.base !== undefined) {
        text(row.detail, MARGIN + 10, 8, regular, MUTED);
        y -= 12;
      }
      y -= 2;
    }
    y -= 8;
  }

  ensure(60);
  text(`Effective tax rate: ${formatPercent(result.effectiveRate)}    Marginal rate: ${formatPercent(result.marginalRate, 0)}`, MARGIN, 10, bold);
  y -= 24;

  ensure(40 + result.rulesUsed.length * 22);
  text("RULES AND SOURCES USED", MARGIN, 8, bold, TEAL);
  y -= 14;
  for (const rule of result.rulesUsed) {
    ensure(24);
    text(`${rule.name} (version ${rule.version})`, MARGIN, 8.5, bold);
    y -= 10;
    const status = rule.verification === "VERIFIED" ? "verified" : rule.verification === "VERIFIED_SECONDARY" ? "secondary source" : "REQUIRES VERIFICATION";
    text(`${rule.source ? `${rule.source.authority}${rule.sourceLocator ? `, ${rule.sourceLocator}` : ""}` : "No source recorded"} - ${status}${rule.lastVerifiedAt ? `, last verified ${formatDate(rule.lastVerifiedAt)}` : ""}`.slice(0, 150), MARGIN, 7.5, regular, MUTED);
    y -= 12;
  }

  y -= 8;
  const disclaimer = wrap(`${DISCLAIMER_TEXT} This summary was prepared by the taxpayer using Ayakara. It is not a return of income and has not been submitted to the Inland Revenue Department.`, regular, 7.5, width);
  ensure(disclaimer.length * 10 + 10);
  for (const line of disclaimer) {
    text(line, MARGIN, 7.5, regular, MUTED);
    y -= 10;
  }

  pdf.getPages().forEach((p, index, all) => {
    const label = `Page ${index + 1} of ${all.length}`;
    p.drawText(label, { x: A4.width - MARGIN - regular.widthOfTextAtSize(label, 8), y: 28, size: 8, font: regular, color: MUTED });
  });

  await audit({ userId, action: "report.exported", after: { kind: "tax-summary", taxYear: taxYear.code, format: "pdf" } });
  return { filename: `tax-summary-${taxYear.code.replace("/", "-")}.pdf`, bytes: await pdf.save() };
}
