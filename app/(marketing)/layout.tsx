import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { Disclaimer } from "@/components/shared/disclaimer";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { localizePath } from "@/lib/i18n/config";
import { getLocale, getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/translate";

const LINKS = [
  { href: "/tax-calculator", label: msg("Tax calculator") },
  { href: "/sri-lanka-income-tax", label: msg("Tax rates") },
  { href: "/sri-lanka-tax-guide", label: msg("Guide") },
  { href: "/tax-deadlines", label: msg("Deadlines") },
  { href: "/about", label: msg("About") },
];

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const links = LINKS.map((link) => ({ href: localizePath(locale, link.href), label: t(link.label) }));
  const home = localizePath(locale, "/");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Brand href={home} />
          <nav aria-label={t("Main")} className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/login">{t("Sign in")}</Link>
            </Button>
            <Button asChild>
              <Link href="/register">{t("Get started")}</Link>
            </Button>
          </div>
        </div>
        <nav aria-label={t("Sections")} className="flex gap-4 overflow-x-auto border-t px-4 py-2 text-sm text-muted-foreground md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="shrink-0">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Brand href={home} />
            <nav aria-label={t("Footer")} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <Disclaimer className="max-w-3xl" />
          <p className="text-xs text-muted-foreground">{t("Ayakara is independent and is not affiliated with the Inland Revenue Department of Sri Lanka.")}</p>
        </div>
      </footer>
    </div>
  );
}
