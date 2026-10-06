import type { Metadata } from "next";
import { Download } from "lucide-react";
import { ReminderPreferences } from "@/components/settings/reminder-preferences";
import { DeleteAccountPanel, PasswordPanel, ProfilePanel, SessionsPanel, TaxProfilePanel, TwoFactorPanel, VerifyEmailNotice } from "@/components/settings/settings-panels";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth/session";
import { getAccount, listActivity } from "@/services/account/account-service";
import { listSessions } from "@/services/auth/auth-service";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Settings") };
}

const ACTION_LABELS: Record<string, string> = {
  "auth.login": msg("Signed in"),
  "auth.logout": msg("Signed out"),
  "auth.login_failed": msg("Failed sign-in attempt"),
  "auth.register": msg("Account created"),
  "auth.password_changed": msg("Password changed"),
  "auth.password_reset": msg("Password reset"),
  "auth.two_factor_enabled": msg("Two-factor authentication turned on"),
  "auth.two_factor_disabled": msg("Two-factor authentication turned off"),
  "auth.email_verified": msg("E-mail address confirmed"),
  "income.create": msg("Income added"),
  "income.update": msg("Income changed"),
  "income.delete": msg("Income deleted"),
  "expense.create": msg("Expense added"),
  "expense.update": msg("Expense changed"),
  "expense.delete": msg("Expense deleted"),
  "payment.create": msg("Payment recorded"),
  "payment.delete": msg("Payment deleted"),
  "document.upload": msg("Document uploaded"),
  "document.delete": msg("Document deleted"),
  "tax.calculation_performed": msg("Tax calculated"),
  "tax.calculation_changed": msg("Tax calculation changed"),
  "report.exported": msg("Report exported"),
  "account.data_exported": msg("Data exported"),
};

export default async function SettingsPage() {
  const t = await getT();
  const user = await requireUser();
  const [account, sessions, activity] = await Promise.all([getAccount(user.id), listSessions(user), listActivity(user.id, 40)]);

  return (
    <>
      <PageHeader title={t("Settings")} description={t("Signed in as {email}", { email: account.email })} />
      {!account.emailVerified && <VerifyEmailNotice email={account.email} />}

      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="profile">{t("Profile")}</TabsTrigger>
          <TabsTrigger value="tax">{t("Tax profile")}</TabsTrigger>
          <TabsTrigger value="security">{t("Security")}</TabsTrigger>
          <TabsTrigger value="privacy">{t("Privacy & data")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Personal details")}</CardTitle>
              <CardDescription>{t("Shown on your reports. Only your name is required.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfilePanel profile={account.profile} />
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Reminders")}</CardTitle>
              <CardDescription>{t("How you want to hear about approaching deadlines.")}</CardDescription>
            </CardHeader>
            <CardContent className="max-w-sm">
              <ReminderPreferences emailReminders={account.profile.emailReminders} inAppReminders={account.profile.inAppReminders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Tax profile")}</CardTitle>
              <CardDescription>{t("Your residency decides which reliefs apply. Your income types shape the checks on your dashboard.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <TaxProfilePanel taxpayer={account.taxpayer} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Password")}</CardTitle>
              <CardDescription>{t("Changing it signs out every other device.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordPanel />
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Two-factor authentication")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TwoFactorPanel enabled={account.twoFactorEnabled} />
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Devices")}</CardTitle>
              <CardDescription>{t("Where your account is currently signed in.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionsPanel sessions={sessions.map((s) => ({ id: s.id, userAgent: s.userAgent, ipAddress: s.ipAddress, lastSeenAt: s.lastSeenAt.toISOString(), isCurrent: s.isCurrent }))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Export your data")}</CardTitle>
              <CardDescription>{t("Everything you have entered, as one JSON file. Uploaded files are listed in it and can be downloaded from Documents.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href="/api/account/export">
                  <Download aria-hidden /> {t("Download my data")}
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>{t("Account activity")}</CardTitle>
              <CardDescription>{t("The most recent actions on your account.")}</CardDescription>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No activity recorded yet.")}</p>
              ) : (
                <ul className="divide-y text-sm">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-4 py-2">
                      <span>{entry.action in ACTION_LABELS ? t(ACTION_LABELS[entry.action]) : entry.action.replaceAll(/[._]/g, " ")}</span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="border-destructive/30 shadow-xs">
            <CardHeader>
              <CardTitle>{t("Delete account")}</CardTitle>
              <CardDescription>{t("Permanently removes your account, all your records and every uploaded document.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteAccountPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
