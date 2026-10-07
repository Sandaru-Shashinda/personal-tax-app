import { firstOfMonth } from "@/lib/format";
import { round2 } from "@/lib/tax/money";
import type { EXPENSE_CATEGORIES } from "@/lib/validation/records";

// Turns the rows of a bank, card or sales statement into dated amounts of money in and money out.
// Everything here is pure and runs in the browser, so the file itself never leaves the device.

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type DateOrder = "DMY" | "MDY" | "YMD";
export type Direction = "IN" | "OUT";

export interface ColumnMapping {
  date: number;
  description: number;
  /** One signed amount column, or null when the statement has separate columns. */
  amount: number | null;
  moneyOut: number | null;
  moneyIn: number | null;
  /** What a positive figure in the single amount column means. */
  positiveIs: Direction;
  dateOrder: DateOrder;
}

export interface StatementRow {
  /** Position in the file, used as a stable key. */
  line: number;
  date: string;
  description: string;
  amount: number;
  direction: Direction;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "1,250.00", "Rs. 1,250", "(1,250.00)", "1250.00 DR" → a signed number; null when it is not an amount. */
export function parseAmount(text: string): number | null {
  const raw = text.replace(/rs\.?|lkr/gi, "").trim();
  if (!raw) return null;
  const negative = /^\(.*\)$/.test(raw) || /^-|-$/.test(raw) || /dr$/i.test(raw);
  const digits = raw.replace(/(cr|dr)$/i, "").replace(/[,\s()+-]/g, "");
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  const value = round2(Number(digits));
  return negative ? -value : value;
}

/** Reads a statement date in the given order. Month names and two-digit years are understood. */
export function parseDate(text: string, order: DateOrder): string | null {
  const parts = text.trim().replace(/[T\s]\d{1,2}:\d{2}.*$/, "").split(/[/\-.,\s]+/).filter(Boolean).slice(0, 3);
  if (parts.length < 3) return null;
  const named = parts.findIndex((part) => /^[a-z]{3,}$/i.test(part));
  let year: string, month: string, day: string;
  if (named >= 0) {
    const index = MONTHS.indexOf(parts[named].slice(0, 3).toLowerCase());
    if (index < 0) return null;
    month = String(index + 1);
    const rest = parts.filter((_, i) => i !== named);
    [day, year] = rest[0].length === 4 ? [rest[1], rest[0]] : [rest[0], rest[1]];
  } else if (parts[0].length === 4 || order === "YMD") [year, month, day] = parts;
  else if (order === "MDY") [month, day, year] = parts;
  else [day, month, year] = parts;

  if (![year, month, day].every((part) => /^\d{1,4}$/.test(part))) return null;
  const y = year.length <= 2 ? 2000 + Number(year) : Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/** Works out the order from the dates themselves; day-first, the Sri Lankan convention, when they do not say. */
export function detectDateOrder(samples: string[]): DateOrder {
  const numeric = samples.map((sample) => sample.trim().split(/[/\-.\s]+/)).filter((parts) => parts.length >= 3 && parts.slice(0, 2).every((part) => /^\d+$/.test(part)));
  if (numeric.some((parts) => parts[0].length === 4)) return "YMD";
  if (numeric.some((parts) => Number(parts[0]) > 12)) return "DMY";
  if (numeric.some((parts) => Number(parts[1]) > 12)) return "MDY";
  return "DMY";
}

const HEADER_WORDS = /date|descri|narrat|particular|detail|amount|debit|credit|withdraw|deposit|balance/i;

/** Statements often open with account details; the header is the first row that names two or more columns. */
export function findHeaderRow(rows: string[][]): number {
  const index = rows.findIndex((row) => row.filter((cell) => HEADER_WORDS.test(cell)).length >= 2);
  return Math.max(index, 0);
}

/** A first guess at which column is which, from the header names. */
export function detectColumns(headers: string[], samples: string[][] = []): ColumnMapping {
  const find = (...patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const index = headers.findIndex((header) => pattern.test(header));
      if (index >= 0) return index;
    }
    return null;
  };
  const date = find(/^(transaction|txn|trans|posting)\s*date/i, /date/i) ?? 0;
  const moneyOut = find(/debit|withdraw|paid out|money out|^dr$/i);
  const moneyIn = find(/credit|deposit|paid in|money in|^cr$/i);
  const separate = moneyOut !== null && moneyIn !== null;
  return {
    date,
    description: find(/descri|narrat|particular|detail/i, /remark|memo|payee|merchant|reference/i) ?? Math.min(1, headers.length - 1),
    amount: separate ? null : (find(/^amount/i, /amount/i) ?? moneyOut ?? moneyIn ?? Math.min(2, headers.length - 1)),
    moneyOut: separate ? moneyOut : null,
    moneyIn: separate ? moneyIn : null,
    positiveIs: "OUT",
    dateOrder: detectDateOrder(samples.map((row) => row[date] ?? "")),
  };
}

/** Applies the mapping. Rows without a readable date or a non-zero amount are counted, not guessed at. */
export function toStatementRows(rows: string[][], mapping: ColumnMapping): { rows: StatementRow[]; unreadable: number } {
  const out: StatementRow[] = [];
  let unreadable = 0;
  rows.forEach((cells, line) => {
    const date = parseDate(cells[mapping.date] ?? "", mapping.dateOrder);
    let amount: number | null;
    let direction: Direction;
    if (mapping.amount !== null) {
      amount = parseAmount(cells[mapping.amount] ?? "");
      direction = (amount ?? 0) > 0 ? mapping.positiveIs : mapping.positiveIs === "OUT" ? "IN" : "OUT";
    } else {
      const paidOut = Math.abs(parseAmount(cells[mapping.moneyOut ?? -1] ?? "") ?? 0);
      const paidIn = Math.abs(parseAmount(cells[mapping.moneyIn ?? -1] ?? "") ?? 0);
      amount = paidOut || paidIn;
      direction = paidOut ? "OUT" : "IN";
    }
    if (!date || !amount) {
      unreadable += 1;
      return;
    }
    out.push({ line, date, description: (cells[mapping.description] ?? "").replace(/\s+/g, " ").trim().slice(0, 300), amount: Math.abs(amount), direction });
  });
  return { rows: out, unreadable };
}

// First match wins, so the narrower names come before the broad ones ("google ads" before "google").
const CATEGORY_HINTS: [RegExp, ExpenseCategory][] = [
  [/\b(keells|cargills|food city|arpico|glomark|supermarket|restaurant|cafe|kfc|pizza|mcdonald|grocer|pharmacy|hospital|cinema|netflix|spotify|atm|cash withdrawal)/i, "Personal"],
  [/\b(dialog|mobitel|hutch|airtel|slt|telecom|lanka bell|broadband|internet|reload)\b/i, "Internet & phone"],
  [/\b(uber|pickme|pick me|taxi|fuel|petrol|diesel|ceypetco|ioc|sinopec|parking|expressway|highway|railway|airline|srilankan|air ?ticket)/i, "Travel & transport"],
  [/\b(facebook|meta ads|google ads|linkedin|advert|marketing|promotion)/i, "Marketing"],
  [/\b(google|microsoft|adobe|github|aws|amazon web|openai|canva|zoom|slack|notion|dropbox|hosting|domain|godaddy|namecheap|digitalocean|subscription|software)/i, "Software & subscriptions"],
  [/\b(insurance|assurance|ceylinco|allianz|slic)\b/i, "Insurance"],
  [/\b(ceb|leco|electricity|water board|nwsdb|rent|lease)\b/i, "Rent & utilities"],
  [/\b(lawyer|attorney|audit|accountant|consult|legal|notary)/i, "Professional fees"],
  [/\b(course|training|udemy|coursera|seminar|workshop|exam fee)/i, "Training"],
  [/\b(laptop|computer|printer|monitor|abans|singer|softlogic|equipment)/i, "Equipment"],
  [/\b(repair|maintenance|garage|service centre)/i, "Repairs & maintenance"],
  [/\b(stationery|printing|courier|dhl|fedex|post office|office)/i, "Office & supplies"],
  [/\b(bank charge|service charge|commission|stamp duty|annual fee|sms alert|levy|fee|charges?)\b/i, "Bank charges"],
];

/** A starting category from the wording of a statement line. The user reviews every one. */
export function guessCategory(description: string): ExpenseCategory {
  return CATEGORY_HINTS.find(([pattern]) => pattern.test(description))?.[1] ?? "Other";
}

export interface MonthTotal {
  month: string;
  category: ExpenseCategory | null;
  amount: number;
  count: number;
}

/** One total per month for money in, and per month and category for money out. */
export function monthlyTotals(rows: { date: string; amount: number; category: ExpenseCategory | null }[]): MonthTotal[] {
  const totals = new Map<string, MonthTotal>();
  for (const row of rows) {
    const month = firstOfMonth(row.date);
    const key = `${month}|${row.category ?? ""}`;
    const total = totals.get(key) ?? { month, category: row.category, amount: 0, count: 0 };
    total.amount = round2(total.amount + row.amount);
    total.count += 1;
    totals.set(key, total);
  }
  return [...totals.values()].sort((a, b) => a.month.localeCompare(b.month) || (a.category ?? "").localeCompare(b.category ?? ""));
}
