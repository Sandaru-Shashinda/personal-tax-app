import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { detectColumns, detectDateOrder, findHeaderRow, guessCategory, monthlyTotals, parseAmount, parseDate, toStatementRows } from "@/lib/import/statement";

describe("parseCsv", () => {
  it("reads quoted cells, doubled quotes, line breaks inside cells and CRLF", () => {
    const text = '﻿Date,Description,Amount\r\n01/04/2025,"Keells, Colombo 03","1,250.00"\r\n02/04/2025,"He said ""hi""\nsecond line",5\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ["Date", "Description", "Amount"],
      ["01/04/2025", "Keells, Colombo 03", "1,250.00"],
      ["02/04/2025", 'He said "hi"\nsecond line', "5"],
    ]);
  });

  it("recognises semicolon and tab delimiters", () => {
    expect(parseCsv("a;b;c\n1;2;3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("amounts and dates", () => {
  it("reads the ways statements write an amount", () => {
    expect(parseAmount("1,250.00")).toBe(1250);
    expect(parseAmount("Rs. 1,250.50")).toBe(1250.5);
    expect(parseAmount("-450")).toBe(-450);
    expect(parseAmount("(450.00)")).toBe(-450);
    expect(parseAmount("450.00 DR")).toBe(-450);
    expect(parseAmount("450.00CR")).toBe(450);
    expect(parseAmount("LKR 99")).toBe(99);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("n/a")).toBeNull();
  });

  it("reads dates in the chosen order, with month names and times", () => {
    expect(parseDate("05/04/2025", "DMY")).toBe("2025-04-05");
    expect(parseDate("05/04/2025", "MDY")).toBe("2025-05-04");
    expect(parseDate("2025-04-05 10:31:00", "DMY")).toBe("2025-04-05");
    expect(parseDate("2025-04-05T10:31:00Z", "YMD")).toBe("2025-04-05");
    expect(parseDate("5-Apr-25", "DMY")).toBe("2025-04-05");
    expect(parseDate("April 5, 2025", "DMY")).toBe("2025-04-05");
    expect(parseDate("31/02/2025", "DMY")).toBeNull();
    expect(parseDate("Opening balance", "DMY")).toBeNull();
  });

  it("works out the date order from the data and defaults to day first", () => {
    expect(detectDateOrder(["01/04/2025", "25/04/2025"])).toBe("DMY");
    expect(detectDateOrder(["04/01/2025", "04/25/2025"])).toBe("MDY");
    expect(detectDateOrder(["2025-04-01"])).toBe("YMD");
    expect(detectDateOrder(["01/04/2025"])).toBe("DMY");
  });
});

describe("statements", () => {
  const bank = parseCsv(
    ["Account: 1234567", "Period: April 2025", "Transaction Date,Value Date,Description,Debit,Credit,Balance", "01/04/2025,01/04/2025,DIALOG BROADBAND,3500.00,,96500.00", "13/04/2025,13/04/2025,CEFT FROM ABC TRADERS,,45000.00,141500.00", "Closing balance,,,,,141500.00"].join("\n"),
  );

  it("skips the preamble and maps separate money-out and money-in columns", () => {
    const header = findHeaderRow(bank);
    expect(header).toBe(2);
    const rows = bank.slice(header + 1);
    const mapping = detectColumns(bank[header], rows);
    expect(mapping).toMatchObject({ date: 0, description: 2, amount: null, moneyOut: 3, moneyIn: 4, dateOrder: "DMY" });
    expect(toStatementRows(rows, mapping)).toEqual({
      rows: [
        { line: 0, date: "2025-04-01", description: "DIALOG BROADBAND", amount: 3500, direction: "OUT" },
        { line: 1, date: "2025-04-13", description: "CEFT FROM ABC TRADERS", amount: 45000, direction: "IN" },
      ],
      unreadable: 1,
    });
  });

  it("uses the sign of a single amount column, either way round", () => {
    const rows = [["2025-04-01", "Fuel", "-5000"], ["2025-04-02", "Sale", "8000"]];
    const mapping = detectColumns(["Date", "Details", "Amount"], rows);
    expect(mapping).toMatchObject({ amount: 2, moneyOut: null, dateOrder: "YMD" });
    expect(toStatementRows(rows, { ...mapping, positiveIs: "IN" }).rows.map((r) => r.direction)).toEqual(["OUT", "IN"]);
    expect(toStatementRows(rows, { ...mapping, positiveIs: "OUT" }).rows.map((r) => r.direction)).toEqual(["IN", "OUT"]);
  });

  it("guesses a category from the wording and falls back to Other", () => {
    expect(guessCategory("DIALOG BROADBAND")).toBe("Internet & phone");
    expect(guessCategory("PickMe ride")).toBe("Travel & transport");
    expect(guessCategory("GOOGLE ADS 4411")).toBe("Marketing");
    expect(guessCategory("GOOGLE WORKSPACE")).toBe("Software & subscriptions");
    expect(guessCategory("KEELLS SUPER")).toBe("Personal");
    expect(guessCategory("CEFT TO 0091")).toBe("Other");
  });

  it("adds rows up into one total per month and category", () => {
    const totals = monthlyTotals([
      { date: "2025-04-03", amount: 100.1, category: "Travel & transport" },
      { date: "2025-04-28", amount: 200.2, category: "Travel & transport" },
      { date: "2025-04-28", amount: 50, category: "Marketing" },
      { date: "2025-05-01", amount: 75, category: "Travel & transport" },
    ]);
    expect(totals).toEqual([
      { month: "2025-04-01", category: "Marketing", amount: 50, count: 1 },
      { month: "2025-04-01", category: "Travel & transport", amount: 300.3, count: 2 },
      { month: "2025-05-01", category: "Travel & transport", amount: 75, count: 1 },
    ]);
  });
});
