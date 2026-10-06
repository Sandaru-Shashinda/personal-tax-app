import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { getSessionUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Sign in") };
}

// Shown only outside production, where the seed creates this fictional account.
const DEMO = process.env.NODE_ENV === "production" ? undefined : { email: "kasun.demo@example.lk", password: "demo-kasun-2026" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getSessionUser();
  if (user) redirect(user.twoFactorOk ? "/dashboard" : "/login/two-factor");
  const { reset, verified } = await searchParams;
  const t = await getT();
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Welcome back")}</h1>
        <p className="text-sm text-muted-foreground">{t("Sign in to your tax workspace.")}</p>
      </div>
      {reset && (
        <p role="status" className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          {t("Your password has been changed. Sign in with the new one.")}
        </p>
      )}
      {verified && (
        <p role="status" className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          {t("Your e-mail address is confirmed.")}
        </p>
      )}
      <LoginForm demo={DEMO} />
      <p className="text-center text-sm text-muted-foreground">
        {t("New here?")}{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("Create an account")}
        </Link>
      </p>
    </div>
  );
}
