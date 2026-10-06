"use client";

import { ExternalLink, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/translate";
import type { RuleUse, Verification } from "@/lib/tax/types";

const VERIFICATION_LABEL: Record<Verification, string> = {
  VERIFIED: msg("Verified against an official source"),
  VERIFIED_SECONDARY: msg("Based on a secondary source"),
  REQUIRES_VERIFICATION: msg("Requires verification"),
};

export function VerificationBadge({ status }: { status: Verification }) {
  const t = useT();
  return (
    <Badge variant={status === "VERIFIED" ? "secondary" : "outline"} className={status === "REQUIRES_VERIFICATION" ? "border-warning/50 text-warning" : undefined}>
      {t(VERIFICATION_LABEL[status])}
    </Badge>
  );
}

interface WhyProps {
  /** The question being answered, e.g. "Why is this taxed at 18%?" */
  question: string;
  explanation: string;
  rule?: RuleUse | null;
  taxYear: string;
}

/** The "Why?" control: plain-language reason, the rule applied, its tax year, source and last verified date. */
export function Why({ question, explanation, rule, taxYear }: WhyProps) {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
        <HelpCircle className="size-3.5" aria-hidden />
        {t("Why?")}
        <span className="sr-only">{question}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 text-sm sm:w-96">
        <p className="font-medium leading-snug">{question}</p>
        <p className="leading-relaxed text-muted-foreground">{explanation}</p>
        <dl className="space-y-1.5 border-t pt-3 text-xs">
          {rule && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("Rule applied")}</dt>
              <dd className="text-right font-medium">
                {t(rule.name)} <span className="font-normal text-muted-foreground">v{rule.version}</span>
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("Tax year")}</dt>
            <dd className="font-medium">{taxYear}</dd>
          </div>
          {rule?.source && (
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{t("Source")}</dt>
              <dd className="text-right">
                <a href={rule.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 font-medium text-primary underline-offset-4 hover:underline">
                  <span>
                    {rule.source.authority}
                    {rule.sourceLocator ? `, ${rule.sourceLocator}` : ""}
                  </span>
                  <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
                </a>
              </dd>
            </div>
          )}
          {rule?.lastVerifiedAt && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("Last verified")}</dt>
              <dd className="font-medium">{formatDate(rule.lastVerifiedAt)}</dd>
            </div>
          )}
        </dl>
        {rule && <VerificationBadge status={rule.verification} />}
      </PopoverContent>
    </Popover>
  );
}
