import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { expenseSchema, incomeEntrySchema, paymentSchema, qualifyingPaymentSchema } from "@/lib/validation/records";
import { completeOnboarding, getAccount } from "@/services/account/account-service";
import { deleteDocument, listDocuments, readDocument, uploadDocument } from "@/services/documents/document-service";
import { getYearFacts } from "@/services/insights/year-facts";
import { listNotifications, markAllNotificationsRead, syncDeadlineReminders } from "@/services/notifications/notification-service";
import { createExpense, createQualifyingPayment, deleteExpense, listExpenses, updateExpense } from "@/services/records/expense-service";
import { createIncome, deleteIncome, listIncome, updateIncome } from "@/services/records/income-service";
import { createPayment, deletePayment, getInstalmentSchedule, listPayments } from "@/services/records/payment-service";
import { buildCsv, buildTaxSummaryPdf } from "@/services/reports/report-service";
import { search } from "@/services/search/search-service";
import { getTaxSummary, listCalculations } from "@/services/tax/tax-service";
import { healthChecks, healthScore, insights, returnIssues } from "@/lib/tax/health";
import { captureEmail, createUser, removeUsers } from "./helpers";

const YEAR = "2025/2026";
let alice: { id: string; email: string };
let bob: { id: string; email: string };

beforeAll(async () => {
  captureEmail();
  alice = await createUser("alice");
  bob = await createUser("bob");
  await completeOnboarding(alice.id, {
    fullName: "Alice Fernando", residencyStatus: "RESIDENT", employmentStatus: "BOTH", tin: "123456789", nic: "199012345678",
    incomeTypes: ["SALARY", "FREELANCE", "INTEREST"],
  } as never);
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => removeUsers(alice.id, bob.id));

const salary = (overrides: Record<string, unknown> = {}) =>
  incomeEntrySchema.parse({ type: "SALARY", taxYear: YEAR, sourceName: "Lanka Tech (Pvt) Ltd", receivedOn: "2025-04-01", period: "MONTHLY", months: 12, basicSalary: "250,000", withholdingTax: 8000, ...overrides });

describe("onboarding", () => {
  it("stores the profile, encrypts the NIC and never returns it in full", async () => {
    const account = await getAccount(alice.id);
    expect(account.taxpayer.tin).toBe("123456789");
    expect(account.taxpayer.nicMasked).toBe("••••••••5678");
    expect((await db.taxpayer.findUniqueOrThrow({ where: { userId: alice.id } })).nicEncrypted).not.toContain("199012345678");
    expect((await db.user.findUniqueOrThrow({ where: { id: alice.id } })).onboardingDoneAt).not.toBeNull();
  });
});

describe("income", () => {
  it("creates salary from monthly figures and feeds the calculation", async () => {
    const id = await createIncome(alice.id, salary());
    const list = await listIncome(alice.id, YEAR, { page: 1, pageSize: 10 });
    expect(list.total).toBe(1);
    expect(list.items[0]).toMatchObject({ id, grossAmount: 3_000_000, withholdingTax: 96_000, sourceName: "Lanka Tech (Pvt) Ltd" });

    const { result } = await getTaxSummary(alice.id, YEAR);
    expect(result.totalTax).toBe(96_000);
    expect(result.balancePayable).toBe(0);
    // Saving the record stored a calculation snapshot.
    expect(await listCalculations(alice.id, YEAR)).toHaveLength(1);
  });

  it("rejects dates outside the tax year and foreign income without its exchange details", async () => {
    await expect(createIncome(alice.id, salary({ receivedOn: "2024-12-01" }))).rejects.toMatchObject({ status: 422 });
    const usd = incomeEntrySchema.parse({ type: "FREELANCE", taxYear: YEAR, sourceName: "US client", receivedOn: "2025-09-01", grossAmount: 300000, currency: "USD" });
    const error = await createIncome(alice.id, usd).catch((e: AppError) => e);
    expect((error as AppError).fieldErrors).toHaveProperty("exchangeRate");
    expect(incomeEntrySchema.safeParse({ type: "FREELANCE", taxYear: YEAR, receivedOn: "2025-09-01", grossAmount: -5 }).success).toBe(false);
  });

  it("keeps the original currency, rate and rate source alongside the LKR amount", async () => {
    await createIncome(
      alice.id,
      incomeEntrySchema.parse({
        type: "FREELANCE", taxYear: YEAR, sourceName: "Northwind (USA)", receivedOn: "2025-09-01", grossAmount: 300000, currency: "USD", originalAmount: 1000,
        exchangeRate: 300, exchangeRateSource: "Bank credit advice", isForeignSource: true, remittedViaBank: true, isServiceExport: true,
      }),
    );
    const list = await listIncome(alice.id, YEAR, { page: 1, pageSize: 10, type: "FREELANCE" });
    expect(list.items[0]).toMatchObject({ currency: "USD", originalAmount: 1000, exchangeRate: 300, exchangeRateSource: "Bank credit advice", remittedViaBank: true });
    const { result } = await getTaxSummary(alice.id, YEAR);
    expect(result.taxLines.some((l) => l.code === "FOREIGN_CAPPED")).toBe(true);
  });

  it("never lets one user read, change or delete another user's income", async () => {
    const mine = (await listIncome(alice.id, YEAR, { page: 1, pageSize: 10, type: "SALARY" })).items[0];
    expect((await listIncome(bob.id, YEAR, { page: 1, pageSize: 10 })).total).toBe(0);
    await expect(updateIncome(bob.id, mine.id, salary({ basicSalary: 1 }))).rejects.toMatchObject({ status: 404 });
    await expect(deleteIncome(bob.id, mine.id)).rejects.toMatchObject({ status: 404 });
    // Bob cannot attach a record to Alice's income source either.
    await expect(createIncome(bob.id, salary({ sourceId: mine.sourceId, sourceName: undefined }))).rejects.toMatchObject({ status: 404 });
    expect((await listIncome(alice.id, YEAR, { page: 1, pageSize: 10, type: "SALARY" })).items[0].grossAmount).toBe(3_000_000);
  });

  it("updates and soft-deletes, with an audit trail", async () => {
    const id = await createIncome(alice.id, incomeEntrySchema.parse({ type: "INTEREST", taxYear: YEAR, sourceName: "Fixed deposit", receivedOn: "2026-03-31", grossAmount: 100000, withholdingTax: 10000 }));
    await updateIncome(alice.id, id, incomeEntrySchema.parse({ type: "INTEREST", taxYear: YEAR, sourceName: "Fixed deposit", receivedOn: "2026-03-31", grossAmount: 180000, withholdingTax: 18000 }));
    expect((await listIncome(alice.id, YEAR, { page: 1, pageSize: 10, q: "fixed" })).items[0].grossAmount).toBe(180_000);
    await deleteIncome(alice.id, id);
    expect((await listIncome(alice.id, YEAR, { page: 1, pageSize: 10, q: "fixed" })).total).toBe(0);
    expect((await db.incomeEntry.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
    const actions = (await db.auditLog.findMany({ where: { userId: alice.id, entityId: id } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["income.create", "income.update", "income.delete"]));
  });
});

describe("expenses", () => {
  const expense = (overrides: Record<string, unknown>) =>
    expenseSchema.parse({ taxYear: YEAR, incurredOn: "2025-10-01", amount: 60000, category: "Software & subscriptions", description: "Hosting", paymentMethod: "CARD", ...overrides });

  it("classifies expenses and explains each treatment", async () => {
    const sources = await db.incomeSource.findMany({ where: { userId: alice.id } });
    const freelance = sources.find((s) => s.type === "FREELANCE")!.id;
    const employment = sources.find((s) => s.type === "SALARY")!.id;

    await createExpense(alice.id, expense({ description: "Groceries", category: "Personal" }));
    await createExpense(alice.id, expense({ description: "Work shoes", incomeSourceId: employment, userConfirmedBusinessPurpose: true }));
    const review = await createExpense(alice.id, expense({ description: "Hosting", incomeSourceId: freelance }));
    await createExpense(alice.id, expense({ description: "Laptop", amount: 400000, incomeSourceId: freelance, isCapital: true, userConfirmedBusinessPurpose: true }));
    await createExpense(alice.id, expense({ description: "Cash rent", amount: 500000, paymentMethod: "CASH", incomeSourceId: freelance, userConfirmedBusinessPurpose: true }));
    await createExpense(alice.id, expense({ description: "Internet", amount: 36000, incomeSourceId: freelance, userConfirmedBusinessPurpose: true, businessUsePercent: 50 }));

    const byName = Object.fromEntries((await listExpenses(alice.id, YEAR, { page: 1, pageSize: 20 })).items.map((e) => [e.description, e]));
    expect(byName.Groceries.deductibility).toBe("NON_DEDUCTIBLE");
    expect(byName["Work shoes"].deductibilityReason).toMatch(/employment income/);
    expect(byName.Hosting.deductibility).toBe("REQUIRES_REVIEW");
    expect(byName.Laptop.deductibilityReason).toMatch(/capital/);
    expect(byName["Cash rent"].deductibilityReason).toMatch(/cash/);
    expect(byName.Internet).toMatchObject({ deductibility: "PARTIALLY_DEDUCTIBLE", deductibleAmount: 18_000 });

    const before = (await getTaxSummary(alice.id, YEAR)).result.incomeByCategory.business;
    await updateExpense(alice.id, review, expense({ description: "Hosting", incomeSourceId: freelance, userConfirmedBusinessPurpose: true }));
    const after = (await getTaxSummary(alice.id, YEAR)).result.incomeByCategory.business;
    expect(before - after).toBe(60_000);

    await expect(deleteExpense(bob.id, review)).rejects.toMatchObject({ status: 404 });
    await expect(createExpense(bob.id, expense({ incomeSourceId: freelance }))).rejects.toMatchObject({ status: 404 });
    expect(expenseSchema.safeParse({ ...expense({}), incurredOn: "2999-01-01" }).success).toBe(false);
  });

  it("applies the statutory cap to a charity donation", async () => {
    await createQualifyingPayment(alice.id, qualifyingPaymentSchema.parse({ taxYear: YEAR, type: "CHARITY_DONATION", paidOn: "2025-12-01", amount: 200000, recipient: "Approved charity" }));
    const { result } = await getTaxSummary(alice.id, YEAR);
    expect(result.qualifyingPaymentLines.find((l) => l.code === "CHARITY_DONATION")?.amount).toBe(75_000);
  });
});

describe("payments and reconciliation", () => {
  it("asks for confirmation before recording a payment above the outstanding estimate", async () => {
    const { result } = await getTaxSummary(alice.id, YEAR);
    const payment = (overrides: Record<string, unknown> = {}) => paymentSchema.parse({ taxYear: YEAR, type: "INSTALMENT", paidOn: "2025-08-14", amount: 10_000_000, instalmentNo: 1, ...overrides });
    await expect(createPayment(alice.id, payment())).rejects.toMatchObject({ status: 409 });
    await expect(createPayment(alice.id, payment({ paidOn: "2025-03-01", amount: 100 }))).rejects.toMatchObject({ status: 422 });

    const amount = Math.max(Math.min(result.balancePayable, 5_000), 1);
    const id = await createPayment(alice.id, payment({ amount, reference: "REF-778" }));
    const after = await getTaxSummary(alice.id, YEAR);
    expect(after.result.totalCredits).toBe(result.totalCredits + amount);
    expect(after.result.balancePayable).toBe(result.balancePayable - amount);

    const schedule = await getInstalmentSchedule(alice.id, YEAR);
    expect(schedule.rows).toHaveLength(4);
    expect(schedule.rows[0].amountPaid).toBe(amount);

    expect((await listPayments(bob.id, YEAR, { page: 1, pageSize: 10 })).total).toBe(0);
    await expect(deletePayment(bob.id, id)).rejects.toMatchObject({ status: 404 });
    expect((await search(alice.id, "REF-778")).some((h) => h.group === "Payments")).toBe(true);
    expect(await search(bob.id, "REF-778")).toHaveLength(0);
  });
});

describe("documents", () => {
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

  it("accepts only real PDF and image files, by content, and serves them only to the owner", async () => {
    const meta = { title: "T.10 certificate", category: "APIT_DOCUMENT" as const, taxYear: YEAR };
    await expect(uploadDocument(alice.id, { name: "malware.pdf", data: Buffer.from("MZ\x90\x00 not a pdf") }, meta)).rejects.toThrow(/Only PDF/);
    await expect(uploadDocument(alice.id, { name: "empty.pdf", data: Buffer.alloc(0) }, meta)).rejects.toThrow(/empty/);
    await expect(uploadDocument(alice.id, { name: "big.pdf", data: Buffer.concat([pdf, Buffer.alloc(10 * 1024 * 1024)]) }, meta)).rejects.toThrow(/10 MB/);

    const id = await uploadDocument(alice.id, { name: "../../etc/t10 <2026>.pdf", data: pdf }, meta);
    const listed = (await listDocuments(alice.id, { page: 1, pageSize: 10 })).items[0];
    expect(listed).toMatchObject({ id, mimeType: "application/pdf", taxYear: YEAR });
    expect(listed.originalName).not.toMatch(/[/<>]/);
    expect((await readDocument(alice.id, id)).data.equals(pdf)).toBe(true);

    await expect(readDocument(bob.id, id)).rejects.toMatchObject({ status: 404 });
    await expect(deleteDocument(bob.id, id)).rejects.toMatchObject({ status: 404 });
    expect((await listDocuments(bob.id, { page: 1, pageSize: 10 })).total).toBe(0);
    // Bob cannot attach a file to Alice's records.
    const source = await db.incomeSource.findFirstOrThrow({ where: { userId: alice.id } });
    await expect(uploadDocument(bob.id, { name: "x.pdf", data: pdf }, { ...meta, incomeSourceId: source.id })).rejects.toMatchObject({ status: 404 });

    await deleteDocument(alice.id, id);
    await expect(readDocument(alice.id, id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("insights, reminders and reports", () => {
  it("derives the health score, insights and return checks from the user's records", async () => {
    const summary = await getTaxSummary(alice.id, YEAR);
    const facts = await getYearFacts(alice.id, summary, false);
    const checks = healthChecks(facts);
    expect(checks.find((c) => c.id === "tin")?.passed).toBe(true);
    expect(checks.find((c) => c.id === "email")?.passed).toBe(false);
    expect(checks.find((c) => c.id === "apit_certificate")?.passed).toBe(false);
    expect(healthScore(checks)).toBeGreaterThan(0);
    expect(healthScore(checks)).toBeLessThan(100);
    expect(insights(facts).some((i) => i.id === "effective")).toBe(true);
    expect(returnIssues(facts).some((i) => /certificate/i.test(i.message))).toBe(true);
  });

  it("raises each deadline reminder once", async () => {
    await syncDeadlineReminders(alice.id);
    const first = await listNotifications(alice.id);
    await syncDeadlineReminders(alice.id);
    const second = await listNotifications(alice.id);
    expect(second.items).toHaveLength(first.items.length);
    await markAllNotificationsRead(alice.id);
    expect((await listNotifications(alice.id)).unread).toBe(0);
  });

  it("exports CSV that neutralises formula cells, and a PDF summary", async () => {
    await createIncome(alice.id, incomeEntrySchema.parse({ type: "OTHER", taxYear: YEAR, sourceName: "=HYPERLINK(\"http://evil\")", receivedOn: "2025-07-01", grossAmount: 1000 }));
    const csv = await buildCsv(alice.id, YEAR, "income");
    expect(csv.filename).toBe("income-2025-2026.csv");
    expect(csv.body).toContain("'=HYPERLINK");
    for (const kind of ["expenses", "payments", "tax-summary"] as const) expect((await buildCsv(alice.id, YEAR, kind)).body.length).toBeGreaterThan(20);
    const pdf = await buildTaxSummaryPdf(alice.id, YEAR);
    expect(Buffer.from(pdf.bytes.subarray(0, 5)).toString()).toBe("%PDF-");
  });
});
