import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Choose a new password"), referrer: "no-referrer" };
}

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const value = Array.isArray(token) ? token[0] : token;
  const t = await getT();
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Choose a new password")}</h1>
        <p className="text-sm text-muted-foreground">{t("Setting a new password signs you out of every device.")}</p>
      </div>
      {value ? (
        <ResetPasswordForm token={value} />
      ) : (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t("This reset link is incomplete.")}{" "}
          <Link href="/forgot-password" className="font-medium underline underline-offset-4">
            {t("Request a new one")}
          </Link>
        </p>
      )}
    </div>
  );
}
