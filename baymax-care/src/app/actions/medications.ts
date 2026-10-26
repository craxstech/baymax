"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { medicationDoses, medications, prescriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  permissionMessage,
  requireMemberAccess,
} from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { checkDateOrder, medicationSchema } from "@/lib/validation";
import { ensureDosesForMedication } from "@/lib/schedule";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { todayInZone } from "@/lib/utils";

export async function createMedicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/medications");
  const parsed = medicationSchema.safeParse({
    memberId: formData.get("memberId"),
    prescriptionId: formData.get("prescriptionId"),
    name: formData.get("name"),
    strength: formData.get("strength"),
    dosageForm: formData.get("dosageForm"),
    prescribedDose: formData.get("prescribedDose"),
    route: formData.get("route"),
    frequency: formData.get("frequency"),
    times: formData.get("times"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate")?.toString() ?? "",
    prescriber: formData.get("prescriber"),
    instructions: formData.get("instructions")?.toString() || undefined,
    foodInstructions: formData.get("foodInstructions")?.toString() || undefined,
    refillNote: formData.get("refillNote")?.toString() || undefined,
  });
  if (!parsed.success) {
    return errorState("Check the medication schedule.", zodFieldErrors(parsed.error));
  }

  if (!checkDateOrder(parsed.data.startDate, parsed.data.endDate)) {
    return errorState("The end date must be on or after the start date.", {
      endDate: ["End date must be on or after the start date."],
    });
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "medications");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const [prescription] = await db
    .select()
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.id, parsed.data.prescriptionId),
        eq(prescriptions.memberId, parsed.data.memberId),
      ),
    )
    .limit(1);

  if (!prescription) {
    return errorState("Choose a prescription recorded for this family member.");
  }
  if (prescription.status === "REJECTED") {
    return errorState("A rejected prescription cannot be the basis for a medication schedule.");
  }
  if (
    prescription.status === "EXPIRED" ||
    (prescription.validUntil && prescription.validUntil < todayInZone(user.timezone))
  ) {
    return errorState("This prescription has expired. Record a current prescription before adding a schedule.");
  }

  const times = Array.from(new Set(parsed.data.times)).sort();

  try {
    let medicationId = "";
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(medications)
        .values({
          memberId: parsed.data.memberId,
          prescriptionId: parsed.data.prescriptionId,
          name: parsed.data.name,
          strength: parsed.data.strength,
          dosageForm: parsed.data.dosageForm,
          prescribedDose: parsed.data.prescribedDose,
          route: parsed.data.route,
          frequency: parsed.data.frequency,
          scheduledTimes: times,
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate ?? null,
          prescriber: parsed.data.prescriber,
          instructions: parsed.data.instructions || null,
          foodInstructions: parsed.data.foodInstructions || null,
          refillNote: parsed.data.refillNote || null,
          createdById: user.id,
        })
        .returning({ id: medications.id });
      medicationId = row.id;
    });

    const today = todayInZone(user.timezone);
    await ensureDosesForMedication(
      {
        id: medicationId,
        memberId: parsed.data.memberId,
        scheduledTimes: times,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate ?? null,
        active: true,
      },
      user.timezone,
      today,
      today,
    );

    await recordAudit({
      actorUserId: user.id,
      memberId: parsed.data.memberId,
      action: "medication.created",
      entityType: "medication",
      entityId: medicationId,
      metadata: { timeCount: times.length },
    });

    revalidatePath("/app/medications");
    revalidatePath("/app");
    revalidatePath(`/app/family/${parsed.data.memberId}`);
    return successState("Medication schedule added. Today's doses are now in your care list.");
  } catch (error) {
    logger.error("medication_create_failed", error);
    return errorState("We couldn't save this medication schedule. Please try again.");
  }
}

export async function markDoseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/medications");
  const doseId = String(formData.get("doseId") ?? "");
  const statusValue = String(formData.get("status") ?? "");
  if (statusValue !== "TAKEN" && statusValue !== "SKIPPED") {
    return errorState("Choose whether the dose was taken or skipped.");
  }

  const db = await getDb();
  const [dose] = await db
    .select({
      id: medicationDoses.id,
      memberId: medicationDoses.memberId,
      medicationId: medicationDoses.medicationId,
      status: medicationDoses.status,
      scheduledAt: medicationDoses.scheduledAt,
    })
    .from(medicationDoses)
    .where(eq(medicationDoses.id, doseId))
    .limit(1);
  if (!dose) return errorState("That dose could not be found.");

  try {
    await requireMemberAccess(user.id, dose.memberId, "medications");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const [medication] = await db
    .select({ name: medications.name })
    .from(medications)
    .where(eq(medications.id, dose.medicationId))
    .limit(1);

  await db
    .update(medicationDoses)
    .set({
      status: statusValue,
      actedAt: new Date(),
      actedById: user.id,
    })
    .where(eq(medicationDoses.id, doseId));

  await recordAudit({
    actorUserId: user.id,
    memberId: dose.memberId,
    action: statusValue === "TAKEN" ? "medication.dose_taken" : "medication.dose_skipped",
    entityType: "medication_dose",
    entityId: doseId,
    metadata: { medicationId: dose.medicationId },
  });

  revalidatePath("/app/medications");
  revalidatePath("/app");
  return successState(
    statusValue === "TAKEN"
      ? `${medication?.name ?? "Dose"} recorded as taken.`
      : `${medication?.name ?? "Dose"} recorded as skipped.`,
  );
}

export async function setMedicationActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/medications");
  const medicationId = String(formData.get("medicationId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const active = formData.get("active") === "true";

  try {
    await requireMemberAccess(user.id, memberId, "medications");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const [medication] = await db
    .select({ id: medications.id })
    .from(medications)
    .where(
      and(eq(medications.id, medicationId), eq(medications.memberId, memberId)),
    )
    .limit(1);
  if (!medication) return errorState("That medication could not be found.");

  await db
    .update(medications)
    .set({ active, updatedAt: new Date() })
    .where(eq(medications.id, medicationId));

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: active ? "medication.resumed" : "medication.paused",
    entityType: "medication",
    entityId: medicationId,
    metadata: {},
  });

  revalidatePath("/app/medications");
  revalidatePath("/app");
  return successState(active ? "Schedule resumed." : "Schedule paused. Existing dose history is kept.");
}

export async function discontinueMedicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/medications");
  const medicationId = String(formData.get("medicationId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  if (String(formData.get("confirmation") ?? "").trim().toUpperCase() !== "STOP") {
    return errorState('Type "STOP" to confirm ending this schedule.');
  }

  try {
    await requireMemberAccess(user.id, memberId, "medications");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  await db
    .update(medications)
    .set({ active: false, endDate: todayInZone(user.timezone), updatedAt: new Date() })
    .where(
      and(eq(medications.id, medicationId), eq(medications.memberId, memberId)),
    );

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "medication.discontinued",
    entityType: "medication",
    entityId: medicationId,
    metadata: {},
  });

  revalidatePath("/app/medications");
  revalidatePath("/app");
  return successState("Medication schedule ended. Past dose history is preserved.");
}
