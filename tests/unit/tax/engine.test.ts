import { describe, expect, it } from "vitest";
import { buildSeedRuleSet } from "@/lib/tax/data/rules";
import { computeTax, taxOnBands } from "@/lib/tax/engine";
import { TaxRuleMissingError } from "@/lib/tax/rule-set";
import type { IncomeItem, TaxInputs } from "@/lib/tax/types";

const y2425 = buildSeedRuleSet("2024/2025");
const y2526 = buildSeedRuleSet("2025/2026");
const y2627 = buildSeedRuleSet("2026/2027");

const inputs = (overrides: Partial<TaxInputs> = {}): TaxInputs => ({
  residency: "RESIDENT",
  income: [],
  deductibleExpenses: [],
  qualifyingPayments: [],
  payments: [],
  ...overrides,
});

const salary = (amount: number, withholding = 0): IncomeItem => ({ label: "Salary", kind: "SALARY", amount, withholding });

describe("progressive bands", () => {
  const bands = [
    { width: 1_000_000, rate: 0.06 },
    { width: 500_000, rate: 0.18 },
    { width: null, rate: 0.36 },
  ];

  it("returns nothing for zero or negative amounts", () => {
    expect(taxOnBands(0, bands)).toEqual([]);
    expect(taxOnBands(-5, bands)).toEqual([]);
  });

  it("splits an amount across bands", () => {
    expect(taxOnBands(1_700_000, bands)).toEqual([
      { base: 1_000_000, rate: 0.06, tax: 60_000 },
      { base: 500_000, rate: 0.18, tax: 90_000 },
      { base: 200_000, rate: 0.36, tax: 72_000 },
    ]);
  });

  it("starts part-way into the schedule when given an offset", () => {
    expect(taxOnBands(400_000, bands, 800_000)).toEqual([
      { base: 200_000, rate: 0.06, tax: 12_000 },
      { base: 200_000, rate: 0.18, tax: 36_000 },
    ]);
  });

  it("caps band rates and merges bands that end up at the same rate", () => {
    expect(taxOnBands(2_000_000, bands, 0, 0.15)).toEqual([
      { base: 1_000_000, rate: 0.06, tax: 60_000 },
      { base: 1_000_000, rate: 0.15, tax: 150_000 },
    ]);
  });
});

describe("thresholds", () => {
  it("zero income gives zero tax and zero rates", () => {
    const r = computeTax(inputs(), y2526);
    expect(r.assessableIncome).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.balancePayable).toBe(0);
    expect(r.effectiveRate).toBe(0);
    expect(r.marginalRate).toBe(0);
  });

  it("income exactly at the personal relief is not taxed", () => {
    const r = computeTax(inputs({ income: [salary(1_800_000)] }), y2526);
    expect(r.taxableIncome).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.marginalRate).toBe(0.06);
  });

  it("income just above the personal relief is taxed at the first band", () => {
    const r = computeTax(inputs({ income: [salary(1_800_100)] }), y2526);
    expect(r.taxableIncome).toBe(100);
    expect(r.totalTax).toBe(6);
  });

  it.each([
    [2_800_000, 60_000, 0.18],
    [3_300_000, 150_000, 0.24],
    [3_800_000, 270_000, 0.3],
    [4_300_000, 420_000, 0.36],
    [10_000_000, 420_000 + 5_700_000 * 0.36, 0.36],
  ])("salary of %d → tax %d, marginal rate %d", (amount, tax, marginal) => {
    const r = computeTax(inputs({ income: [salary(amount)] }), y2526);
    expect(r.totalTax).toBe(tax);
    expect(r.marginalRate).toBe(marginal);
  });

  it("matches the monthly APIT table: Rs. 250,000 a month", () => {
    // Table 01: 18% × 250,000 − 37,000 = 8,000 a month.
    const r = computeTax(inputs({ income: [salary(250_000 * 12)] }), y2526);
    expect(r.totalTax).toBe(8_000 * 12);
  });
});

describe("tax-year selection", () => {
  it("uses each year's own relief and bands", () => {
    const income = [salary(3_000_000)];
    // 2024/25: 1.8M taxable → 30k + 60k + 90k + 300k × 24% = 252,000
    expect(computeTax(inputs({ income }), y2425).totalTax).toBe(252_000);
    // 2025/26: 1.2M taxable → 60k + 200k × 18% = 96,000
    expect(computeTax(inputs({ income }), y2526).totalTax).toBe(96_000);
    expect(computeTax(inputs({ income }), y2627).totalTax).toBe(96_000);
  });

  it("treats remitted foreign-currency income as exempt in 2024/2025 and capped from 2025/2026", () => {
    const income: IncomeItem[] = [
      { label: "Export services", kind: "BUSINESS", amount: 6_000_000, foreignSource: true, foreignCurrencyRemitted: true },
    ];
    const before = computeTax(inputs({ income }), y2425);
    expect(before.assessableIncome).toBe(0);
    expect(before.excludedLines).toHaveLength(1);

    // 2025/26: 4.2M taxable, no local income → first 1M at 6%, balance at 15% (Guide Annexure 7).
    const after = computeTax(inputs({ income }), y2526);
    expect(after.totalTax).toBe(60_000 + 3_200_000 * 0.15);
  });

  it("applies the capital gains rate in force on the date of realisation", () => {
    const gain = (date: string): IncomeItem => ({ label: `Land ${date}`, kind: "CAPITAL_GAIN", amount: 1_000_000, date });
    expect(computeTax(inputs({ income: [gain("2026-06-02")] }), y2627).totalTax).toBe(100_000);
    expect(computeTax(inputs({ income: [gain("2026-06-03")] }), y2627).totalTax).toBe(150_000);

    const both = computeTax(inputs({ income: [gain("2026-05-01"), gain("2026-09-01")] }), y2627);
    expect(both.totalTax).toBe(250_000);
    expect(both.taxLines.filter((l) => l.code === "CAPITAL_GAINS")).toHaveLength(2);
    expect(computeTax(inputs({ income: [gain("2025-09-01")] }), y2526).totalTax).toBe(100_000);
  });

  it("refuses to calculate when a required rule is missing rather than guessing", () => {
    const broken = { ...y2526, rules: y2526.rules.filter((r) => r.ruleType !== "TAX_BANDS") };
    expect(() => computeTax(inputs({ income: [salary(3_000_000)] }), broken)).toThrow(TaxRuleMissingError);
  });
});

describe("reliefs and qualifying payments", () => {
  it("personal relief cannot be used against capital gains", () => {
    const r = computeTax(
      inputs({ income: [{ label: "Land", kind: "CAPITAL_GAIN", amount: 1_000_000, date: "2025-08-01" }] }),
      y2526,
    );
    expect(r.totalDeductions).toBe(0);
    expect(r.taxableIncome).toBe(1_000_000);
    expect(r.totalTax).toBe(100_000);
  });

  it("gives rent relief of 25% to residents only", () => {
    const income: IncomeItem[] = [{ label: "Rent", kind: "RENT", amount: 4_000_000 }];
    const resident = computeTax(inputs({ income }), y2526);
    expect(resident.taxableIncome).toBe(4_000_000 - 1_000_000 - 1_800_000);
    const nonResident = computeTax(inputs({ income, residency: "NON_RESIDENT_CITIZEN" }), y2526);
    expect(nonResident.reliefLines.map((l) => l.code)).toEqual(["PERSONAL_RELIEF"]);
  });

  it("gives no personal relief to a non-resident non-citizen", () => {
    const r = computeTax(inputs({ income: [salary(1_000_000)], residency: "NON_RESIDENT" }), y2526);
    expect(r.reliefLines).toHaveLength(0);
    expect(r.totalTax).toBe(60_000);
  });

  it("caps solar relief at Rs. 600,000 a year", () => {
    const r = computeTax(
      inputs({ income: [salary(5_000_000)], qualifyingPayments: [{ label: "Solar", kind: "SOLAR_PANEL", amount: 2_000_000 }] }),
      y2526,
    );
    expect(r.reliefLines.find((l) => l.code === "SOLAR_RELIEF")?.amount).toBe(600_000);
  });

  it("limits charity donations to one-third of taxable income when that is lower than Rs. 75,000", () => {
    const r = computeTax(
      inputs({ income: [salary(1_950_000)], qualifyingPayments: [{ label: "Charity", kind: "CHARITY_DONATION", amount: 60_000 }] }),
      y2526,
    );
    // Taxable before the donation is 150,000; one-third is 50,000.
    expect(r.qualifyingPaymentLines[0].amount).toBe(50_000);
    expect(r.taxableIncome).toBe(100_000);
  });

  it("does not let deductions create negative taxable income", () => {
    const r = computeTax(
      inputs({ income: [salary(500_000)], qualifyingPayments: [{ label: "Gov", kind: "GOVERNMENT_DONATION", amount: 900_000 }] }),
      y2526,
    );
    expect(r.taxableIncome).toBe(0);
    expect(r.totalDeductions).toBe(500_000);
    expect(r.totalTax).toBe(0);
  });
});

describe("business income", () => {
  it("deducts classified expenses from business income, never from salary", () => {
    const r = computeTax(
      inputs({
        income: [salary(3_000_000), { label: "Freelance", kind: "BUSINESS", amount: 1_000_000 }],
        deductibleExpenses: [{ label: "Software", amount: 400_000, pool: "LOCAL" }],
      }),
      y2526,
    );
    expect(r.incomeByCategory).toMatchObject({ employment: 3_000_000, business: 600_000 });
    expect(r.assessableIncome).toBe(3_600_000);
  });

  it("floors a business loss at zero and warns instead of reducing other income", () => {
    const r = computeTax(
      inputs({
        income: [salary(3_000_000), { label: "Shop", kind: "BUSINESS", amount: 200_000 }],
        deductibleExpenses: [{ label: "Stock", amount: 500_000, pool: "LOCAL" }],
      }),
      y2526,
    );
    expect(r.incomeByCategory.business).toBe(0);
    expect(r.assessableIncome).toBe(3_000_000);
    expect(r.warnings.map((w) => w.code)).toContain("BUSINESS_LOSS");
  });

  it("taxes betting, liquor and tobacco business income at the flat special rate", () => {
    const r = computeTax(inputs({ income: [{ label: "Liquor import", kind: "SPECIAL_RATE_BUSINESS", amount: 5_000_000 }] }), y2526);
    expect(r.totalTax).toBe((5_000_000 - 1_800_000) * 0.45);
    expect(computeTax(inputs({ income: [{ label: "Liquor import", kind: "SPECIAL_RATE_BUSINESS", amount: 5_000_000 }] }), y2425).totalTax).toBe(
      (5_000_000 - 1_200_000) * 0.4,
    );
  });

  it("rejects negative income and expenses", () => {
    expect(() => computeTax(inputs({ income: [salary(-1)] }), y2526)).toThrow(RangeError);
    expect(() =>
      computeTax(inputs({ income: [salary(1)], deductibleExpenses: [{ label: "x", amount: -1, pool: "LOCAL" }] }), y2526),
    ).toThrow(RangeError);
  });
});

describe("investment income", () => {
  it("excludes resident-company dividends and charges the final tax when it was not withheld", () => {
    const withheld = computeTax(
      inputs({ income: [{ label: "Dividend", kind: "DIVIDEND_RESIDENT_COMPANY", amount: 1_000_000, withholding: 150_000 }] }),
      y2526,
    );
    expect(withheld.assessableIncome).toBe(0);
    expect(withheld.totalTax).toBe(0);
    expect(withheld.totalCredits).toBe(0);

    const notWithheld = computeTax(
      inputs({ income: [{ label: "Dividend", kind: "DIVIDEND_RESIDENT_COMPANY", amount: 1_000_000 }] }),
      y2526,
    );
    expect(notWithheld.totalTax).toBe(150_000);
  });

  it("exempts small capital gains for residents within the annual limit", () => {
    const small: IncomeItem[] = [
      { label: "A", kind: "CAPITAL_GAIN", amount: 50_000, date: "2025-06-01" },
      { label: "B", kind: "CAPITAL_GAIN", amount: 40_000, date: "2025-07-01" },
    ];
    expect(computeTax(inputs({ income: small }), y2526).totalTax).toBe(0);

    const overAnnual: IncomeItem[] = [...small, { label: "C", kind: "CAPITAL_GAIN", amount: 600_000, date: "2025-08-01" }];
    expect(computeTax(inputs({ income: overAnnual }), y2526).totalTax).toBe(69_000);

    const nonResident = computeTax(inputs({ income: small, residency: "NON_RESIDENT_CITIZEN" }), y2526);
    expect(nonResident.totalTax).toBe(9_000);
  });

  it("excludes listed-share and principal-residence gains, and does not offset losses", () => {
    const r = computeTax(
      inputs({
        income: [
          { label: "CSE shares", kind: "CAPITAL_GAIN", amount: 5_000_000, capitalGainExemption: "LISTED_SHARES" },
          { label: "Home", kind: "CAPITAL_GAIN", amount: 9_000_000, capitalGainExemption: "PRINCIPAL_RESIDENCE" },
          { label: "Land loss", kind: "CAPITAL_GAIN", amount: -700_000, date: "2025-09-01" },
          { label: "Land gain", kind: "CAPITAL_GAIN", amount: 1_000_000, date: "2025-10-01" },
        ],
      }),
      y2526,
    );
    expect(r.totalTax).toBe(100_000);
    expect(r.excludedLines).toHaveLength(3);
    expect(r.warnings.map((w) => w.code)).toContain("CAPITAL_LOSS_NOT_OFFSET");
  });

  it("excludes income the user declares exempt and does not credit tax withheld on it", () => {
    const r = computeTax(
      inputs({
        income: [{ label: "FC account interest", kind: "INTEREST", amount: 300_000, withholding: 30_000, exemptReason: "Approved foreign-currency account" }],
      }),
      y2526,
    );
    expect(r.assessableIncome).toBe(0);
    expect(r.totalCredits).toBe(0);
    expect(r.warnings.map((w) => w.code)).toContain("WITHHOLDING_ON_EXCLUDED_INCOME");
  });

  it("taxes terminal benefits on their own concessionary bands", () => {
    const r = computeTax(
      inputs({ income: [salary(1_800_000), { label: "Gratuity", kind: "TERMINAL_BENEFIT", amount: 25_000_000 }] }),
      y2526,
    );
    expect(r.totalTax).toBe(10_000_000 * 0.06 + 5_000_000 * 0.12);
  });
});

describe("foreign income", () => {
  it("stacks capped foreign income on top of local income", () => {
    // Local taxable 500k uses half of the 6% band; foreign 1M gets 500k at 6% then 500k at 15%.
    const r = computeTax(
      inputs({
        income: [
          salary(2_300_000),
          { label: "Upwork", kind: "BUSINESS", amount: 1_000_000, foreignSource: true, foreignCurrencyRemitted: true },
        ],
      }),
      y2526,
    );
    expect(r.totalTax).toBe(30_000 + 30_000 + 75_000);
  });

  it("taxes un-remitted foreign income of a resident at normal rates with a proportional credit limit", () => {
    const r = computeTax(
      inputs({
        income: [
          salary(1_800_000),
          { label: "Overseas rent kept abroad", kind: "OTHER", amount: 1_000_000, foreignSource: true, foreignTaxPaid: 500_000 },
        ],
      }),
      y2526,
    );
    // Taxable 1M → 60,000; foreign share of the local pool is 1M / 2.8M.
    expect(r.totalTax).toBe(60_000);
    expect(r.creditLines.find((l) => l.code === "FOREIGN_TAX_CREDIT")?.amount).toBe(21_428.57);
    expect(r.warnings.map((w) => w.code)).toContain("FOREIGN_TAX_CREDIT_LIMITED");
  });

  it("excludes foreign-source income for non-residents", () => {
    const r = computeTax(
      inputs({
        residency: "NON_RESIDENT_CITIZEN",
        income: [salary(2_800_000), { label: "Dubai salary", kind: "SALARY", amount: 9_000_000, foreignSource: true }],
      }),
      y2526,
    );
    expect(r.assessableIncome).toBe(2_800_000);
    expect(r.totalTax).toBe(60_000);
  });
});

describe("credits and reconciliation", () => {
  it("reports a negative balance when withholding exceeds the liability", () => {
    const r = computeTax(inputs({ income: [salary(3_000_000, 150_000)] }), y2526);
    expect(r.totalTax).toBe(96_000);
    expect(r.balancePayable).toBe(-54_000);
  });

  it("adds payments of every kind to the credits", () => {
    const r = computeTax(
      inputs({
        income: [salary(6_000_000, 500_000), { label: "Land", kind: "CAPITAL_GAIN", amount: 1_000_000, date: "2025-05-05" }],
        payments: [
          { label: "Q1", kind: "INSTALMENT", amount: 100_000 },
          { label: "Final", kind: "FINAL_PAYMENT", amount: 50_000 },
          { label: "CGT", kind: "CAPITAL_GAINS_TAX", amount: 100_000 },
          { label: "Late APIT cert", kind: "APIT", amount: 10_000 },
          { label: "Bank cert", kind: "WITHHOLDING", amount: 5_000 },
          { label: "Other", kind: "OTHER", amount: 1_000 },
        ],
      }),
      y2526,
    );
    expect(r.totalCredits).toBe(766_000);
    expect(r.balancePayable).toBe(r.totalTax - 766_000);
  });

  it("handles partial-year employment as the income actually received", () => {
    const r = computeTax(inputs({ income: [salary(400_000 * 5, 5 * 50_000)] }), y2526);
    // 2,000,000 received → 200,000 taxable → 12,000; APIT of 250,000 was over-deducted.
    expect(r.totalTax).toBe(12_000);
    expect(r.balancePayable).toBe(-238_000);
  });

  it("is deterministic and does not mutate its inputs", () => {
    const input = inputs({ income: [salary(4_000_000, 100_000)] });
    const snapshot = JSON.stringify(input);
    const a = computeTax(input, y2526);
    const b = computeTax(input, y2526);
    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("records every rule version it relied on, with its source", () => {
    const r = computeTax(inputs({ income: [salary(4_000_000)] }), y2526);
    const types = r.rulesUsed.map((u) => u.ruleType);
    expect(types).toContain("PERSONAL_RELIEF");
    expect(types).toContain("TAX_BANDS");
    expect(r.rulesUsed.every((u) => u.source !== null)).toBe(true);
  });
});
