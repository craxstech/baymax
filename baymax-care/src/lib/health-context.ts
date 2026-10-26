import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  familyMembers,
  medicalHistory,
  medicalReports,
  medications,
} from "@/db/schema";
import { ageFromDob } from "./utils";

/**
 * Builds a deliberately narrow, size-limited context for an explicit
 * AI request. It never includes full uploaded documents or free-text notes
 * from other modules. The caller must verify AI consent first.
 */
export async function buildHealthContext(memberId: string) {
  const db = await getDb();
  const [member] = await db
    .select({
      name: familyMembers.name,
      relationship: familyMembers.relationship,
      dateOfBirth: familyMembers.dateOfBirth,
      sex: familyMembers.sex,
      bloodGroup: familyMembers.bloodGroup,
      preferredLanguage: familyMembers.preferredLanguage,
    })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1);

  if (!member) return null;

  const [history, activeMeds, reports, counts] = await Promise.all([
    db
      .select({
        category: medicalHistory.category,
        title: medicalHistory.title,
        status: medicalHistory.status,
        severity: medicalHistory.severity,
        recordedAt: medicalHistory.recordedAt,
      })
      .from(medicalHistory)
      .where(
        and(eq(medicalHistory.memberId, memberId), isNull(medicalHistory.deletedAt)),
      )
      .orderBy(desc(medicalHistory.recordedAt))
      .limit(18),
    db
      .select({
        name: medications.name,
        strength: medications.strength,
        form: medications.dosageForm,
        dose: medications.prescribedDose,
        frequency: medications.frequency,
        times: medications.scheduledTimes,
        startDate: medications.startDate,
        endDate: medications.endDate,
      })
      .from(medications)
      .where(and(eq(medications.memberId, memberId), eq(medications.active, true)))
      .limit(20),
    db
      .select({
        title: medicalReports.title,
        category: medicalReports.category,
        reportDate: medicalReports.reportDate,
        summary: medicalReports.aiSummary,
      })
      .from(medicalReports)
      .where(
        and(eq(medicalReports.memberId, memberId), eq(medicalReports.status, "AI_ANALYSIS_READY")),
      )
      .orderBy(desc(medicalReports.reportDate))
      .limit(4),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(medicalReports)
      .where(eq(medicalReports.memberId, memberId)),
  ]);

  const lines: string[] = [];
  const age = ageFromDob(member.dateOfBirth);
  lines.push(
    `Family member context: ${member.name}, relationship ${member.relationship}${age !== null ? `, age ${age}` : ""}${member.sex ? `, sex ${member.sex}` : ""}${member.bloodGroup ? `, blood group ${member.bloodGroup}` : ""}. Preferred language: ${member.preferredLanguage}.`,
  );

  if (history.length > 0) {
    lines.push("Recent recorded history (user-entered, not clinically verified):");
    for (const item of history) {
      lines.push(
        `- ${item.recordedAt}: ${item.category} — ${item.title}${item.status ? ` (${item.status})` : ""}${item.severity ? `, severity ${item.severity}` : ""}`,
      );
    }
  } else {
    lines.push("No medical history entries are recorded.");
  }

  if (activeMeds.length > 0) {
    lines.push("Active medication schedules (user-recorded; do not change doses):");
    for (const med of activeMeds) {
      lines.push(
        `- ${med.name} ${med.strength} ${med.form}, prescribed dose ${med.dose}, ${med.frequency}, times ${(med.times ?? []).join(", ")}, ${med.startDate} to ${med.endDate ?? "ongoing"}`,
      );
    }
  } else {
    lines.push("No active medication schedules are recorded.");
  }

  if (reports.length > 0) {
    lines.push(
      `Recorded reports: ${Number(counts[0]?.count ?? 0)} total. The ${reports.length} most recent with completed AI explanations are summarised below.`,
    );
    for (const report of reports) {
      lines.push(
        `- ${report.reportDate} ${report.title} (${report.category}): ${(report.summary ?? "").slice(0, 500)}`,
      );
    }
  } else {
    lines.push(
      `Recorded reports: ${Number(counts[0]?.count ?? 0)} total; none has a completed AI explanation.`,
    );
  }

  lines.push(
    "Use this context only where relevant. Do not assume the record is complete or clinically verified.",
  );

  return lines.join("\n").slice(0, 7000);
}
