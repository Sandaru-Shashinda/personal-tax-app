"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{t("We couldn't load this page")}</h1>
        <p className="text-sm text-muted-foreground">{t("Your records are safe. Please try again; if it keeps happening, quote the reference below when you contact support.")}</p>
        {error.digest && <p className="tabular pt-1 text-xs text-muted-foreground">{t("Reference: {reference}", { reference: error.digest })}</p>}
      </div>
      <Button onClick={reset}>{t("Try again")}</Button>
    </div>
  );
}
