"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateRemindersAction } from "@/app/actions/account";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/client";

export function ReminderPreferences({ emailReminders, inAppReminders }: { emailReminders: boolean; inAppReminders: boolean }) {
  const t = useT();
  const [prefs, setPrefs] = useState({ emailReminders, inAppReminders });
  const [pending, startTransition] = useTransition();
  const update = (next: typeof prefs) => {
    const previous = prefs;
    setPrefs(next);
    startTransition(async () => {
      const result = await updateRemindersAction(next);
      if (!result.ok) {
        setPrefs(previous);
        toast.error(result.error);
      }
    });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="reminders-in-app">{t("In-app notifications")}</Label>
        <Switch id="reminders-in-app" checked={prefs.inAppReminders} disabled={pending} onCheckedChange={(checked) => update({ ...prefs, inAppReminders: checked })} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="reminders-email">{t("E-mail reminders")}</Label>
        <Switch id="reminders-email" checked={prefs.emailReminders} disabled={pending} onCheckedChange={(checked) => update({ ...prefs, emailReminders: checked })} />
      </div>
    </div>
  );
}
