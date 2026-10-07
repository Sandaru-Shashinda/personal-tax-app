import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { expenseSchema, importSchema, incomeEntrySchema } from "@/lib/validation/records";
import { getMonthlySeries } from "@/services/insights/year-facts";
import { createExpense, listExpenses } from "@/services/records/expense-service";
import { importRecords } from "@/services/records/import-service";
import { createIncome, listIncome } from "@/services/records/income-service";
import { getTaxSummary, listCalculations } from "@/services/tax/tax-service";
import { captureEmail, createUser, removeUsers } from "./helpers";

const YEAR = "2025/2026";
let carol: { id: string; email: string };
let dave: { id: string; email: string };
let shop: string;

beforeAll(async () => {
  captureEmail();
  carol = await createUser("carol");
  dave = await createUser("dave");
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => removeUsers(carol.id, dave.id));

describe("monthly totals", () => {
  it("records a business month's takings as one entry dated the first of the month", async () => {
    await createIncome(carol.id, incomeEntrySchema.parse({ type: "BUSINESS", taxYear: YEAR, sourceName: "Corner shop", receivedOn: "2025-06-17", grossAmount: 480000, period: "MONTHLY" }));
    const list = await listIncome(carol.id, YEAR, { page: 1, pageSize: 10 });
    expect(list.items[0]).toMatchObject({ period: "MONTHLY", receivedOn: "2025-06-01", grossAmount: 480_000 });
    shop = list.items[0].sourceId;

    expect((await getTaxSummary(carol.id, YEAR)).result.incomeByCategory.business).toBe(480_000);
    const taxYear = await db.taxYear.findUniqueOrThrow({ where: { code: YEAR } });
    const june = (await getMonthlySeries(carol.id, taxYear.id, "2025-04-01")).find((m) => m.key === "2025-06");
    expect(june?.income).toBe(480_000);
  });

  it("does not apply the single cash payment limit to a month's total", async () => {
    const cash = (overrides: Record<string, unknown>) =>
      expenseSchema.parse({ taxYear: YEAR, incurredOn: "2025-06-20", amount: 600000, category: "Travel & transport", description: "Deliveries", paymentMethod: "CASH", incomeSourceId: shop, userConfirmedBusinessPurpose: true, ...overrides });
    await createExpense(carol.id, cash({ description: "One cash payment" }));
    await createExpense(carol.id, cash({ description: "June deliveries", period: "MONTHLY" }));

    const byName = Object.fromEntries((await listExpenses(carol.id, YEAR, { page: 1, pageSize: 10 })).items.map((e) => [e.description, e]));
    expect(byName["One cash payment"]).toMatchObject({ period: "ONE_OFF", incurredOn: "2025-06-20", deductibility: "NON_DEDUCTIBLE" });
    expect(byName["June deliveries"]).toMatchObject({ period: "MONTHLY", incurredOn: "2025-06-01", deductibility: "DEDUCTIBLE", deductibleAmount: 600_000 });
    expect(byName["June deliveries"].deductibilityReason).toMatch(/total of several cash payments/);
    // Only the month's total reached the calculation.
    expect((await getTaxSummary(carol.id, YEAR)).inputs.deductibleExpenses.map((e) => e.label)).toEqual(["June deliveries"]);
  });
});

describe("statement import", () => {
  const statement = (overrides: Record<string, unknown> = {}) =>
    importSchema.parse({
      taxYear: YEAR,
      paymentMethod: "BANK_TRANSFER",
      expenseSourceId: shop,
      userConfirmedBusinessPurpose: true,
      incomeType: "BUSINESS",
      incomeSourceName: "Corner shop",
      expenses: [
        { incurredOn: "2025-07-02", amount: "3,500.00", category: "Internet & phone", description: "DIALOG BROADBAND" },
        { incurredOn: "2025-07-05", amount: 12000, category: "Personal", description: "KEELLS SUPER" },
        { incurredOn: "2025-08-11", amount: 41000, category: "Travel & transport", description: "9 imported transactions", period: "MONTHLY" },
      ],
      income: [
        { receivedOn: "2025-07-03", amount: 45000, description: "CEFT FROM ABC TRADERS" },
        { receivedOn: "2025-08-19", amount: 510000, description: "212 imported transactions", period: "MONTHLY" },
      ],
      ...overrides,
    });

  it("saves the rows in one go, classifies them and recalculates once", async () => {
    const before = (await listCalculations(carol.id, YEAR)).length;
    expect(await importRecords(carol.id, statement())).toEqual({ income: 2, expenses: 3, duplicates: 0 });
    expect(await listCalculations(carol.id, YEAR)).toHaveLength(before + 1);

    const expenses = Object.fromEntries((await listExpenses(carol.id, YEAR, { page: 1, pageSize: 20 })).items.map((e) => [e.description, e]));
    expect(expenses["DIALOG BROADBAND"]).toMatchObject({ amount: 3500, incomeSourceId: shop, deductibility: "DEDUCTIBLE", paymentMethod: "BANK_TRANSFER" });
    // A personal row is never linked to the business, whatever the batch setting.
    expect(expenses["KEELLS SUPER"]).toMatchObject({ incomeSourceId: null, deductibility: "NON_DEDUCTIBLE" });
    expect(expenses["9 imported transactions"]).toMatchObject({ period: "MONTHLY", incurredOn: "2025-08-01", deductibleAmount: 41_000 });

    const income = (await listIncome(carol.id, YEAR, { page: 1, pageSize: 20 })).items;
    expect(income).toHaveLength(3);
    expect(income.every((entry) => entry.sourceId === shop && entry.business !== null)).toBe(true);
    expect(income.find((entry) => entry.description === "212 imported transactions")).toMatchObject({ period: "MONTHLY", receivedOn: "2025-08-01", grossAmount: 510_000 });
  });

  it("skips rows that were imported before, so overlapping statements are not counted twice", async () => {
    const overlap = statement({ expenses: [...statement().expenses, { incurredOn: "2025-09-01", amount: 900, category: "Bank charges", description: "ANNUAL FEE" }] });
    expect(await importRecords(carol.id, overlap)).toEqual({ income: 0, expenses: 1, duplicates: 5 });
    expect((await listIncome(carol.id, YEAR, { page: 1, pageSize: 20 })).total).toBe(3);
  });

  it("rejects rows outside the tax year, empty imports and another user's income source", async () => {
    await expect(importRecords(carol.id, statement({ income: [{ receivedOn: "2024-12-01", amount: 5, description: "Old" }] }))).rejects.toMatchObject({ status: 422 });
    await expect(importRecords(dave.id, statement())).rejects.toMatchObject({ status: 404 });
    expect((await listExpenses(dave.id, YEAR, { page: 1, pageSize: 10 })).total).toBe(0);
    expect(importSchema.safeParse({ taxYear: YEAR, expenses: [], income: [] }).success).toBe(false);
    expect(importSchema.safeParse({ taxYear: YEAR, expenses: [], income: [{ receivedOn: "2025-07-03", amount: 1 }] }).success).toBe(false);
  });
});
