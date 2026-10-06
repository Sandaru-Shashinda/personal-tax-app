import { CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { HealthCheck } from "@/lib/tax/health";
import { getT } from "@/lib/i18n/server";

export async function HealthCard({ score, checks }: { score: number; checks: HealthCheck[] }) {
  const t = await getT();
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>{t("Tax health")}</CardTitle>
        <CardDescription>{t("How complete your records are. A housekeeping guide, not a legal or compliance score.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <p className="tabular text-4xl font-semibold tracking-tight">{score}</p>
          <p className="pb-1 text-sm text-muted-foreground">/ 100</p>
        </div>
        <Progress value={score} aria-label={t("Tax health {score} out of 100", { score })} />
        <ul className="space-y-2 text-sm">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2">
              {check.passed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              )}
              <span className="sr-only">{check.passed ? t("Done:") : t("Needs attention:")}</span>
              {check.passed ? (
                <span>{check.label}</span>
              ) : (
                <Link href={check.href} className="underline-offset-4 hover:underline">
                  {check.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
