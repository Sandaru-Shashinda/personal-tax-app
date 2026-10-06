import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Brand />
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("We couldn't find that page")}</h1>
        <p className="text-sm text-muted-foreground">{t("The address may be mistyped, or the page may have moved.")}</p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard">{t("Go to your dashboard")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("Home")}</Link>
        </Button>
      </div>
    </main>
  );
}
