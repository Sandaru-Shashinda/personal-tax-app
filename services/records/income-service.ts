import "server-only";
import type { IncomeType, Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { parseISODate, toISODate } from "@/lib/format";
import { round2 } from "@/lib/tax/money";
import type { IncomeEntryInput } from "@/lib/validation/records";
import { getTaxYear, type TaxYearInfo } from "@/services/tax/rule-repository";
import { recalculate } from "@/services/tax/tax-service";

const n = (value: Prisma.Decimal | null | undefined) => (value === null || value === undefined ? 0 : Number(value));

const entryInclude = {
  source: { include: { employer: true } },
  salary: true,
  business: true,
  rental: true,
  investment: true,
  capitalGain: true,
  _count: { select: { documents: { where: { deletedAt: null } } } },
} satisfies Prisma.IncomeEntryInclude;

type EntryRow = Prisma.IncomeEntryGetPayload<{ include: typeof entryInclude }>;

function toDTO(row: EntryRow) {
  return {
    id: row.id,
    type: row.type,
    period: row.period,
    sourceId: row.sourceId,
    sourceName: row.source.name,
    employerName: row.source.employer?.name ?? null,
    isPrimaryEmployment: row.source.isPrimaryEmployment,
    institution: row.source.institution,
    receivedOn: toISODate(row.receivedOn),
    description: row.description,
    grossAmount: n(row.grossAmount),
    withholdingTax: n(row.withholdingTax),
    currency: row.currency,
    originalAmount: row.originalAmount === null ? null : n(row.originalAmount),
    exchangeRate: row.exchangeRate === null ? null : n(row.exchangeRate),
    exchangeRateSource: row.exchangeRateSource,
    exchangeRateDate: row.exchangeRateDate ? toISODate(row.exchangeRateDate) : null,
    isForeignSource: row.isForeignSource,
    remittedViaBank: row.remittedViaBank,
    foreignTaxPaid: n(row.foreignTaxPaid),
    documentCount: row._count.documents,
    salary: row.salary && {
      basicSalary: n(row.salary.basicSalary),
      allowances: n(row.salary.allowances),
      bonuses: n(row.salary.bonuses),
      overtime: n(row.salary.overtime),
      benefits: n(row.salary.benefits),
      otherEmployment: n(row.salary.otherEmployment),
      terminalBenefits: n(row.salary.terminalBenefits),
      epfEmployee: n(row.salary.epfEmployee),
      otherDeductions: n(row.salary.otherDeductions),
      months: row.salary.months,
    },
    business: row.business && { ...row.business },
    rental: row.rental && { ...row.rental },
    investment: row.investment && { ...row.investment },
    capitalGain: row.capitalGain && {
      assetName: row.capitalGain.assetName,
      acquiredOn: toISODate(row.capitalGain.acquiredOn),
      acquisitionCost: n(row.capitalGain.acquisitionCost),
      disposalValue: n(row.capitalGain.disposalValue),
      allowableCosts: n(row.capitalGain.allowableCosts),
      exemption: row.capitalGain.exemption,
      taxPaid: n(row.capitalGain.taxPaid),
      gain: round2(n(row.capitalGain.disposalValue) - n(row.capitalGain.acquisitionCost) - n(row.capitalGain.allowableCosts)),
    },
  };
}

export type IncomeEntryDTO = ReturnType<typeof toDTO>;

export interface IncomeListQuery {
  page: number;
  pageSize: number;
  type?: IncomeType;
  q?: string;
}

export async function listIncome(userId: string, taxYearCode: string, query: IncomeListQuery) {
  const taxYear = await getTaxYear(taxYearCode);
  const where: Prisma.IncomeEntryWhereInput = {
    userId,
    taxYearId: taxYear.id,
    deletedAt: null,
    ...(query.type ? { type: query.type } : {}),
    ...(query.q
      ? { OR: [{ description: { contains: query.q, mode: "insensitive" } }, { source: { name: { contains: query.q, mode: "insensitive" } } }] }
      : {}),
  };
  const [rows, total, totals] = await Promise.all([
    db.incomeEntry.findMany({
      where,
      include: entryInclude,
      orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.incomeEntry.count({ where }),
    db.incomeEntry.groupBy({ by: ["type"], where: { userId, taxYearId: taxYear.id, deletedAt: null }, _sum: { grossAmount: true, withholdingTax: true }, _count: true }),
  ]);
  return {
    items: rows.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
    byType: totals.map((t) => ({ type: t.type, count: t._count, gross: n(t._sum.grossAmount), withheld: n(t._sum.withholdingTax) })),
  };
}

export async function listIncomeSources(userId: string) {
  const sources = await db.incomeSource.findMany({
    where: { userId, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });
  return sources;
}

function assertDateInYear(date: string, taxYear: TaxYearInfo, field: string) {
  if (date < taxYear.startsOn || date > taxYear.endsOn) {
    throw new AppError("Please check the highlighted fields.", 422, {
      [field]: [`This date is outside the ${taxYear.code} year of assessment (1 April – 31 March).`],
    });
  }
}

function assertForeignDetails(input: IncomeEntryInput) {
  if (input.currency === "LKR") return;
  const errors: Record<string, string[]> = {};
  if (input.originalAmount === undefined) errors.originalAmount = ["Enter the amount in the original currency"];
  if (input.exchangeRate === undefined) errors.exchangeRate = ["Enter the exchange rate you used"];
  if (!input.exchangeRateSource) errors.exchangeRateSource = ["Say where the rate came from (e.g. your bank's credit advice)"];
  if (Object.keys(errors).length > 0) throw new AppError("Foreign-currency income needs the original amount and the exchange rate.", 422, errors);
}

/** LKR totals stored on the entry, derived on the server from what the user typed. */
function amounts(input: IncomeEntryInput): { gross: number; withheld: number } {
  if (input.type === "SALARY") {
    const multiplier = input.period === "MONTHLY" ? input.months : 1;
    const regular = input.basicSalary + input.allowances + input.bonuses + input.overtime + input.benefits + input.otherEmployment;
    return { gross: round2(regular * multiplier), withheld: round2(input.withholdingTax * multiplier) };
  }
  if (input.type === "CAPITAL_GAIN") {
    return { gross: round2(Math.max(input.disposalValue - input.acquisitionCost - input.allowableCosts, 0)), withheld: 0 };
  }
  if (input.type === "RENTAL") {
    return { gross: round2(input.grossAmount * input.months), withheld: round2(input.withholdingTax * input.months) };
  }
  return { gross: input.grossAmount, withheld: input.withholdingTax };
}

async function resolveSource(tx: Prisma.TransactionClient, userId: string, input: IncomeEntryInput): Promise<string> {
  if (input.sourceId) {
    const source = await tx.incomeSource.findFirst({ where: { id: input.sourceId, userId, deletedAt: null } });
    if (!source) throw notFound("income source");
    return source.id;
  }
  const name =
    input.sourceName ??
    (input.type === "SALARY" ? input.employerName : undefined) ??
    (input.type === "RENTAL" ? input.propertyName : undefined) ??
    (input.type === "CAPITAL_GAIN" ? input.assetName : undefined) ??
    ("institution" in input ? input.institution : undefined) ??
    ("clientName" in input ? input.clientName : undefined);
  if (!name) throw new AppError("Please check the highlighted fields.", 422, { sourceName: ["Name this income source"] });

  const existing = await tx.incomeSource.findFirst({ where: { userId, type: input.type, name, deletedAt: null } });
  if (existing) return existing.id;

  let employerId: string | undefined;
  if (input.type === "SALARY") {
    const employer =
      (await tx.employer.findFirst({ where: { userId, name, deletedAt: null } })) ?? (await tx.employer.create({ data: { userId, name } }));
    employerId = employer.id;
  }
  const created = await tx.incomeSource.create({
    data: {
      userId,
      type: input.type,
      name,
      employerId,
      isPrimaryEmployment: input.type === "SALARY" ? input.isPrimaryEmployment : true,
      institution: "institution" in input ? input.institution : undefined,
    },
  });
  return created.id;
}

function detailData(input: IncomeEntryInput) {
  switch (input.type) {
    case "SALARY":
      return {
        salary: {
          basicSalary: input.basicSalary,
          allowances: input.allowances,
          bonuses: input.bonuses,
          overtime: input.overtime,
          benefits: input.benefits,
          otherEmployment: input.otherEmployment,
          terminalBenefits: input.terminalBenefits,
          epfEmployee: input.epfEmployee,
          otherDeductions: input.otherDeductions,
          months: input.period === "ANNUAL" ? 12 : input.months,
        },
      };
    case "FREELANCE":
    case "BUSINESS":
    case "PROFESSIONAL":
      return {
        business: {
          clientName: input.clientName,
          invoiceNumber: input.invoiceNumber,
          isServiceExport: input.isServiceExport,
          isSpecialRateBusiness: input.isSpecialRateBusiness,
        },
      };
    case "RENTAL":
      return { rental: { propertyName: input.propertyName, tenantName: input.tenantName, months: input.months } };
    case "INTEREST":
    case "DIVIDEND":
    case "INVESTMENT_OTHER":
      return {
        investment: {
          kind:
            input.type === "INTEREST"
              ? ("INTEREST" as const)
              : input.type === "INVESTMENT_OTHER"
                ? ("OTHER" as const)
                : input.dividendFromResidentCompany
                  ? ("DIVIDEND_RESIDENT_COMPANY" as const)
                  : ("DIVIDEND_OTHER" as const),
          accountRef: input.accountRef,
          isExempt: input.isExempt,
          exemptReason: input.isExempt ? input.exemptReason : null,
        },
      };
    case "CAPITAL_GAIN":
      return {
        capitalGain: {
          assetName: input.assetName,
          acquiredOn: parseISODate(input.acquiredOn),
          acquisitionCost: input.acquisitionCost,
          disposedOn: parseISODate(input.receivedOn),
          disposalValue: input.disposalValue,
          allowableCosts: input.allowableCosts,
          exemption: input.exemption,
          taxPaid: input.withholdingTax,
        },
      };
    default:
      return {};
  }
}

function entryData(input: IncomeEntryInput, taxYear: TaxYearInfo) {
  const { gross, withheld } = amounts(input);
  const foreign = input.currency !== "LKR";
  return {
    taxYearId: taxYear.id,
    type: input.type,
    period: input.type === "SALARY" ? input.period : input.type === "RENTAL" && input.months > 1 ? ("MONTHLY" as const) : ("ONE_OFF" as const),
    receivedOn: parseISODate(input.receivedOn),
    description: input.description,
    grossAmount: gross,
    withholdingTax: withheld,
    currency: input.currency,
    originalAmount: foreign ? input.originalAmount : null,
    exchangeRate: foreign ? input.exchangeRate : null,
    exchangeRateSource: foreign ? input.exchangeRateSource : null,
    exchangeRateDate: foreign && input.exchangeRateDate ? parseISODate(input.exchangeRateDate) : null,
    isForeignSource: input.isForeignSource || input.type === "FOREIGN",
    remittedViaBank: input.remittedViaBank,
    foreignTaxPaid: input.foreignTaxPaid,
  };
}

export async function createIncome(userId: string, input: IncomeEntryInput): Promise<string> {
  const taxYear = await getTaxYear(input.taxYear);
  assertDateInYear(input.receivedOn, taxYear, "receivedOn");
  assertForeignDetails(input);

  const entry = await db.$transaction(async (tx) => {
    const sourceId = await resolveSource(tx, userId, input);
    const detail = detailData(input);
    return tx.incomeEntry.create({
      data: {
        userId,
        sourceId,
        ...entryData(input, taxYear),
        ...Object.fromEntries(Object.entries(detail).map(([key, value]) => [key, { create: value }])),
      },
    });
  });
  await audit({ userId, action: "income.create", entity: "IncomeEntry", entityId: entry.id, after: input });
  await recalculate(userId, taxYear.code);
  return entry.id;
}

export async function updateIncome(userId: string, id: string, input: IncomeEntryInput): Promise<void> {
  const existing = await db.incomeEntry.findFirst({ where: { id, userId, deletedAt: null }, include: entryInclude });
  if (!existing) throw notFound("income record");
  if (existing.type !== input.type) throw new AppError("The type of an income record cannot be changed. Delete it and add a new one.");
  const taxYear = await getTaxYear(input.taxYear);
  assertDateInYear(input.receivedOn, taxYear, "receivedOn");
  assertForeignDetails(input);

  await db.$transaction(async (tx) => {
    const detail = detailData(input);
    await tx.incomeEntry.update({
      where: { id },
      data: {
        ...entryData(input, taxYear),
        ...Object.fromEntries(Object.entries(detail).map(([key, value]) => [key, { upsert: { create: value, update: value } }])),
      },
    });
    if (input.sourceName && input.sourceName !== existing.source.name) {
      await tx.incomeSource.update({ where: { id: existing.sourceId }, data: { name: input.sourceName } });
    }
  });
  await audit({ userId, action: "income.update", entity: "IncomeEntry", entityId: id, before: toDTO(existing), after: input });
  await recalculate(userId, taxYear.code);
}

export async function deleteIncome(userId: string, id: string): Promise<void> {
  const existing = await db.incomeEntry.findFirst({ where: { id, userId, deletedAt: null }, include: { ...entryInclude, taxYear: true } });
  if (!existing) throw notFound("income record");
  await db.incomeEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId, action: "income.delete", entity: "IncomeEntry", entityId: id, before: toDTO(existing) });
  await recalculate(userId, existing.taxYear.code);
}
