import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { draftVersionSchema } from "@/lib/admin-schemas";
import { db } from "@/lib/db";
import { incomeEntrySchema } from "@/lib/validation/records";
import { activateVersion, createDraftVersion, createTaxYear, discardDraft, listRulesForAdmin, previewDraftVersion } from "@/services/admin/rule-admin-service";
import { createIncome } from "@/services/records/income-service";
import { loadRuleSet } from "@/services/tax/rule-repository";
import { getCalculationSnapshot, getTaxSummary, listCalculations, recalculate } from "@/services/tax/tax-service";
import { publicEstimate } from "@/services/tax/public-estimate";
import { captureEmail, createUser, freshIp, removeUsers } from "./helpers";
import { request } from "./setup/env";

// Uses Y/A 2024/2025 so rule edits here cannot disturb the other integration files.
const YEAR = "2024/2025";
let admin: { id: string };
let user: { id: string };
const restore: (() => Promise<unknown>)[] = [];

beforeAll(async () => {
  captureEmail();
  admin = await createUser("admin");
  user = await createUser("taxpayer");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  for (const undo of restore.reverse()) await undo();
  await removeUsers(admin.id, user.id);
});

async function rule(ruleType: string, key: string) {
  const found = (await listRulesForAdmin(YEAR)).find((r) => r.ruleType === ruleType && r.key === key);
  if (!found) throw new Error(`rule ${ruleType}/${key} not seeded`);
  return found;
}

describe("rule versions and calculation history", () => {
  it("loads each year's own rules from the database", async () => {
    const relief = (code: string) => loadRuleSet(code).then((set) => set.rules.find((r) => r.ruleType === "PERSONAL_RELIEF")!.parameters);
    expect(await relief("2024/2025")).toMatchObject({ amount: 1_200_000 });
    expect(await relief("2026/2027")).toMatchObject({ amount: 1_800_000 });
    const gains = (await loadRuleSet("2026/2027")).rules.filter((r) => r.ruleType === "CAPITAL_GAINS_RATE");
    expect(gains.map((g) => [g.effectiveFrom, g.effectiveTo])).toEqual(expect.arrayContaining([["2026-04-01", "2026-06-02"], ["2026-06-03", null]]));
  });

  it("rejects malformed rule parameters and unsupported 'verified' claims", async () => {
    const relief = await rule("PERSONAL_RELIEF", "individual");
    const draft = (overrides: Record<string, unknown>) =>
      draftVersionSchema.parse({ ruleId: relief.id, parametersJson: JSON.stringify({ amount: 1_500_000, appliesTo: ["RESIDENT"] }), effectiveFrom: "2024-04-01", verification: "REQUIRES_VERIFICATION", ...overrides });
    await expect(createDraftVersion(admin.id, draft({ parametersJson: "{not json" }))).rejects.toThrow(/not valid JSON/);
    await expect(createDraftVersion(admin.id, draft({ parametersJson: JSON.stringify({ amount: -1, appliesTo: [] }) }))).rejects.toThrow(/do not match/);
    await expect(createDraftVersion(admin.id, draft({ effectiveFrom: "2026-01-01" }))).rejects.toMatchObject({ status: 422 });
    await expect(createDraftVersion(admin.id, draft({ verification: "VERIFIED", sourceId: "" }))).rejects.toMatchObject({ status: 422 });
  });

  it("previews a draft, then activating it changes new calculations but not saved ones", async () => {
    await createIncome(user.id, incomeEntrySchema.parse({ type: "SALARY", taxYear: YEAR, sourceName: "Employer", receivedOn: "2024-04-01", period: "ANNUAL", basicSalary: 3_000_000 }));
    const before = await getTaxSummary(user.id, YEAR);
    expect(before.result.totalTax).toBe(252_000);
    const [saved] = await listCalculations(user.id, YEAR);
    expect(saved.totalTax).toBe(252_000);

    const relief = await rule("PERSONAL_RELIEF", "individual");
    const original = relief.versions.find((v) => v.status === "ACTIVE")!;
    const versionId = await createDraftVersion(
      admin.id,
      draftVersionSchema.parse({ ruleId: relief.id, parametersJson: JSON.stringify({ amount: 1_500_000, appliesTo: ["RESIDENT", "NON_RESIDENT_CITIZEN"] }), effectiveFrom: "2024-04-01", verification: "REQUIRES_VERIFICATION", notes: "test" }),
    );
    restore.push(async () => {
      await db.taxRuleVersion.deleteMany({ where: { id: versionId } });
      await db.taxRuleVersion.update({ where: { id: original.id }, data: { status: "ACTIVE" } });
    });

    // A draft changes nothing until it is activated.
    expect((await getTaxSummary(user.id, YEAR)).result.totalTax).toBe(252_000);

    const preview = await previewDraftVersion(versionId);
    const scenario = preview.scenarios.find((s) => s.id === "salary-300k")!;
    expect(scenario.error).toBeNull();
    expect(scenario.before).toBeGreaterThan(scenario.after!);
    expect(scenario.difference).toBe(scenario.after! - scenario.before!);

    await activateVersion(admin.id, versionId);
    const versions = (await rule("PERSONAL_RELIEF", "individual")).versions;
    expect(versions.find((v) => v.id === versionId)?.status).toBe("ACTIVE");
    expect(versions.find((v) => v.id === original.id)?.status).toBe("SUPERSEDED");

    // New calculations use the new version: taxable 1.5M → 30k + 60k + 90k = 180,000.
    const after = await recalculate(user.id, YEAR, "user");
    expect(after.changed).toBe(true);
    expect(after.summary.result.totalTax).toBe(180_000);
    expect(after.summary.result.rulesUsed.find((r) => r.ruleType === "PERSONAL_RELIEF")?.id).toBe(versionId);

    // The earlier snapshot is untouched and still records the rule version it used.
    const snapshot = await getCalculationSnapshot(user.id, saved.id);
    expect(snapshot?.result.totalTax).toBe(252_000);
    expect(snapshot?.result.rulesUsed.find((r) => r.ruleType === "PERSONAL_RELIEF")?.id).toBe(original.id);
    expect(await getCalculationSnapshot(admin.id, saved.id)).toBeNull();
    const history = await listCalculations(user.id, YEAR);
    expect(history.map((h) => h.totalTax)).toEqual([180_000, 252_000]);
    expect(history.filter((h) => h.isLatest)).toHaveLength(1);

    // The change is audited with before and after, and affected users are told.
    const log = await db.auditLog.findFirst({ where: { action: "taxrule.activated", entityId: versionId } });
    expect(log?.userId).toBe(admin.id);
    expect(JSON.stringify(log?.after)).toContain("1500000");
    expect(await db.notification.count({ where: { userId: user.id, type: "TAX_RULE_UPDATED" } })).toBe(1);
    await expect(activateVersion(admin.id, versionId)).rejects.toMatchObject({ status: 409 });
  });

  it("splits a rule mid-year: the earlier version keeps the earlier period", async () => {
    const gains = await rule("CAPITAL_GAINS_RATE", "individual");
    const original = gains.versions.find((v) => v.status === "ACTIVE")!;
    const versionId = await createDraftVersion(
      admin.id,
      draftVersionSchema.parse({ ruleId: gains.id, parametersJson: JSON.stringify({ rate: 0.2 }), effectiveFrom: "2024-10-01", verification: "REQUIRES_VERIFICATION" }),
    );
    restore.push(async () => {
      await db.taxRuleVersion.deleteMany({ where: { id: versionId } });
      await db.taxRuleVersion.update({ where: { id: original.id }, data: { effectiveTo: null, status: "ACTIVE" } });
    });
    await activateVersion(admin.id, versionId);
    const active = (await rule("CAPITAL_GAINS_RATE", "individual")).versions.filter((v) => v.status === "ACTIVE");
    expect(active.map((v) => [v.effectiveFrom, v.effectiveTo]).sort()).toEqual([["2024-04-01", "2024-09-30"], ["2024-10-01", null]]);
  });

  it("discards drafts but never active versions", async () => {
    const relief = await rule("RENT_RELIEF", "investment_asset");
    const versionId = await createDraftVersion(
      admin.id,
      draftVersionSchema.parse({ ruleId: relief.id, parametersJson: JSON.stringify({ percent: 0.3, appliesTo: ["RESIDENT"] }), effectiveFrom: "2024-04-01", verification: "REQUIRES_VERIFICATION" }),
    );
    await discardDraft(admin.id, versionId);
    await expect(discardDraft(admin.id, relief.versions[0].id)).rejects.toMatchObject({ status: 409 });
  });

  it("opens a new tax year with every rule as an unverified draft", async () => {
    const code = "2027/2028";
    await createTaxYear(admin.id, code);
    restore.push(() => db.taxYear.delete({ where: { code } }).catch(() => undefined));
    restore.push(() => db.taxRule.deleteMany({ where: { taxYear: { code } } }));
    const rules = await db.taxRuleVersion.findMany({ where: { rule: { taxYear: { code } } } });
    expect(rules.length).toBeGreaterThan(10);
    expect(rules.every((r) => r.status === "DRAFT" && r.verification === "REQUIRES_VERIFICATION")).toBe(true);
    // With no active rules the engine refuses to calculate rather than guess.
    request.reset(freshIp());
    await expect(publicEstimate({ taxYear: code, annualSalary: 3_000_000, businessIncome: 0, businessExpenses: 0, interestIncome: 0, rentalIncome: 0, otherIncome: 0 })).rejects.toThrow(/No active/);
    await expect(createTaxYear(admin.id, code)).rejects.toMatchObject({ status: 422 });
  });

  it("serves the public estimate from stored rules and rate-limits it", async () => {
    request.reset(freshIp());
    const result = await publicEstimate({ taxYear: "2026/2027", annualSalary: 3_600_000, businessIncome: 0, businessExpenses: 0, interestIncome: 0, rentalIncome: 0, otherIncome: 250_000 });
    expect(result.taxableIncome).toBe(2_050_000);
    expect(result.totalTax).toBe(285_000);
    const calls = Array.from({ length: 61 }, () => publicEstimate({ taxYear: "2026/2027", annualSalary: 1, businessIncome: 0, businessExpenses: 0, interestIncome: 0, rentalIncome: 0, otherIncome: 0 }).then(() => 200, (e: { status?: number }) => e.status));
    expect((await Promise.all(calls)).filter((s) => s === 429).length).toBeGreaterThanOrEqual(1);
  });
});
