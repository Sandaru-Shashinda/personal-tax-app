import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Reset your password") };
}

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Reset your password")}</h1>
        <p className="text-sm text-muted-foreground">{t("Enter the e-mail address you registered with and we'll send a link to choose a new password.")}</p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("Back to sign in")}
        </Link>
      </p>
    </div>
  );
}
