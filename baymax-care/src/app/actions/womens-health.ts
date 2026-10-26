"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { cycleEntries, womenHealthPreferences } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { permissionMessage, requireMemberAccess } from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { checkDateOrder, cycleEntrySchema, linesToArray } from "@/lib/validation";
import { grantConsent, hasActiveConsent, revokeConsent } from "@/lib/consents";
import { encryptText } from "@/lib/security";
import { recordAudit } from "@/lib/audit";

export async function grantWomensHealthConsentAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/womens-health");
  await grantConsent({
    userId: user.id,
    kind: "WOMENS_HEALTH",
    metadata: { surface: "womens-health" },
  });
  await recordAudit({
    actorUserId: user.id,
    action: "consent.womens_health_granted",
    entityType: "consent",
    metadata: {},
  });
  revalidatePath("/app/womens-health");
  return successState(
    "Consent recorded for this private section. You can revoke it at any time; revoking hides the section but does not automatically delete existing entries.",
  );
}

export async function revokeWomensHealthConsentAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/womens-health");
  await revokeConsent(user.id, "WOMENS_HEALTH");
  await recordAudit({
    actorUserId: user.id,
    action: "consent.womens_health_revoked",
    entityType: "consent",
    metadata: {},
  });
  revalidatePath("/app/womens-health");
  return successState(
    "Consent revoked. The section is hidden. Existing entries remain in your account until you delete them or delete the account.",
  );
}

export async function createCycleEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/womens-health");
  if (!(await hasActiveConsent(user.id, "WOMENS_HEALTH"))) {
    return errorState("Record consent for the women's health section before logging an entry.");
  }

  const memberId = String(formData.get("memberId") ?? "");
  const parsed = cycleEntrySchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate")?.toString() ?? "",
    flow: formData.get("flow")?.toString() || undefined,
    symptoms: linesToArray(formData.get("symptomsText"), 20),
    mood: formData.get("mood")?.toString() || undefined,
    energy: formData.get("energy")?.toString() || undefined,
    notes: formData.get("notes")?.toString() || undefined,
  });
  if (!parsed.success) {
    return errorState("Check the cycle entry.", zodFieldErrors(parsed.error));
  }
  if (parsed.data.endDate && !checkDateOrder(parsed.data.startDate, parsed.data.endDate)) {
    return errorState("The end date must be on or after the start date.", {
      endDate: ["End date must be on or after the start date."],
    });
  }

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const [entry] = await db
    .insert(cycleEntries)
    .values({
      memberId,
      userId: user.id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      flow: parsed.data.flow ?? null,
      symptoms: parsed.data.symptoms,
      mood: parsed.data.mood || null,
      energy: parsed.data.energy || null,
      notesEncrypted: parsed.data.notes ? encryptText(parsed.data.notes) : null,
    })
    .returning({ id: cycleEntries.id });

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "womens_health.entry_created",
    entityType: "cycle_entry",
    entityId: entry.id,
    metadata: {},
  });

  revalidatePath("/app/womens-health");
  return successState("Cycle entry saved. Free-text notes are encrypted at rest.");
}

export async function deleteCycleEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/womens-health");
  const entryId = String(formData.get("entryId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const result = await db
    .delete(cycleEntries)
    .where(
      and(
        eq(cycleEntries.id, entryId),
        eq(cycleEntries.memberId, memberId),
        eq(cycleEntries.userId, user.id),
      ),
    )
    .returning({ id: cycleEntries.id });
  if (result.length === 0) return errorState("That cycle entry could not be found.");

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "womens_health.entry_deleted",
    entityType: "cycle_entry",
    entityId: entryId,
    metadata: {},
  });

  revalidatePath("/app/womens-health");
  return successState("Cycle entry deleted.");
}

export async function updateWomenHealthPreferencesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/womens-health");
  if (!(await hasActiveConsent(user.id, "WOMENS_HEALTH"))) {
    return errorState("Record consent before changing these preferences.");
  }
  const predictionsEnabled = formData.get("predictionsEnabled") === "on";
  const remindersEnabled = formData.get("remindersEnabled") === "on";

  const db = await getDb();
  await db
    .insert(womenHealthPreferences)
    .values({
      userId: user.id,
      predictionsEnabled,
      remindersEnabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: womenHealthPreferences.userId,
      set: { predictionsEnabled, remindersEnabled, updatedAt: new Date() },
    });

  await recordAudit({
    actorUserId: user.id,
    action: "womens_health.preferences_updated",
    entityType: "women_health_preferences",
    entityId: user.id,
    metadata: { predictionsEnabled, remindersEnabled },
  });

  revalidatePath("/app/womens-health");
  return successState("Preferences saved.");
}
