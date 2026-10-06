"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatLKR, formatLKRCompact } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/translate";

export interface MonthPoint {
  label: string;
  income: number;
  expenses: number;
}

const SERIES = [
  { key: "income", name: msg("Income"), color: "var(--chart-1)" },
  { key: "expenses", name: msg("Expenses"), color: "var(--chart-2)" },
] as const;

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey?: string | number; value?: number }[]; label?: string }) {
  const t = useT();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden />
            {t(s.name)}
          </span>
          <span className="tabular font-medium">{formatLKR(payload.find((p) => p.dataKey === s.key)?.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

/** Income and expenses per month. One shared rupee axis; the same data is available as a table below. */
export default function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const t = useT();
  return (
    <figure className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {t(s.name)}
          </span>
        ))}
      </div>
      <div className="h-56" role="img" aria-label={t("Bar chart of income and expenses for each month of the tax year. The figures are in the table that follows.")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--input)" }} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => formatLKRCompact(v).replace("Rs. ", "")} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip />} />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={t(s.name)} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground underline-offset-4 hover:underline">{t("View as a table")}</summary>
        <table className="tabular mt-2 w-full max-w-md text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 font-medium">{t("Month")}</th>
              <th scope="col" className="py-1 text-right font-medium">{t("Income")}</th>
              <th scope="col" className="py-1 text-right font-medium">{t("Expenses")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.label} className="border-t">
                <th scope="row" className="py-1 font-normal">{row.label}</th>
                <td className="py-1 text-right">{formatLKR(row.income)}</td>
                <td className="py-1 text-right">{formatLKR(row.expenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
