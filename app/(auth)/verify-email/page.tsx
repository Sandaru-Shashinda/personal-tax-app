import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { verifyEmail } from "@/services/auth/auth-service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Confirm your e-mail"), referrer: "no-referrer" };
}

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  const value = Array.isArray(token) ? token[0] : token;
  const ok = value ? await verifyEmail(value) : false;
  const t = await getT();
  return (
    <div className="space-y-5 text-center">
      {ok ? <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden /> : <XCircle className="mx-auto size-10 text-destructive" aria-hidden />}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{ok ? t("E-mail confirmed") : t("This link is no longer valid")}</h1>
        <p className="text-sm text-muted-foreground">
          {ok ? t("Thank you. Deadline reminders can now reach you by e-mail.") : t("It may have expired or already been used. You can send a new one from Settings.")}
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/dashboard">{t("Go to your dashboard")}</Link>
      </Button>
    </div>
  );
}
