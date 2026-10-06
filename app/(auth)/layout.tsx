import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getT();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Brand className="text-primary-foreground [&_rect]:fill-primary-foreground [&_path]:fill-primary" />
        <div className="max-w-md space-y-5">
          <p className="text-3xl font-semibold leading-tight tracking-tight">{t("Know what you owe, and exactly why.")}</p>
          <p className="text-primary-foreground/80">
            {t("Every figure is calculated on current Sri Lankan rules, with the rule, its tax year and its official source one tap away.")}
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm text-primary-foreground/75">
          <ShieldCheck className="size-4" aria-hidden />
          {t("Your records are private to your account. Ayakara never files or pays on your behalf.")}
        </p>
      </aside>
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Brand className="lg:hidden" />
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
