"use client";

import { Bell, CalendarRange, Check, ChevronsUpDown, FileText, LogOut, Receipt, Search, Settings, Wallet, CreditCard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { logoutAction } from "@/app/actions/auth";
import { markAllNotificationsReadAction, markNotificationReadAction, setTaxYearAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { SearchHit } from "@/services/search/search-service";

export function TaxYearSwitcher({ years, selected }: { years: { code: string; status: string }[]; selected: string }) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={pending} aria-label={t("Tax year {year}. Change tax year", { year: selected })}>
          <CalendarRange aria-hidden />
          <span className="tabular">{selected}</span>
          <ChevronsUpDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>{t("Year of assessment")}</DropdownMenuLabel>
        {years.map((year) => (
          <DropdownMenuItem
            key={year.code}
            onSelect={() =>
              startTransition(async () => {
                const result = await setTaxYearAction(year.code);
                if (!result.ok) toast.error(result.error);
                // Drop any ?year= so the saved choice takes effect.
                router.replace(window.location.pathname);
                router.refresh();
              })
            }
          >
            <span className="tabular flex-1">{year.code}</span>
            {year.status === "CURRENT" && <span className="text-xs text-muted-foreground">{t("Current")}</span>}
            {year.code === selected && <Check className="size-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const GROUP_ICON = { Income: Wallet, Expenses: Receipt, Payments: CreditCard, Documents: FileText, "Tax years": CalendarRange } as const;

export function GlobalSearch() {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState("loading");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search failed");
        setHits(((await response.json()) as { items: SearchHit[] }).items);
        setState("idle");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setState("error");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const groups = [...new Set(hits.map((h) => h.group))];
  const short = query.trim().length < 2;
  return (
    <>
      <Button variant="outline" className="w-9 justify-center px-0 text-muted-foreground sm:w-64 sm:justify-start sm:px-2.5" onClick={() => setOpen(true)} aria-label={t("Search your records")}>
        <Search aria-hidden />
        <span className="hidden flex-1 text-left sm:inline">{t("Search records…")}</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[0.65rem] sm:inline">Ctrl K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("Search")} description={t("Search income, expenses, payments, documents and tax years")}>
        {/* Results are filtered on the server, so cmdk's own filtering is off. */}
        <Command shouldFilter={false}>
        <CommandInput value={query} onValueChange={setQuery} placeholder={t("Try \"January salary\" or \"2026 APIT\"")} />
        <CommandList>
          {short ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("Type at least two characters to search your records.")}</p>
          ) : state === "error" ? (
            <p className="px-4 py-8 text-center text-sm text-destructive">{t("Search is unavailable right now. Please try again.")}</p>
          ) : (
            <CommandEmpty>{state === "loading" ? t("Searching…") : t("Nothing matches that search.")}</CommandEmpty>
          )}
          {!short &&
            groups.map((group) => {
              const Icon = GROUP_ICON[group];
              return (
                <CommandGroup key={group} heading={t(group)}>
                  {hits
                    .filter((h) => h.group === group)
                    .map((hit) => (
                      <CommandItem
                        key={`${hit.group}-${hit.id}`}
                        value={`${hit.group}-${hit.id}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(hit.href);
                        }}
                      >
                        <Icon aria-hidden />
                        <div className="min-w-0">
                          <p className="truncate">{hit.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              );
            })}
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const [, startTransition] = useTransition();
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread > 0 ? t("Notifications, {count} unread", { count: unread }) : t("Notifications")}>
          <Bell aria-hidden />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-semibold text-white" aria-hidden>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-medium">{t("Notifications")}</p>
          {unread > 0 && (
            <Button variant="link" size="xs" onClick={() => startTransition(async () => void (await markAllNotificationsReadAction()))}>
              {t("Mark all as read")}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("You're all caught up.")}</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className={cn("flex gap-3 px-4 py-3", !item.read && "bg-accent/50")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium leading-snug">
                    {!item.read && <span className="sr-only">{t("Unread:")} </span>}
                    {item.href ? <Link href={item.href}>{item.title}</Link> : item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.body}</p>
                </div>
                {!item.read && (
                  <Button variant="ghost" size="icon-xs" aria-label={t("Mark \"{title}\" as read", { title: item.title })} onClick={() => startTransition(async () => void (await markNotificationReadAction(item.id)))}>
                    <Check aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function UserMenu({ name, email }: { name: string; email: string }) {
  const t = useT();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t("Account menu for {name}", { name })}
        >
          {initials || "?"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs font-normal">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden /> {t("Settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void logoutAction()}>
          <LogOut aria-hidden /> {t("Sign out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
