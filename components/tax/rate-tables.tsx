import { ExternalLink } from "lucide-react";
import { VerificationBadge } from "@/components/shared/why";
import { formatDate, formatLKR, formatPercent } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { RuleSourceRef, Verification } from "@/lib/tax/types";
import type { PublicRates } from "@/services/tax/public-rules";

export async function SourceNote({ source, locator, verification, lastVerifiedAt }: { source: RuleSourceRef | null; locator: string | null; verification: Verification; lastVerifiedAt: string | null }) {
  const t = await getT();
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      {source && (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
          {t("Source: {authority}", { authority: source.authority })}
          {locator ? `, ${locator}` : ""} <ExternalLink className="size-3" aria-hidden />
        </a>
      )}
      {lastVerifiedAt && <span>{t("Last verified {date}", { date: formatDate(lastVerifiedAt) })}</span>}
      <VerificationBadge status={verification} />
    </p>
  );
}

export async function BandTable({ rates }: { rates: PublicRates }) {
  if (!rates.bands) return null;
  const t = await getT();
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <table className="tabular w-full min-w-[26rem] text-sm">
          <caption className="sr-only">{t("Income tax bands for {year}", { year: rates.taxYear.code })}</caption>
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">{t("Taxable income")}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{t("Band")}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("Rate")}</th>
            </tr>
          </thead>
          <tbody>
            {rates.bands.rows.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="px-4 py-2.5">{row.to === null ? t("Above {amount}", { amount: formatLKR(row.from) }) : `${formatLKR(row.from)} – ${formatLKR(row.to)}`}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {row.width === null ? t("Balance") : index === 0 ? t("First {amount}", { amount: formatLKR(row.width) }) : t("Next {amount}", { amount: formatLKR(row.width) })}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{formatPercent(row.rate, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SourceNote {...rates.bands} />
    </div>
  );
}

export async function WithholdingTable({ rates }: { rates: PublicRates }) {
  const t = await getT();
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[32rem] text-sm">
        <caption className="sr-only">{t("Withholding tax rates for {year}", { year: rates.taxYear.code })}</caption>
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">{t("Payment")}</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("Rate")}</th>
            <th scope="col" className="px-4 py-2.5 font-medium">{t("Treatment")}</th>
          </tr>
        </thead>
        <tbody>
          {rates.withholding.map((row) => (
            <tr key={row.name} className="border-t align-top">
              <th scope="row" className="px-4 py-2.5 text-left font-normal">
                <span className="font-medium">{t(row.name)}</span>
                {row.description && <span className="block text-xs text-muted-foreground">{t(row.description)}</span>}
              </th>
              <td className="tabular px-4 py-2.5 text-right font-medium">{formatPercent(row.rate, row.rate * 100 % 1 === 0 ? 0 : 1)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{row.isFinal ? t("Final tax; not taxed again") : t("Credited against your tax")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
