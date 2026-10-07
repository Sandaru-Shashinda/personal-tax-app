const lkr = new Intl.NumberFormat("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const lkrCents = new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "Rs. 245,000". Cents are shown only when asked for or when the amount has them. */
export function formatLKR(amount: number, options: { cents?: boolean } = {}): string {
  const showCents = options.cents ?? !Number.isInteger(amount);
  const abs = Math.abs(amount);
  const text = showCents ? lkrCents.format(abs) : lkr.format(abs);
  return `${amount < 0 ? "−" : ""}Rs. ${text}`;
}

/** Compact form for chart axes: "Rs. 4.2M". */
export function formatLKRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}Rs. ${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}Rs. ${Math.round(abs / 1_000)}K`;
  return `${sign}Rs. ${Math.round(abs)}`;
}

export function formatForeign(amount: number, currency: string): string {
  return `${currency} ${lkrCents.format(amount)}`;
}

export function formatPercent(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function formatDate(date: Date | string): string {
  return dateFormat.format(typeof date === "string" ? new Date(date) : date);
}

export function formatShortDate(date: Date | string): string {
  return shortDateFormat.format(typeof date === "string" ? new Date(date) : date);
}

const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** "Jun 2025", for records that cover a whole month. */
export function formatMonth(date: Date | string): string {
  return monthFormat.format(typeof date === "string" ? new Date(date) : date);
}

/** The first day of each of the twelve months starting at `startISO`, as YYYY-MM-DD. */
export function monthsFrom(startISO: string): string[] {
  const start = parseISODate(startISO);
  return Array.from({ length: 12 }, (_, i) => toISODate(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))));
}

/** The first day of the month a date falls in. */
export function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** YYYY-MM-DD for a date stored as a UTC calendar date. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Today's calendar date in Sri Lanka (UTC+05:30), as YYYY-MM-DD. */
export function todayInSriLanka(now: Date = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / 86_400_000);
}
