import "server-only";
import type { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { toISODate } from "@/lib/format";
import type { Translate } from "@/lib/i18n/translate";
import { computeTax, ENGINE_VERSION } from "@/lib/tax/engine";
import { round2 } from "@/lib/tax/money";
import type {
  DeductibleExpenseItem,
  IncomeItem,
  Line,
  PaymentItem,
  QualifyingPaymentItem,
  Residency,
  RuleSet,
  TaxInputs,
  TaxResult,
} from "@/lib/tax/types";
import { getTaxYear, loadRuleSet, type TaxYearInfo } from "./rule-repository";

const n = (value: Prisma.Decimal | number | null | undefined): number => (value === null || value === undefined ? 0 : Number(value));

/** Reads everything the engine needs for one user and one tax year, in four queries. */
export async function buildTaxInputs(userId: string, taxYear: TaxYearInfo): Promise<TaxInputs> {
  const where = { userId, taxYearId: taxYear.id, deletedAt: null };
  const [entries, expenses, qualifyingPayments, payments, yearProfile, taxpayer] = await Promise.all([
    db.incomeEntry.findMany({
      where,
      include: { source: { select: { name: true } }, salary: true, business: true, rental: true, investment: true, capitalGain: true },
      orderBy: { receivedOn: "asc" },
    }),
    db.expense.findMany({
      where: { ...where, deductibleAmount: { gt: 0 }, incomeSourceId: { not: null } },
      select: { id: true, description: true, deductibleAmount: true, incomeSourceId: true },
    }),
    db.qualifyingPayment.findMany({ where, orderBy: { paidOn: "asc" } }),
    db.taxPayment.findMany({ where, orderBy: { paidOn: "asc" } }),
    db.taxpayerYear.findUnique({ where: { userId_taxYearId: { userId, taxYearId: taxYear.id } } }),
    db.taxpayer.findUnique({ where: { userId } }),
  ]);

  const residency: Residency = yearProfile?.residencyStatus ?? taxpayer?.residencyStatus ?? "RESIDENT";
  const income: IncomeItem[] = [];
  // Which business pool each income source feeds, so its expenses land in the same pool.
  const sourcePool = new Map<string, DeductibleExpenseItem["pool"]>();

  for (const entry of entries) {
    const label = entry.description ? `${entry.source.name} — ${entry.description}` : entry.source.name;
    const common = {
      id: entry.id,
      label,
      date: toISODate(entry.receivedOn),
      withholding: n(entry.withholdingTax),
      foreignSource: entry.isForeignSource || entry.type === "FOREIGN",
      foreignCurrencyRemitted: entry.remittedViaBank,
      foreignTaxPaid: n(entry.foreignTaxPaid),
    };
    const gross = n(entry.grossAmount);

    switch (entry.type) {
      case "SALARY": {
        income.push({ ...common, kind: "SALARY", amount: gross });
        const terminal = n(entry.salary?.terminalBenefits);
        if (terminal > 0) {
          income.push({ id: `${entry.id}:terminal`, label: `${entry.source.name} — terminal benefits`, kind: "TERMINAL_BENEFIT", amount: terminal });
        }
        break;
      }
      case "FREELANCE":
      case "BUSINESS":
      case "PROFESSIONAL": {
        const special = entry.business?.isSpecialRateBusiness ?? false;
        income.push({ ...common, kind: special ? "SPECIAL_RATE_BUSINESS" : "BUSINESS", amount: gross });
        const pool = special ? "SPECIAL_RATE" : entry.remittedViaBank ? "FOREIGN_REMITTED" : "LOCAL";
        // A source with any local receipts keeps its expenses in the local pool.
        if (sourcePool.get(entry.sourceId) !== "LOCAL") sourcePool.set(entry.sourceId, pool);
        break;
      }
      case "RENTAL":
        income.push({ ...common, kind: "RENT", amount: gross });
        break;
      case "INTEREST":
      case "DIVIDEND":
      case "INVESTMENT_OTHER": {
        const kind =
          entry.type === "INTEREST"
            ? "INTEREST"
            : entry.type === "INVESTMENT_OTHER"
              ? "INVESTMENT_OTHER"
              : entry.investment?.kind === "DIVIDEND_OTHER"
                ? "DIVIDEND_OTHER"
                : "DIVIDEND_RESIDENT_COMPANY";
        income.push({
          ...common,
          kind,
          amount: gross,
          exemptReason: entry.investment?.isExempt ? (entry.investment.exemptReason ?? "Declared exempt") : undefined,
        });
        break;
      }
      case "CAPITAL_GAIN": {
        const cg = entry.capitalGain;
        if (!cg) break;
        income.push({
          ...common,
          kind: "CAPITAL_GAIN",
          amount: round2(n(cg.disposalValue) - n(cg.acquisitionCost) - n(cg.allowableCosts)),
          date: toISODate(cg.disposedOn),
          withholding: n(cg.taxPaid),
          capitalGainExemption: cg.exemption,
        });
        break;
      }
      default:
        income.push({ ...common, kind: "OTHER", amount: gross });
    }
  }

  const deductibleExpenses: DeductibleExpenseItem[] = expenses
    .filter((e) => e.incomeSourceId && sourcePool.has(e.incomeSourceId))
    .map((e) => ({ id: e.id, label: e.description, amount: n(e.deductibleAmount), pool: sourcePool.get(e.incomeSourceId!)! }));

  const qp: QualifyingPaymentItem[] = qualifyingPayments.map((q) => ({ id: q.id, label: q.recipient, kind: q.type, amount: n(q.amount) }));
  const paid: PaymentItem[] = payments.map((p) => ({
    id: p.id,
    label: p.reference ?? p.type,
    kind: p.type,
    amount: n(p.amount),
    date: toISODate(p.paidOn),
  }));

  return { residency, income, deductibleExpenses, qualifyingPayments: qp, payments: paid };
}

export interface TaxSummary {
  taxYear: TaxYearInfo;
  inputs: TaxInputs;
  result: TaxResult;
  ruleSet: RuleSet;
}

/**
 * Live, server-side calculation for a user's tax year. Nothing is persisted. Pages pass their
 * translator so labels and explanations come back in the reader's language; stored snapshots and
 * exports call it without one and stay in English.
 */
export async function getTaxSummary(userId: string, taxYearCode: string, t?: Translate): Promise<TaxSummary> {
  const taxYear = await getTaxYear(taxYearCode);
  const [inputs, ruleSet] = await Promise.all([buildTaxInputs(userId, taxYear), loadRuleSet(taxYear.code)]);
  return { taxYear, inputs, result: computeTax(inputs, ruleSet, t), ruleSet };
}

function snapshotItems(result: TaxResult) {
  const rows: { kind: "INCOME" | "EXCLUDED" | "RELIEF" | "QUALIFYING_PAYMENT" | "TAX" | "CREDIT" | "TOTAL"; line: Line }[] = [
    ...result.incomeLines.map((line) => ({ kind: "INCOME" as const, line })),
    ...result.excludedLines.map((line) => ({ kind: "EXCLUDED" as const, line })),
    { kind: "TOTAL", line: { code: "ASSESSABLE_INCOME", label: "Assessable income", amount: result.assessableIncome } },
    ...result.reliefLines.map((line) => ({ kind: "RELIEF" as const, line })),
    ...result.qualifyingPaymentLines.map((line) => ({ kind: "QUALIFYING_PAYMENT" as const, line })),
    { kind: "TOTAL", line: { code: "TAXABLE_INCOME", label: "Taxable income", amount: result.taxableIncome } },
    ...result.taxLines.map((line) => ({ kind: "TAX" as const, line })),
    { kind: "TOTAL", line: { code: "TOTAL_TAX", label: "Total tax", amount: result.totalTax } },
    ...result.creditLines.map((line) => ({ kind: "CREDIT" as const, line })),
    { kind: "TOTAL", line: { code: "BALANCE_PAYABLE", label: "Balance payable", amount: result.balancePayable } },
  ];
  return rows.map(({ kind, line }, position) => ({
    position,
    kind,
    code: line.code.slice(0, 60),
    label: line.label.slice(0, 200),
    amount: line.amount,
    rate: line.rate ?? null,
    ruleVersionId: line.ruleId && /^[0-9a-f-]{36}$/.test(line.ruleId) ? line.ruleId : null,
  }));
}

/**
 * Calculates and stores an immutable snapshot when anything (inputs or rule versions) differs
 * from the latest one. Earlier snapshots are kept untouched, so history survives rule changes.
 */
export async function recalculate(userId: string, taxYearCode: string, reason: "user" | "data_change" = "data_change") {
  const summary = await getTaxSummary(userId, taxYearCode);
  const { taxYear, inputs, result } = summary;
  const inputHash = sha256(
    JSON.stringify({ inputs, rules: result.rulesUsed.map((r) => r.id).sort(), all: summary.ruleSet.rules.map((r) => r.id).sort(), engine: ENGINE_VERSION }),
  );
  const latest = await db.taxCalculation.findFirst({ where: { userId, taxYearId: taxYear.id, isLatest: true } });
  if (latest?.inputHash === inputHash) return { summary, calculationId: latest.id, changed: false };

  const created = await db.$transaction(async (tx) => {
    await tx.taxCalculation.updateMany({ where: { userId, taxYearId: taxYear.id, isLatest: true }, data: { isLatest: false } });
    return tx.taxCalculation.create({
      data: {
        userId,
        taxYearId: taxYear.id,
        engineVersion: ENGINE_VERSION,
        assessableIncome: result.assessableIncome,
        taxableIncome: result.taxableIncome,
        totalTax: result.totalTax,
        totalCredits: result.totalCredits,
        balancePayable: result.balancePayable,
        inputs: inputs as unknown as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        ruleSnapshot: result.rulesUsed as unknown as Prisma.InputJsonValue,
        inputHash,
        items: { create: snapshotItems(result) },
      },
    });
  });
  await audit({
    userId,
    action: latest ? "tax.calculation_changed" : "tax.calculation_performed",
    entity: "TaxCalculation",
    entityId: created.id,
    before: latest ? { totalTax: Number(latest.totalTax), balancePayable: Number(latest.balancePayable) } : undefined,
    after: { totalTax: result.totalTax, balancePayable: result.balancePayable, reason },
  });
  return { summary, calculationId: created.id, changed: true };
}

export async function listCalculations(userId: string, taxYearCode: string, take = 20) {
  const taxYear = await getTaxYear(taxYearCode);
  const rows = await db.taxCalculation.findMany({
    where: { userId, taxYearId: taxYear.id },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, createdAt: true, isLatest: true, assessableIncome: true, taxableIncome: true, totalTax: true, totalCredits: true, balancePayable: true, engineVersion: true },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    isLatest: r.isLatest,
    engineVersion: r.engineVersion,
    assessableIncome: Number(r.assessableIncome),
    taxableIncome: Number(r.taxableIncome),
    totalTax: Number(r.totalTax),
    totalCredits: Number(r.totalCredits),
    balancePayable: Number(r.balancePayable),
  }));
}

/** A stored snapshot, exactly as calculated at the time. Ownership is enforced by the userId predicate. */
export async function getCalculationSnapshot(userId: string, calculationId: string) {
  const row = await db.taxCalculation.findFirst({ where: { id: calculationId, userId }, include: { taxYear: true } });
  if (!row) return null;
  return { id: row.id, createdAt: row.createdAt.toISOString(), taxYear: row.taxYear.code, result: row.result as unknown as TaxResult };
}

/** Total tax of the most recent stored calculation for the year before `taxYear`, if any. */
export async function getPriorYearTax(userId: string, taxYear: TaxYearInfo): Promise<{ code: string; totalTax: number } | null> {
  const prior = await db.taxYear.findFirst({ where: { endsOn: { lt: new Date(`${taxYear.startsOn}T00:00:00Z`) } }, orderBy: { endsOn: "desc" } });
  if (!prior) return null;
  const hasData = await db.incomeEntry.count({ where: { userId, taxYearId: prior.id, deletedAt: null } });
  if (hasData === 0) return null;
  const summary = await getTaxSummary(userId, prior.code);
  return { code: prior.code, totalTax: summary.result.totalTax };
}
