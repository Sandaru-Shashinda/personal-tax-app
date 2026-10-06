import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { TwoFactorForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Two-factor authentication") };
}

export default async function TwoFactorPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.twoFactorOk) redirect("/dashboard");
  const t = await getT();
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("One more step")}</h1>
        <p className="text-sm text-muted-foreground">{t("Enter the code from your authenticator app to finish signing in as {email}.", { email: user.email })}</p>
      </div>
      <TwoFactorForm />
      <form action={logoutAction} className="text-center">
        <Button type="submit" variant="link" size="sm">
          {t("Sign in with a different account")}
        </Button>
      </form>
    </div>
  );
}
