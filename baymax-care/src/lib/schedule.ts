import "server-only";

import { and, eq, isNull, or, gte } from "drizzle-orm";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { medicationDoses, medications } from "@/db/schema";

export function validTimeZone(value: string | null | undefined, fallback = "Asia/Kolkata") {
  if (value && DateTime.local().setZone(value).isValid) return value;
  return fallback;
}

type MedicationScheduleRow = Pick<
  typeof medications.$inferSelect,
  "id" | "memberId" | "scheduledTimes" | "startDate" | "endDate" | "active"
>;

/**
 * Materialises the schedule window as rows so a dose can be marked taken or
 * skipped exactly once. The unique index (medication, scheduledAt) makes this
 * safe to run repeatedly from page loads or the reminder job.
 */
export async function ensureDosesForMedication(
  medication: MedicationScheduleRow,
  timezone: string,
  fromDate: string,
  toDate: string,
) {
  if (!medication.active) return 0;
  const zone = validTimeZone(timezone);
  const start = DateTime.fromISO(medication.startDate, { zone });
  const end = medication.endDate ? DateTime.fromISO(medication.endDate, { zone }) : null;
  if (!start.isValid) return 0;

  let cursor = DateTime.fromISO(fromDate, { zone }).startOf("day");
  const last = DateTime.fromISO(toDate, { zone }).startOf("day");
  if (!cursor.isValid || !last.isValid) return 0;

  if (cursor < start.startOf("day")) cursor = start.startOf("day");
  if (end?.isValid && last > end.startOf("day")) {
    // The loop bound stays the requested window; individual days are checked
    // against the medication end date below.
  }

  const rows: Array<typeof medicationDoses.$inferInsert> = [];
  let safety = 0;
  while (cursor <= last && safety < 90) {
    safety += 1;
    const dateKey = cursor.toISODate();
    const withinStart = cursor >= start.startOf("day");
    const withinEnd = !end?.isValid || cursor <= end.endOf("day");

    if (dateKey && withinStart && withinEnd) {
      for (const time of medication.scheduledTimes ?? []) {
        const scheduled = DateTime.fromISO(`${dateKey}T${time}`, { zone });
        if (!scheduled.isValid) continue;
        rows.push({
          medicationId: medication.id,
          memberId: medication.memberId,
          scheduledAt: scheduled.toUTC().toJSDate(),
          scheduledDate: dateKey,
          scheduledTime: time,
          timezone: zone,
          status: "PENDING",
        });
      }
    }
    cursor = cursor.plus({ days: 1 });
  }

  if (rows.length === 0) return 0;
  const db = await getDb();
  await db.insert(medicationDoses).values(rows).onConflictDoNothing();
  return rows.length;
}

export async function ensureDoseWindowForMember(
  memberId: string,
  timezone: string,
  fromDate: string,
  toDate: string,
) {
  const db = await getDb();
  const active = await db
    .select()
    .from(medications)
    .where(
      and(
        eq(medications.memberId, memberId),
        eq(medications.active, true),
        or(isNull(medications.endDate), gte(medications.endDate, fromDate)),
      ),
    )
    .limit(50);

  for (const medication of active) {
    await ensureDosesForMedication(medication, timezone, fromDate, toDate);
  }
}

export function scheduledAtFrom(dateKey: string, time: string, timezone: string) {
  return DateTime.fromISO(`${dateKey}T${time}`, { zone: validTimeZone(timezone) })
    .toUTC()
    .toJSDate();
}
