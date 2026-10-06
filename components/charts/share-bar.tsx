import { formatLKR, formatPercent } from "@/lib/format";

export interface Share {
  label: string;
  value: number;
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/**
 * Parts of a whole as one segmented bar with a labelled legend. Every segment is named and
 * valued in text, so nothing depends on telling the colours apart.
 */
export function ShareBar({ items, title }: { items: Share[]; title: string }) {
  // Colour follows the item's position in the full list, so hiding zero items never repaints the rest.
  const coloured = items.map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] }));
  const visible = coloured.filter((i) => i.value > 0);
  const total = visible.reduce((t, i) => t + i.value, 0);
  if (total <= 0) return null;
  return (
    <figure className="space-y-4">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {visible.map((item) => (
          <div key={item.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(item.value / total) * 100}%`, background: item.color, minWidth: 4 }} />
        ))}
      </div>
      <dl className="grid gap-y-2.5">
        {visible.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} aria-hidden />
              <span className="truncate">{item.label}</span>
            </dt>
            <dd className="tabular shrink-0 font-medium">
              {formatLKR(item.value)} <span className="font-normal text-muted-foreground">· {formatPercent(item.value / total, 0)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
