import { msg } from "@/lib/i18n/translate";
import type { Line, TaxResult } from "./types";

// One ordered, printable view of a calculation, shared by the on-screen breakdown, the PDF and
// the CSV export so all three always show the same figures in the same order.

export interface StatementRow {
  label: string;
  amount: number;
  /** Shown before the amount: "+", "−" or "=". */
  sign?: "+" | "−" | "=";
  detail?: string;
  emphasis?: boolean;
  line?: Line;
}

export interface StatementSection {
  title: string;
  rows: StatementRow[];
}

const pct = (rate: number) => `${Math.round(rate * 10000) / 100}%`;

export function buildStatement(r: TaxResult): StatementSection[] {
  const c = r.incomeByCategory;
  const sections: StatementSection[] = [
    {
      title: msg("Income"),
      rows: [
        { label: msg("Employment income"), amount: c.employment, sign: "+" },
        { label: msg("Business income (after deductible expenses)"), amount: c.business, sign: "+" },
        { label: msg("Investment income"), amount: c.investment, sign: "+" },
        { label: msg("Other income"), amount: c.other, sign: "+" },
        { label: msg("Assessable income"), amount: r.assessableIncome, sign: "=", emphasis: true },
      ],
    },
  ];
  if (r.excludedLines.length > 0) {
    sections.push({
      title: msg("Not included in assessable income"),
      rows: r.excludedLines.map((line) => ({ label: line.label, amount: line.amount, detail: line.why, line })),
    });
  }
  sections.push({
    title: msg("Reliefs and qualifying payments"),
    rows: [
      ...[...r.reliefLines, ...r.qualifyingPaymentLines].map((line): StatementRow => ({ label: line.label, amount: line.amount, sign: "−", line })),
      ...(r.totalDeductions < [...r.reliefLines, ...r.qualifyingPaymentLines].reduce((t, l) => t + l.amount, 0)
        ? [{ label: msg("Deductions actually used (limited to the income they can be set against)"), amount: r.totalDeductions, sign: "−" as const }]
        : []),
      { label: msg("Taxable income"), amount: r.taxableIncome, sign: "=", emphasis: true },
    ],
  });
  sections.push({
    title: msg("Tax calculation"),
    rows: [
      ...r.taxLines.map((line): StatementRow => ({
        label: line.label,
        amount: line.amount,
        detail: line.base !== undefined && line.rate !== undefined ? `Rs. ${line.base.toLocaleString("en-LK")} × ${pct(line.rate)}` : undefined,
        line,
      })),
      { label: msg("Total tax"), amount: r.totalTax, sign: "=", emphasis: true },
    ],
  });
  sections.push({
    title: msg("Tax already paid or withheld"),
    rows: [
      ...r.creditLines.map((line): StatementRow => ({ label: line.label, amount: line.amount, sign: "−", line })),
      { label: msg("Total credits"), amount: r.totalCredits, sign: "=", emphasis: true },
    ],
  });
  sections.push({
    title: msg("Balance"),
    rows: [
      { label: msg("Total tax"), amount: r.totalTax },
      { label: msg("Less: total credits"), amount: r.totalCredits, sign: "−" },
      { label: r.balancePayable >= 0 ? msg("Remaining liability") : msg("Overpaid"), amount: Math.abs(r.balancePayable), sign: "=", emphasis: true },
    ],
  });
  return sections;
}
