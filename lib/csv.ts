/**
 * Serialises rows to RFC 4180 CSV. Cells that start with a formula character are prefixed with
 * an apostrophe so a spreadsheet opens them as text, not as a formula (CSV injection).
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return String(value);
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
  };
  // BOM so Excel reads UTF-8.
  return `﻿${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
