import type { Metadata } from "next";
import { CalendarCheck, CalendarClock, ExternalLink } from "lucide-react";
import { ReminderPreferences } from "@/components/settings/reminder-preferences";
import { PageHeader } from "@/components/shared/page";
import { VerificationBadge } from "@/components/shared/why";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isEmailDeliveryConfigured } from "@/lib/email";
import { daysBetween, formatDate, toISODate, todayInSriLanka } from "@/lib/format";
import { parseRuleParams } from "@/lib/tax/rule-params";
import { findRule } from "@/lib/tax/rule-set";
import { resolveTaxYear } from "@/lib/tax-year";
import { getAccount } from "@/services/account/account-service";
import { loadRuleSet } from "@/services/tax/rule-repository";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Tax calendar") };
}

const TYPE_LABEL = { INSTALMENT: msg("Payment"), FINAL_PAYMENT: msg("Payment"), RETURN_FILING: msg("Filing"), APIT_REMITTANCE: msg("APIT"), ANNUAL_STATEMENT: msg("Statement"), OTHER: msg("Event") } as const;

export default async function CalendarPage() {
  const t = await getT();
  const user = await requireUser();
  const taxYear = await resolveTaxYear();
  const today = todayInSriLanka();
  const [upcoming, forYear, account, ruleSet] = await Promise.all([
    db.taxDeadline.findMany({ where: { appliesTo: "INDIVIDUAL", dueOn: { gte: new Date(`${today}T00:00:00Z`) } }, orderBy: { dueOn: "asc" }, take: 8, include: { taxYear: true, source: true } }),
    db.taxDeadline.findMany({ where: { taxYearId: taxYear.id, appliesTo: "INDIVIDUAL" }, orderBy: { dueOn: "asc" }, include: { source: true } }),
    getAccount(user.id),
    loadRuleSet(taxYear.code),
  ]);
  const penaltyRule = findRule(ruleSet, "PENALTY_INFO", "individual");
  const penalties = penaltyRule ? parseRuleParams("PENALTY_INFO", penaltyRule.parameters).items : [];

  return (
    <>
      <PageHeader title={t("Tax calendar")} description={t("Instalment, final payment and filing dates for individuals, from the Inland Revenue Department's published calendar.")} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-xs lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" aria-hidden /> {t("Coming up")}
            </CardTitle>
            <CardDescription>{t("Across all tax years, soonest first.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {upcoming.map((d) => {
                const days = daysBetween(today, toISODate(d.dueOn));
                return (
                  <li key={d.id} className="flex items-start gap-4">
                    <div className="tabular flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 leading-tight">
                      <span className="text-[0.65rem] uppercase text-muted-foreground">{d.dueOn.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}</span>
                      <span className="text-xl font-semibold">{d.dueOn.getUTCDate()}</span>
                      <span className="text-[0.65rem] text-muted-foreground">{d.dueOn.getUTCFullYear()}</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {t(d.title)} — {d.taxYear.code}
                        </p>
                        <Badge variant="secondary">{t(TYPE_LABEL[d.type])}</Badge>
                        {d.verification !== "VERIFIED" && <VerificationBadge status={d.verification} />}
                      </div>
                      <p className="text-sm text-muted-foreground">{d.description && t(d.description)}</p>
                      <p className={`text-sm font-medium ${days <= 14 ? "text-warning" : ""}`}>{days === 0 ? t("Due today") : days === 1 ? t("Due in 1 day") : t("Due in {days} days", { days })}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Reminders")}</CardTitle>
              <CardDescription>{t("Sent 30, 14, 7 and 1 day before each date.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ReminderPreferences emailReminders={account.profile.emailReminders} inAppReminders={account.profile.inAppReminders} />
              {!isEmailDeliveryConfigured && <p className="text-xs text-muted-foreground">{t("E-mail delivery is not connected on this installation yet, so e-mail reminders are logged on the server rather than sent. In-app reminders work now.")}</p>}
              <p className="text-xs text-muted-foreground">{t("SMS and WhatsApp reminders are not available.")}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-muted-foreground" aria-hidden /> {t("All dates for {year}", { year: taxYear.code })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 font-medium">{t("Due")}</th>
                  <th scope="col" className="py-2 font-medium">{t("What")}</th>
                  <th scope="col" className="py-2 font-medium">{t("Status")}</th>
                  <th scope="col" className="py-2 font-medium">{t("Source")}</th>
                </tr>
              </thead>
              <tbody>
                {forYear.map((d) => {
                  const due = toISODate(d.dueOn);
                  return (
                    <tr key={d.id} className="border-t">
                      <td className="tabular py-2.5 whitespace-nowrap">{formatDate(d.dueOn)}</td>
                      <th scope="row" className="py-2.5 text-left font-medium">{t(d.title)}</th>
                      <td className="py-2.5">{due < today ? t("Passed") : t("In {days} days", { days: daysBetween(today, due) })}</td>
                      <td className="py-2.5">
                        {d.source ? (
                          <a href={d.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                            {d.source.authority} <ExternalLink className="size-3" aria-hidden />
                          </a>
                        ) : (
                          "—"
                        )}
                        {d.verification !== "VERIFIED" && (
                          <span className="ml-2">
                            <VerificationBadge status={d.verification} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {penalties.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>{t("If a date is missed")}</CardTitle>
            <CardDescription>{t("For information. The app does not calculate penalties; the amount depends on IRD's assessment.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
              {penalties.map((item) => (
                <div key={item.label}>
                  <dt className="font-medium">{t(item.label)}</dt>
                  <dd className="text-muted-foreground">{t(item.consequence)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </>
  );
}
