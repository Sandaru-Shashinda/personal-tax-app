import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  children,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "primary";
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn("shadow-xs", tone === "primary" && "border-primary/20 bg-primary text-primary-foreground")}>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm font-medium", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>{label}</p>
          {Icon && <Icon className={cn("size-4", tone === "primary" ? "text-primary-foreground/70" : "text-muted-foreground")} aria-hidden />}
        </div>
        <p className="tabular text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{value}</p>
        {hint && <p className={cn("text-xs", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>{hint}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Server-side pagination links that preserve the current filters. */
export async function Pagination({ page, pageSize, total, basePath, params }: { page: number; pageSize: number; total: number; basePath: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  if (pages <= 1) return null;
  const t = await getT();
  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    query.set("page", String(target));
    return `${basePath}?${query.toString()}`;
  };
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
      <p>
        {t("Showing {from}–{to} of {total}", { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
      </p>
      <div className="flex items-center gap-1">
        <Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>
          {page > 1 ? (
            <Link href={href(page - 1)}>
              <ChevronLeft aria-hidden /> {t("Previous")}
            </Link>
          ) : (
            <span>
              <ChevronLeft aria-hidden /> {t("Previous")}
            </span>
          )}
        </Button>
        <Button asChild={page < pages} variant="outline" size="sm" disabled={page >= pages}>
          {page < pages ? (
            <Link href={href(page + 1)}>
              {t("Next")} <ChevronRight aria-hidden />
            </Link>
          ) : (
            <span>
              {t("Next")} <ChevronRight aria-hidden />
            </span>
          )}
        </Button>
      </div>
    </nav>
  );
}
