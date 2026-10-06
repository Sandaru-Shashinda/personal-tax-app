"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { recalculateAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function RecalculateButton({ taxYear }: { taxYear: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await recalculateAction(taxYear);
          if (!result.ok) return void toast.error(result.error);
          toast.success(result.data.changed ? "Calculated and saved to your history." : "Calculated. Nothing has changed since the last saved calculation.");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
      {t("Calculate tax")}
    </Button>
  );
}
