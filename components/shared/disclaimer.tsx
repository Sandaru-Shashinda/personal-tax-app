import { Info } from "lucide-react";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export { DISCLAIMER_TEXT };

export async function Disclaimer({ className, children }: { className?: string; children?: React.ReactNode }) {
  const t = await getT();
  return (
    <p className={cn("flex gap-2 text-xs leading-relaxed text-muted-foreground", className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children ?? t(DISCLAIMER_TEXT)}</span>
    </p>
  );
}
