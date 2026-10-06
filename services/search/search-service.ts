import "server-only";
import { db } from "@/lib/db";
import { formatDate, formatLKR } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { PAYMENT_TYPE_LABELS } from "@/lib/validation/records";

export interface SearchHit {
  group: "Income" | "Expenses" | "Payments" | "Documents" | "Tax years";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const PER_GROUP = 6;

/** Link that switches to the record's tax year before opening the page. */
const go = (year: string, to: string) => `/go?year=${encodeURIComponent(year)}&to=${encodeURIComponent(to)}`;

/** Searches the signed-in user's own records. Every query is scoped by userId. */
export async function search(userId: string, rawQuery: string): Promise<SearchHit[]> {
  const q = rawQuery.trim().slice(0, 80);
  if (q.length < 2) return [];
  const contains = { contains: q, mode: "insensitive" as const };
  // A term such as "2026 APIT" should also match on its year.
  const year = q.match(/\b(20\d{2})\b/)?.[1];
  const words = q.replace(/\b20\d{2}\b/, "").trim();
  const text = words.length >= 2 ? { contains: words, mode: "insensitive" as const } : contains;
  const yearFilter = year ? { taxYear: { code: { contains: year } } } : {};

  const t = await getT();
  const [income, expenses, payments, documents, years] = await Promise.all([
    db.incomeEntry.findMany({
      where: { userId, deletedAt: null, ...yearFilter, OR: [{ description: text }, { source: { name: text } }] },
      include: { source: { select: { name: true } }, taxYear: { select: { code: true } } },
      orderBy: { receivedOn: "desc" },
      take: PER_GROUP,
    }),
    db.expense.findMany({
      where: { userId, deletedAt: null, ...yearFilter, OR: [{ description: text }, { category: text }] },
      include: { taxYear: { select: { code: true } } },
      orderBy: { incurredOn: "desc" },
      take: PER_GROUP,
    }),
    db.taxPayment.findMany({
      where: { userId, deletedAt: null, ...yearFilter, OR: [{ reference: text }, { bank: text }, { notes: text }] },
      include: { taxYear: { select: { code: true } } },
      orderBy: { paidOn: "desc" },
      take: PER_GROUP,
    }),
    db.document.findMany({
      where: { userId, deletedAt: null, OR: [{ title: contains }, { originalName: contains }] },
      orderBy: { createdAt: "desc" },
      take: PER_GROUP,
    }),
    db.taxYear.findMany({ where: { code: { contains: year ?? q } }, take: 3 }),
  ]);

  return [
    ...years.map((y): SearchHit => ({ group: "Tax years", id: y.id, title: t("Tax year {year}", { year: y.code }), subtitle: t("Switch to this year"), href: go(y.code, "/dashboard") })),
    ...income.map((i): SearchHit => ({
      group: "Income",
      id: i.id,
      title: i.description ?? i.source.name,
      subtitle: `${i.source.name} · ${formatLKR(Number(i.grossAmount))} · ${i.taxYear.code}`,
      href: go(i.taxYear.code, `/income?q=${encodeURIComponent(i.source.name)}`),
    })),
    ...expenses.map((e): SearchHit => ({
      group: "Expenses",
      id: e.id,
      title: e.description,
      subtitle: `${t(e.category)} · ${formatLKR(Number(e.amount))} · ${formatDate(e.incurredOn)}`,
      href: go(e.taxYear.code, `/expenses?q=${encodeURIComponent(e.description)}`),
    })),
    ...payments.map((p): SearchHit => ({
      group: "Payments",
      id: p.id,
      title: p.reference ?? t(PAYMENT_TYPE_LABELS[p.type]),
      subtitle: `${formatLKR(Number(p.amount))} · ${formatDate(p.paidOn)} · ${p.taxYear.code}`,
      href: go(p.taxYear.code, "/payments"),
    })),
    ...documents.map((d): SearchHit => ({ group: "Documents", id: d.id, title: d.title, subtitle: d.originalName, href: `/documents?q=${encodeURIComponent(d.title)}` })),
  ];
}
