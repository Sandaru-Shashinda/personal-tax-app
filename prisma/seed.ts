// Seeds reference data (tax years, sources, rules, deadlines) and development accounts.
// Reference data is idempotent: re-running updates descriptions but never rewrites a rule
// version that already exists, because versions are immutable once seeded.

import { hash } from "@node-rs/argon2";
import { Prisma, PrismaClient } from "@prisma/client";
import { DEADLINES } from "../lib/tax/data/deadlines";
import { RULES, TAX_YEARS } from "../lib/tax/data/rules";
import { LAST_VERIFIED, SOURCES } from "../lib/tax/data/sources";
import { classifyExpense } from "../lib/tax/expense-classifier";
import { safeParseRuleParams } from "../lib/tax/rule-params";

const db = new PrismaClient();
const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const hashPassword = (password: string) => hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 });

async function seedReferenceData() {
  for (const y of TAX_YEARS) {
    await db.taxYear.upsert({
      where: { code: y.code },
      update: { startsOn: date(y.startsOn), endsOn: date(y.endsOn), status: y.status },
      create: { code: y.code, startsOn: date(y.startsOn), endsOn: date(y.endsOn), status: y.status },
    });
  }
  const years = new Map((await db.taxYear.findMany()).map((y) => [y.code, y.id]));

  for (const s of SOURCES) {
    const data = {
      title: s.title,
      authority: s.authority,
      url: s.url,
      documentType: s.documentType,
      publicationDate: s.publicationDate ? date(s.publicationDate) : null,
      notes: s.notes ?? null,
      lastCheckedAt: date(LAST_VERIFIED),
    };
    await db.taxRuleSource.upsert({ where: { ref: s.ref }, update: data, create: { ref: s.ref, ...data } });
  }
  const sources = new Map((await db.taxRuleSource.findMany()).map((s) => [s.ref, s.id]));

  let versions = 0;
  for (const r of RULES) {
    const taxYearId = years.get(r.taxYear)!;
    const rule = await db.taxRule.upsert({
      where: { taxYearId_ruleType_key: { taxYearId, ruleType: r.ruleType, key: r.key } },
      update: { name: r.name, description: r.description },
      create: { taxYearId, ruleType: r.ruleType, key: r.key, name: r.name, description: r.description },
    });
    for (const v of r.versions) {
      const parsed = safeParseRuleParams(r.ruleType, v.parameters);
      if (!parsed.success) throw new Error(`Invalid parameters for ${r.taxYear} ${r.ruleType}/${r.key} v${v.version}: ${parsed.error.message}`);
      const exists = await db.taxRuleVersion.findUnique({ where: { ruleId_version: { ruleId: rule.id, version: v.version } } });
      if (exists) continue;
      await db.taxRuleVersion.create({
        data: {
          ruleId: rule.id,
          version: v.version,
          parameters: v.parameters as Prisma.InputJsonValue,
          effectiveFrom: date(v.effectiveFrom),
          effectiveTo: v.effectiveTo ? date(v.effectiveTo) : null,
          status: "ACTIVE",
          verification: v.verification,
          sourceId: v.sourceRef ? (sources.get(v.sourceRef) ?? null) : null,
          sourceLocator: v.sourceLocator,
          notes: v.notes,
          lastVerifiedAt: date(LAST_VERIFIED),
          activatedAt: new Date(),
        },
      });
      versions++;
    }
  }

  for (const d of DEADLINES) {
    const taxYearId = years.get(d.taxYear)!;
    const data = {
      description: d.description,
      dueOn: date(d.dueOn),
      appliesTo: d.appliesTo,
      verification: d.verification,
      sourceId: sources.get(d.sourceRef) ?? null,
    };
    await db.taxDeadline.upsert({
      where: { taxYearId_type_title: { taxYearId, type: d.type, title: d.title } },
      update: data,
      create: { taxYearId, type: d.type, title: d.title, ...data },
    });
  }
  console.log(`Reference data: ${TAX_YEARS.length} tax years, ${SOURCES.length} sources, ${RULES.length} rules (${versions} new versions), ${DEADLINES.length} deadlines.`);
  return years;
}

async function seedAdmin() {
  const emails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const password = process.env.SEED_ADMIN_PASSWORD;
  for (const email of emails) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      await db.user.update({ where: { email }, data: { role: "ADMIN" } });
      continue;
    }
    if (!password) {
      console.log(`Admin ${email} not created: set SEED_ADMIN_PASSWORD to create it, or register and re-run the seed to promote it.`);
      continue;
    }
    await db.user.create({
      data: {
        email,
        role: "ADMIN",
        passwordHash: await hashPassword(password),
        emailVerifiedAt: new Date(),
        onboardingDoneAt: new Date(),
        profile: { create: { fullName: "Tax Rules Administrator" } },
        taxpayer: { create: { incomeTypes: ["SALARY"] } },
      },
    });
    console.log(`Admin account created: ${email}`);
  }
}

// ── Demo account. Entirely fictional: "Kasun Perera", a software engineer in Colombo.

const DEMO_EMAIL = "kasun.demo@example.lk";
const DEMO_PASSWORD = "demo-kasun-2026";
const CASH_LIMIT = 500_000;

async function seedDemo(years: Map<string, string>) {
  if (process.env.NODE_ENV === "production") return;
  if (await db.user.findUnique({ where: { email: DEMO_EMAIL } })) {
    console.log("Demo account already exists; left untouched.");
    return;
  }
  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      emailVerifiedAt: new Date(),
      onboardingDoneAt: new Date(),
      isDemo: true,
      profile: {
        create: {
          fullName: "Kasun Perera",
          dateOfBirth: date("1992-03-14"),
          phone: "+94 77 000 0000",
          addressLine1: "12 Sample Lane",
          city: "Nugegoda",
          district: "Colombo",
          province: "Western",
          postalCode: "10250",
        },
      },
      taxpayer: {
        create: { residencyStatus: "RESIDENT", employmentStatus: "BOTH", incomeTypes: ["SALARY", "FREELANCE", "INTEREST", "DIVIDEND"] },
      },
    },
  });
  const userId = user.id;

  const employer = await db.employer.create({ data: { userId, name: "Lanka Software Labs (Pvt) Ltd" } });
  const salary = await db.incomeSource.create({ data: { userId, type: "SALARY", name: employer.name, employerId: employer.id } });
  const freelance = await db.incomeSource.create({ data: { userId, type: "FREELANCE", name: "Freelance web development" } });
  const bank = await db.incomeSource.create({ data: { userId, type: "INTEREST", name: "Fixed deposit", institution: "Sample Bank PLC" } });
  const shares = await db.incomeSource.create({ data: { userId, type: "DIVIDEND", name: "Listed shares", institution: "Sample Holdings PLC" } });

  const salaryEntry = (year: string, start: string, months: number) =>
    db.incomeEntry.create({
      data: {
        userId,
        taxYearId: years.get(year)!,
        sourceId: salary.id,
        type: "SALARY",
        period: "MONTHLY",
        receivedOn: date(start),
        description: `Software Engineer salary, ${months} months`,
        grossAmount: 250_000 * months,
        withholdingTax: 8_000 * months, // APIT Table 01: 18% × 250,000 − 37,000
        salary: { create: { basicSalary: 200_000, allowances: 50_000, epfEmployee: 16_000, months } },
      },
    });
  await salaryEntry("2025/2026", "2025-04-01", 12);
  await salaryEntry("2026/2027", "2026-04-01", 6);

  const invoice = (year: string, on: string, client: string, no: string, amount: number, usd?: { amount: number; rate: number }) =>
    db.incomeEntry.create({
      data: {
        userId,
        taxYearId: years.get(year)!,
        sourceId: freelance.id,
        type: "FREELANCE",
        receivedOn: date(on),
        description: `${client} — invoice ${no}`,
        grossAmount: amount,
        ...(usd
          ? {
              currency: "USD",
              originalAmount: usd.amount,
              exchangeRate: usd.rate,
              exchangeRateSource: "Bank credit advice (demo figure)",
              exchangeRateDate: date(on),
              isForeignSource: true,
              remittedViaBank: true,
            }
          : {}),
        business: { create: { clientName: client, invoiceNumber: no, isServiceExport: Boolean(usd) } },
      },
    });
  await invoice("2025/2026", "2025-06-20", "Ceylon Crafts Online", "INV-2025-004", 180_000);
  await invoice("2025/2026", "2025-10-05", "Hill Country Tours", "INV-2025-009", 220_000);
  await invoice("2025/2026", "2026-01-18", "Northwind Studio (USA)", "INV-2026-001", 300_000, { amount: 1_000, rate: 300 });
  await invoice("2026/2027", "2026-05-12", "Ceylon Crafts Online", "INV-2026-006", 160_000);
  await invoice("2026/2027", "2026-08-03", "Northwind Studio (USA)", "INV-2026-011", 450_000, { amount: 1_500, rate: 300 });

  const interest = (year: string, on: string, amount: number) =>
    db.incomeEntry.create({
      data: {
        userId,
        taxYearId: years.get(year)!,
        sourceId: bank.id,
        type: "INTEREST",
        receivedOn: date(on),
        description: "Fixed deposit interest",
        grossAmount: amount,
        withholdingTax: amount * 0.1,
        investment: { create: { kind: "INTEREST", accountRef: "FD •••• 4471" } },
      },
    });
  await interest("2025/2026", "2026-03-31", 180_000);
  await interest("2026/2027", "2026-09-30", 95_000);

  await db.incomeEntry.create({
    data: {
      userId,
      taxYearId: years.get("2026/2027")!,
      sourceId: shares.id,
      type: "DIVIDEND",
      receivedOn: date("2026-07-15"),
      description: "Interim dividend",
      grossAmount: 40_000,
      withholdingTax: 6_000,
      investment: { create: { kind: "DIVIDEND_RESIDENT_COMPANY" } },
    },
  });

  const expense = (
    year: string,
    on: string,
    amount: number,
    category: string,
    description: string,
    opts: { source?: typeof freelance; capital?: boolean; confirmed?: boolean; percent?: number; method?: "CASH" | "CARD" | "BANK_TRANSFER" } = {},
  ) => {
    const c = classifyExpense(
      {
        amount,
        paymentMethod: opts.method ?? "CARD",
        isCapital: opts.capital ?? false,
        linkedSourceType: opts.source?.type ?? null,
        userConfirmedBusinessPurpose: opts.confirmed ?? false,
        businessUsePercent: opts.percent ?? 100,
      },
      CASH_LIMIT,
    );
    return db.expense.create({
      data: {
        userId,
        taxYearId: years.get(year)!,
        incomeSourceId: opts.source?.id ?? null,
        incurredOn: date(on),
        amount,
        category,
        description,
        paymentMethod: opts.method ?? "CARD",
        isCapital: opts.capital ?? false,
        userConfirmedBusinessPurpose: opts.confirmed ?? false,
        businessUsePercent: opts.percent ?? 100,
        deductibility: c.deductibility,
        deductibleAmount: c.deductibleAmount,
        deductibilityReason: c.reason,
      },
    });
  };
  await expense("2025/2026", "2025-05-02", 48_000, "Software & subscriptions", "Design and hosting subscriptions", { source: freelance, confirmed: true });
  await expense("2025/2026", "2025-09-10", 36_000, "Internet & phone", "Home fibre connection", { source: freelance, confirmed: true, percent: 50 });
  await expense("2026/2027", "2026-04-15", 24_000, "Software & subscriptions", "Hosting renewal", { source: freelance, confirmed: true });
  await expense("2026/2027", "2026-06-01", 420_000, "Equipment", "Laptop for client work", { source: freelance, capital: true, confirmed: true });
  await expense("2026/2027", "2026-07-08", 18_000, "Internet & phone", "Home fibre connection", { source: freelance, confirmed: true, percent: 50 });
  await expense("2026/2027", "2026-08-20", 15_000, "Professional fees", "Accountant consultation", { source: freelance });
  await expense("2026/2027", "2026-09-05", 32_000, "Personal", "Family dinner and groceries");

  await db.qualifyingPayment.create({
    data: { userId, taxYearId: years.get("2026/2027")!, type: "CHARITY_DONATION", paidOn: date("2026-05-20"), amount: 25_000, recipient: "Approved charitable institution (demo)" },
  });

  const payment = (year: string, on: string, amount: number, no: number) =>
    db.taxPayment.create({
      data: { userId, taxYearId: years.get(year)!, type: "INSTALMENT", paidOn: date(on), amount, instalmentNo: no, bank: "Sample Bank PLC", reference: `DEMO-${year.slice(2, 4)}${year.slice(7)}-${no}` },
    });
  await payment("2025/2026", "2025-08-14", 20_000, 1);
  await payment("2025/2026", "2025-11-14", 20_000, 2);
  await payment("2025/2026", "2026-02-13", 20_000, 3);
  await payment("2026/2027", "2026-08-14", 25_000, 1);

  console.log(`Demo account created: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

async function main() {
  const years = await seedReferenceData();
  await seedAdmin();
  await seedDemo(years);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
