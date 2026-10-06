"use client";

import {
  CalendarDays,
  Calculator,
  CreditCard,
  FileBarChart,
  FolderLock,
  LayoutDashboard,
  MoreHorizontal,
  Receipt,
  Settings,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: msg("Dashboard"), icon: LayoutDashboard },
  { href: "/income", label: msg("Income"), icon: Wallet },
  { href: "/expenses", label: msg("Expenses"), icon: Receipt },
  { href: "/tax", label: msg("Tax"), icon: Calculator },
  { href: "/payments", label: msg("Payments"), icon: CreditCard },
  { href: "/documents", label: msg("Documents"), icon: FolderLock },
  { href: "/reports", label: msg("Reports"), icon: FileBarChart },
  { href: "/calendar", label: msg("Calendar"), icon: CalendarDays },
  { href: "/settings", label: msg("Settings"), icon: Settings },
];
const ADMIN_ITEM: NavItem = { href: "/admin", label: msg("Tax rules admin"), icon: ShieldCheck };
const MOBILE_PRIMARY = ["/dashboard", "/income", "/expenses", "/tax"];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const isActive = useIsActive();
  const t = useT();
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
  return (
    <nav aria-label={t("Main")} className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            isActive(href) && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom navigation on phones: four primary destinations and a sheet with the rest. */
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const isActive = useIsActive();
  const t = useT();
  const [open, setOpen] = useState(false);
  const primary = ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
  const rest = [...ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href)), ...(isAdmin ? [ADMIN_ITEM] : [])];
  const tab = "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[0.7rem] font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  return (
    <nav aria-label={t("Main")} className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {primary.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn(tab, isActive(href) && "text-primary")}>
          <Icon className="size-5" aria-hidden />
          {t(label)}
        </Link>
      ))}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className={cn(tab, rest.some((i) => isActive(i.href)) && "text-primary")}>
          <MoreHorizontal className="size-5" aria-hidden />
          {t("More")}
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>{t("More")}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-6">
            {rest.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn("flex flex-col items-center gap-1.5 rounded-xl border px-2 py-4 text-center text-xs font-medium", isActive(href) && "border-primary/40 bg-accent text-accent-foreground")}
              >
                <Icon className="size-5" aria-hidden />
                {t(label)}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
