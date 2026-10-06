import { describe, expect, it } from "vitest";
import { buildSeedRuleSet } from "@/lib/tax/data/rules";
import { computeTax } from "@/lib/tax/engine";
import type { TaxInputs } from "@/lib/tax/types";

// The six worked examples in the IRD "Guide to fill the Return of Income — Individual,
// Y/A 2025/2026" (Asmt_IIT_004_E, pp. 39–49). The engine must reproduce IRD's own figures.

const rules = buildSeedRuleSet("2025/2026");

const base: TaxInputs = { residency: "RESIDENT", income: [], deductibleExpenses: [], qualifyingPayments: [], payments: [] };

describe("IRD Guide worked examples, Y/A 2025/2026", () => {
  it("Example 1 — salary and bank interest", () => {
    const result = computeTax(
      {
        ...base,
        income: [
          { label: "Salary", kind: "SALARY", amount: 240_000 * 12, withholding: 74_400 },
          { label: "Interest", kind: "INTEREST", amount: 140_000, withholding: 14_000 },
        ],
      },
      rules,
    );
    expect(result.assessableIncome).toBe(3_020_000);
    expect(result.taxableIncome).toBe(1_220_000);
    expect(result.totalTax).toBe(99_600);
    expect(result.balancePayable).toBe(11_200);
  });

  it("Example 2 — foreign and local lecturing fees with a foreign tax credit", () => {
    const result = computeTax(
      {
        ...base,
        income: [
          {
            label: "Foreign lecturing fee",
            kind: "BUSINESS",
            amount: 9_000_000,
            foreignSource: true,
            foreignCurrencyRemitted: true,
            foreignTaxPaid: 1_800_000, // 20% withheld in the source country
          },
          { label: "Local lecturing fee", kind: "BUSINESS", amount: 5_000_000, withholding: 250_000 },
        ],
        payments: [{ label: "Instalment", kind: "INSTALMENT", amount: 400_000 }],
      },
      rules,
    );
    expect(result.assessableIncome).toBe(14_000_000);
    expect(result.taxableIncome).toBe(12_200_000);
    expect(result.totalTax).toBe(1_350_000 + 672_000);
    // The credit is limited to Sri Lankan tax on the foreign income, not the 1.8M paid abroad.
    expect(result.creditLines.find((l) => l.code === "FOREIGN_TAX_CREDIT")?.amount).toBe(1_350_000);
    expect(result.balancePayable).toBe(22_000);
  });

  it("Example 3 — content creator with local and foreign audiences", () => {
    const result = computeTax(
      {
        ...base,
        income: [
          { label: "YouTube — local", kind: "BUSINESS", amount: 10_760_000 },
          { label: "Sponsorship — local", kind: "BUSINESS", amount: 28_840_000 },
          { label: "YouTube — foreign", kind: "BUSINESS", amount: 33_360_000, foreignSource: true, foreignCurrencyRemitted: true },
          { label: "Sponsorship — foreign", kind: "BUSINESS", amount: 49_920_000, foreignSource: true, foreignCurrencyRemitted: true },
          { label: "Guest lecturing", kind: "BUSINESS", amount: 890_000, withholding: 44_500 },
        ],
        qualifyingPayments: [{ label: "Government school", kind: "GOVERNMENT_DONATION", amount: 2_500_000 }],
        payments: [{ label: "Instalments", kind: "INSTALMENT", amount: 8_160_000 }],
      },
      rules,
    );
    expect(result.assessableIncome).toBe(123_770_000);
    expect(result.totalTax).toBe(25_040_400);
    expect(result.balancePayable).toBe(16_835_900);
  });

  it("Example 4 — employment, business, interest, rent, solar and donations", () => {
    const result = computeTax(
      {
        ...base,
        income: [
          { label: "Employment", kind: "SALARY", amount: 7_500_000, withholding: 1_571_316 },
          { label: "Business", kind: "BUSINESS", amount: 11_500_000 },
          { label: "Solar electricity", kind: "BUSINESS", amount: 240_000 },
          { label: "Interest", kind: "INTEREST", amount: 8_000_000, withholding: 800_000 },
          { label: "Rent", kind: "RENT", amount: 1_900_000, withholding: 190_000 },
        ],
        qualifyingPayments: [
          { label: "District hospital", kind: "GOVERNMENT_DONATION", amount: 1_000_000 },
          { label: "Samurdhi shop", kind: "SAMURDHI_SHOP", amount: 800_000 },
          { label: "Solar balance", kind: "SOLAR_PANEL", amount: 200_000 },
        ],
      },
      rules,
    );
    expect(result.assessableIncome).toBe(29_140_000);
    expect(result.reliefLines.find((l) => l.code === "RENT_RELIEF")?.amount).toBe(475_000);
    expect(result.taxableIncome).toBe(24_865_000);
    expect(result.totalTax).toBe(8_471_400);
    expect(result.balancePayable).toBe(5_910_084);
  });

  it("Example 5 — two employments, dividends under final withholding", () => {
    const result = computeTax(
      {
        ...base,
        income: [
          { label: "University", kind: "SALARY", amount: 9_000_000, withholding: 3_912_000 },
          { label: "NARA consultancy", kind: "SALARY", amount: 5_000_000 },
          { label: "Solar electricity", kind: "BUSINESS", amount: 360_000 },
          { label: "Rent", kind: "RENT", amount: 1_800_000, withholding: 180_000 },
          { label: "Interest", kind: "INTEREST", amount: 4_500_000, withholding: 450_000 },
          { label: "Dividend", kind: "DIVIDEND_RESIDENT_COMPANY", amount: 500_000, withholding: 75_000 },
        ],
        qualifyingPayments: [
          { label: "Solar balance", kind: "SOLAR_PANEL", amount: 400_000 },
          { label: "Government school", kind: "GOVERNMENT_DONATION", amount: 250_000 },
          { label: "Approved charity", kind: "CHARITY_DONATION", amount: 200_000 },
        ],
        payments: [{ label: "Instalment", kind: "INSTALMENT", amount: 800_000 }],
      },
      rules,
    );
    expect(result.assessableIncome).toBe(20_660_000);
    expect(result.qualifyingPaymentLines.find((l) => l.code === "CHARITY_DONATION")?.amount).toBe(75_000);
    expect(result.taxableIncome).toBe(17_685_000);
    expect(result.totalTax).toBe(5_886_600);
    expect(result.balancePayable).toBe(544_600);
    expect(result.excludedLines).toHaveLength(1);
    expect(result.finalWithholdingTax).toBe(75_000);
  });

  it("Example 6 — remote employee of a foreign company paid in USD", () => {
    const result = computeTax(
      {
        ...base,
        income: [
          {
            label: "US employer",
            kind: "SALARY",
            amount: 16_380_000,
            withholding: 2_142_000,
            foreignSource: true,
            foreignCurrencyRemitted: true,
          },
          { label: "Fixed deposit interest", kind: "INTEREST", amount: 3_600_000, withholding: 360_000 },
          { label: "Rent", kind: "RENT", amount: 1_080_000 },
        ],
        qualifyingPayments: [{ label: "SOS Children's Village", kind: "CHARITY_DONATION", amount: 200_000 }],
        payments: [{ label: "Instalments", kind: "INSTALMENT", amount: 365_000 }],
      },
      rules,
    );
    expect(result.assessableIncome).toBe(21_060_000);
    expect(result.taxableIncome).toBe(18_915_000);
    expect(result.totalTax).toBe(2_889_600);
    expect(result.balancePayable).toBe(22_600);
  });
});
