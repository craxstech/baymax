"use server";

import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { medicationDoses, medications, notifications, users, familyMembers } from "@/db/schema";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { brand } from "@/lib/config";
import { DateTime } from "luxon";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const nowUtc = new Date();

  const dueDoses = await db
    .select({
      id: medicationDoses.id,
      medicationId: medicationDoses.medicationId,
      memberId: medicationDoses.memberId,
      scheduledAt: medicationDoses.scheduledAt,
      scheduledTime: medicationDoses.scheduledTime,
      timezone: medicationDoses.timezone,
    })
    .from(medicationDoses)
    .innerJoin(medications, eq(medicationDoses.medicationId, medications.id))
    .where(
      and(
        eq(medicationDoses.status, "PENDING"),
        lt(medicationDoses.scheduledAt, nowUtc),
        eq(medications.active, true),
      ),
    )
    .limit(100);

  let processed = 0;
  const errors: string[] = [];

  for (const dose of dueDoses) {
    try {
      const zone = dose.timezone || "Asia/Kolkata";
      const localTime = DateTime.fromISO(dose.scheduledTime, { zone });
      const [member] = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.id, dose.memberId))
        .limit(1);

      if (!member) continue;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, member.createdById))
        .limit(1);

      if (!user) continue;

      const body = `Medication reminder for ${member.name}: A dose was scheduled for today at ${localTime.toLocaleString({ hour: "numeric", minute: "2-digit" })}. Open Baymax Care to mark it as taken or skipped.`;

      await db.insert(notifications).values({
        userId: user.id,
        memberId: dose.memberId,
        category: "MEDICATION",
        title: "Medication reminder",
        body,
        href: "/app/medications",
        dedupeKey: `dose-${dose.id}`,
      }).onConflictDoNothing();

      processed += 1;

      await recordAudit({
        actorUserId: user.id,
        memberId: dose.memberId,
        action: "reminder.dose_due",
        entityType: "medication_dose",
        entityId: dose.id,
        metadata: { scheduledTime: dose.scheduledTime, timezone: zone },
      });
    } catch (error) {
      logger.error("reminder_dose_failed", error);
      errors.push(dose.id);
    }
  }

  await recordIntegrationEvent({
    type: "EMAIL",
    status: "SUCCESS",
    summary: `Processed ${processed} medication reminders.`,
    detail: errors.length > 0 ? `${errors.length} failed` : "All reminders queued.",
  });

  return NextResponse.json({
    processed,
    errors: errors.length,
  }, { status: 200 });
}
