"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { notificationPreferences, notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import { emailConfigured, smsConfigured } from "@/lib/config";
import { recordAudit } from "@/lib/audit";

const CATEGORY_KEYS = [
  "MEDICATION",
  "CONSULTATION",
  "PRESCRIPTION",
  "ORDER",
  "REPORT",
  "HEALTH_REMINDER",
  "FAMILY",
  "EMERGENCY",
  "SYSTEM",
] as const;

export async function markNotificationReadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/notifications");
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return errorState("That notification could not be found.");

  const db = await getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)),
    );

  revalidatePath("/app/notifications");
  revalidatePath("/app");
  return successState("Notification marked as read.");
}

export async function markAllNotificationsReadAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/notifications");
  const db = await getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  revalidatePath("/app/notifications");
  revalidatePath("/app");
  return successState("All notifications marked as read.");
}

export async function updateNotificationPreferencesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/notifications");
  const categories: Record<string, boolean> = {};
  for (const key of CATEGORY_KEYS) {
    categories[key] = formData.get(`category_${key}`) === "on";
  }

  const quietStart = String(formData.get("quietHoursStart") ?? "").trim();
  const quietEnd = String(formData.get("quietHoursEnd") ?? "").trim();
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if ((quietStart && !timePattern.test(quietStart)) || (quietEnd && !timePattern.test(quietEnd))) {
    return errorState("Quiet hours must use valid 24-hour times.");
  }
  if ((quietStart && !quietEnd) || (!quietStart && quietEnd)) {
    return errorState("Add both a quiet-hours start and end time, or leave both blank.");
  }

  const emailEnabled = formData.get("emailEnabled") === "on";
  const smsEnabled = formData.get("smsEnabled") === "on";

  const db = await getDb();
  await db
    .insert(notificationPreferences)
    .values({
      userId: user.id,
      emailEnabled,
      smsEnabled,
      quietHoursStart: quietStart || null,
      quietHoursEnd: quietEnd || null,
      categories,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        emailEnabled,
        smsEnabled,
        quietHoursStart: quietStart || null,
        quietHoursEnd: quietEnd || null,
        categories,
        updatedAt: new Date(),
      },
    });

  await recordAudit({
    actorUserId: user.id,
    action: "notifications.preferences_updated",
    entityType: "notification_preferences",
    entityId: user.id,
    metadata: { emailEnabled, smsEnabled, quietHours: Boolean(quietStart) },
  });

  revalidatePath("/app/notifications");
  const warnings = [
    emailEnabled && !emailConfigured()
      ? "Email delivery is not configured on this deployment, so email reminders will not be sent yet."
      : null,
    smsEnabled && !smsConfigured()
      ? "SMS delivery is not configured, so text reminders will not be sent yet."
      : null,
  ].filter(Boolean);

  return successState(
    warnings.length
      ? `Preferences saved. ${warnings.join(" ")}`
      : "Notification preferences saved.",
  );
}
