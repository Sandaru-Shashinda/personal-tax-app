import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getSessionUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Create your account") };
}

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");
  const t = await getT();
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Create your account")}</h1>
        <p className="text-sm text-muted-foreground">{t("Free to use. It takes about two minutes to set up.")}</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        {t("Already have an account?")}{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("Sign in")}
        </Link>
      </p>
    </div>
  );
}
