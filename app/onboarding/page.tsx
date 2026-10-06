import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { Brand } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Set up your workspace"), robots: { index: false, follow: false } };
}

export default async function OnboardingPage() {
  const user = await requireUser({ allowIncompleteOnboarding: true });
  if (user.onboardingDone) redirect("/dashboard");
  const t = await getT();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Brand href="/onboarding" />
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            {t("Sign out")}
          </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 py-10">
        <OnboardingWizard fullName={user.fullName === user.email ? "" : user.fullName} />
      </main>
    </div>
  );
}
