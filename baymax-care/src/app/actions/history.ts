"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { medicalHistory } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  MemberAccessError,
  permissionMessage,
  requireMemberAccess,
} from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { medicalHistorySchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

function parseHistoryForm(formData: FormData) {
  return medicalHistorySchema.safeParse({
    memberId: formData.get("memberId"),
    category: formData.get("category"),
    title: formData.get("title"),
    details: formData.get("details")?.toString() || undefined,
    status: formData.get("status")?.toString() || undefined,
    severity: formData.get("severity")?.toString() || undefined,
    recordedAt: formData.get("recordedAt"),
    source: formData.get("source")?.toString() || "PATIENT",
    clinicianName: formData.get("clinicianName")?.toString() || undefined,
  });
}

export async function createMedicalHistoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/medical-history");
  const parsed = parseHistoryForm(formData);
  if (!parsed.success) {
    return errorState("Check the history entry.", zodFieldErrors(parsed.error));
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  try {
    const [entry] = await db
      .insert(medicalHistory)
      .values({
        memberId: parsed.data.memberId,
        category: parsed.data.category,
        title: parsed.data.title,
        details: parsed.data.details || null,
        status: parsed.data.status || null,
        severity: parsed.data.severity || null,
        recordedAt: parsed.data.recordedAt,
        source: parsed.data.source,
        clinicianName: parsed.data.clinicianName || null,
        recordedById: user.id,
      })
      .returning({ id: medicalHistory.id });

    await recordAudit({
      actorUserId: user.id,
      memberId: parsed.data.memberId,
      action: "history.created",
      entityType: "medical_history",
      entityId: entry.id,
      metadata: { category: parsed.data.category, source: parsed.data.source },
    });

    revalidatePath("/app/medical-history");
    revalidatePath("/app");
    revalidatePath(`/app/family/${parsed.data.memberId}`);
    return successState("History entry added.");
  } catch (error) {
    logger.error("history_create_failed", error);
    return errorState("We couldn't save this history entry. Please try again.");
  }
}

export async function updateMedicalHistoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/medical-history");
  const entryId = String(formData.get("entryId") ?? "");
  const parsed = parseHistoryForm(formData);
  if (!parsed.success) {
    return errorState("Check the history entry.", zodFieldErrors(parsed.error));
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const [existing] = await db
    .select({ id: medicalHistory.id, memberId: medicalHistory.memberId })
    .from(medicalHistory)
    .where(
      and(
        eq(medicalHistory.id, entryId),
        eq(medicalHistory.memberId, parsed.data.memberId),
        isNull(medicalHistory.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return errorState("That history entry could not be found.");

  await db
    .update(medicalHistory)
    .set({
      category: parsed.data.category,
      title: parsed.data.title,
      details: parsed.data.details || null,
      status: parsed.data.status || null,
      severity: parsed.data.severity || null,
      recordedAt: parsed.data.recordedAt,
      source: parsed.data.source,
      clinicianName: parsed.data.clinicianName || null,
      updatedAt: new Date(),
    })
    .where(eq(medicalHistory.id, entryId));

  await recordAudit({
    actorUserId: user.id,
    memberId: parsed.data.memberId,
    action: "history.updated",
    entityType: "medical_history",
    entityId: entryId,
    metadata: { category: parsed.data.category },
  });

  revalidatePath("/app/medical-history");
  revalidatePath(`/app/family/${parsed.data.memberId}`);
  return successState("History entry updated.");
}

export async function deleteMedicalHistoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/medical-history");
  const entryId = String(formData.get("entryId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const result = await db
    .update(medicalHistory)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(medicalHistory.id, entryId),
        eq(medicalHistory.memberId, memberId),
        isNull(medicalHistory.deletedAt),
      ),
    )
    .returning({ id: medicalHistory.id });

  if (result.length === 0) return errorState("That history entry could not be found.");

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "history.deleted",
    entityType: "medical_history",
    entityId: entryId,
    metadata: {},
  });

  revalidatePath("/app/medical-history");
  revalidatePath(`/app/family/${memberId}`);
  return successState("History entry removed from the active record.");
}
