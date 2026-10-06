import type { Metadata } from "next";
import { after } from "next/server";
import { MobileNav, SidebarNav } from "@/components/app/nav";
import { GlobalSearch, NotificationBell, TaxYearSwitcher, UserMenu } from "@/components/app/topbar-controls";
import { Brand } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Disclaimer } from "@/components/shared/disclaimer";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { resolveTaxYear } from "@/lib/tax-year";
import { listNotifications, syncDeadlineReminders } from "@/services/notifications/notification-service";
import { listTaxYears } from "@/services/tax/rule-repository";

// Signed-in pages are private and personalised: never indexed, never statically cached.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const t = await getT();
  const [years, selected, notifications] = await Promise.all([listTaxYears(), resolveTaxYear(), listNotifications(user.id, 15)]);
  // Raise any reminders that have come due, without delaying the page.
  after(() => syncDeadlineReminders(user.id, t).catch((error) => console.error("[reminders]", error)));

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground">
        {t("Skip to content")}
      </a>
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-5 md:flex">
        <Brand href="/dashboard" className="px-2.5" />
        <SidebarNav isAdmin={user.role === "ADMIN"} />
        <Disclaimer className="mt-auto px-2.5">{t("Estimates only. Not tax advice, and nothing here is filed with IRD.")}</Disclaimer>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Brand href="/dashboard" className="mr-1 md:hidden [&>span]:hidden" />
          <TaxYearSwitcher years={years.map((y) => ({ code: y.code, status: y.status }))} selected={selected.code} />
          <div className="ml-auto flex items-center gap-1.5">
            <GlobalSearch />
            <NotificationBell items={notifications.items} unread={notifications.unread} />
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu name={user.fullName} email={user.email} />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6 md:pb-10">
          {children}
        </main>
      </div>
      <MobileNav isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
