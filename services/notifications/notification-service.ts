import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import { emailProvider } from "@/lib/email";
import { env } from "@/lib/env";
import { daysBetween, formatDate, toISODate, todayInSriLanka } from "@/lib/format";

/** Days before a deadline at which a reminder is raised. */
const REMINDER_DAYS = [30, 14, 7, 1];

export async function notify(userId: string, n: { type: NotificationType; title: string; body: string; href?: string; dedupeKey?: string }) {
  if (n.dedupeKey) {
    // The unique (userId, dedupeKey) index makes repeated calls no-ops.
    await db.notification.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey: n.dedupeKey } },
      update: {},
      create: { userId, ...n },
    });
    return;
  }
  await db.notification.create({ data: { userId, ...n } });
}

/**
 * Raises deadline reminders that have come due for this user. Called when the user opens the
 * app; a scheduled job would call the same function for every user to drive e-mail reminders.
 */
/** `t` is the signed-in reader's translator: reminders are written in the language they were using. */
export async function syncDeadlineReminders(userId: string, t: Translate = createTranslator()): Promise<void> {
  const today = todayInSriLanka();
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + Math.max(...REMINDER_DAYS));
  const [profile, user, deadlines] = await Promise.all([
    db.profile.findUnique({ where: { userId }, select: { emailReminders: true, inAppReminders: true } }),
    db.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } }),
    db.taxDeadline.findMany({
      where: { appliesTo: "INDIVIDUAL", dueOn: { gte: new Date(`${today}T00:00:00Z`), lte: horizon } },
      include: { taxYear: true },
      orderBy: { dueOn: "asc" },
    }),
  ]);
  if (!profile || !user) return;

  for (const deadline of deadlines) {
    const dueOn = toISODate(deadline.dueOn);
    const daysAway = daysBetween(today, dueOn);
    const threshold = REMINDER_DAYS.filter((d) => daysAway <= d).at(-1);
    if (threshold === undefined) continue;
    const title =
      deadline.type === "RETURN_FILING"
        ? t("Your tax return deadline is approaching")
        : daysAway === 0
          ? t("{title} for {year} is due today", { title: t(deadline.title), year: deadline.taxYear.code })
          : daysAway === 1
            ? t("{title} for {year} is due in 1 day", { title: t(deadline.title), year: deadline.taxYear.code })
            : t("{title} for {year} is due in {days} days", { title: t(deadline.title), year: deadline.taxYear.code, days: daysAway });
    const body = t("{title} ({year}) is due on {date}.", { title: t(deadline.title), year: deadline.taxYear.code, date: formatDate(dueOn) });

    if (profile.inAppReminders) {
      await notify(userId, {
        type: deadline.type === "RETURN_FILING" ? "DEADLINE_APPROACHING" : "PAYMENT_DUE",
        title,
        body,
        href: "/calendar",
        dedupeKey: `deadline:${deadline.id}:${threshold}`,
      });
    }
    if (profile.emailReminders && user.emailVerifiedAt) {
      const existing = await db.reminder.findUnique({
        where: { userId_deadlineId_channel_daysBefore: { userId, deadlineId: deadline.id, channel: "EMAIL", daysBefore: threshold } },
      });
      if (!existing) {
        await db.reminder.create({ data: { userId, deadlineId: deadline.id, channel: "EMAIL", daysBefore: threshold, sentAt: new Date() } });
        await emailProvider().send({ to: user.email, subject: title, text: `${body}\n\n${t("Open your tax calendar: {url}", { url: `${env().APP_URL}/calendar` })}` });
      }
    }
  }
}

export async function listNotifications(userId: string, take = 30) {
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    unread,
    items: items.map((i) => ({ id: i.id, type: i.type, title: i.title, body: i.body, href: i.href, read: i.readAt !== null, createdAt: i.createdAt.toISOString() })),
  };
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await db.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
