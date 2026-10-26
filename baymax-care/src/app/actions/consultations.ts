"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { appointments, familyMembers, notifications } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth";
import { permissionMessage, requireMemberAccess } from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import {
  cancelConsultationRequest,
  createConsultationRequest,
} from "@/lib/consultations";
import { consultationConfigured } from "@/lib/config";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";
import { validTimeZone } from "@/lib/schedule";

const requestSchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  requestedAt: z.string().min(1, "Choose a date and time."),
  kind: z.enum(["VIDEO", "PHONE", "CHAT"]),
  notes: z.string().trim().max(1000).optional(),
});

export async function requestConsultationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser("/app/consultations");
  if (!consultationConfigured()) {
    return errorState(
      "No clinician scheduling partner is configured, so no consultation can be booked. This app does not invent clinicians or appointments.",
    );
  }

  const parsed = requestSchema.safeParse({
    memberId: formData.get("memberId"),
    requestedAt: formData.get("requestedAt"),
    kind: formData.get("kind"),
    notes: formData.get("notes")?.toString() || undefined,
  });
  if (!parsed.success) {
    return errorState("Check the consultation request.", zodFieldErrors(parsed.error));
  }

  const zone = validTimeZone(user.timezone);
  const requested = DateTime.fromISO(parsed.data.requestedAt, { zone });
  if (!requested.isValid) {
    return errorState("Choose a valid date and time.", {
      requestedAt: ["Choose a valid date and time."],
    });
  }
  if (requested < DateTime.now().minus({ minutes: 5 })) {
    return errorState("Choose a time in the future.", {
      requestedAt: ["Choose a time in the future."],
    });
  }
  if (requested > DateTime.now().plus({ days: 90 })) {
    return errorState("Choose a time within the next 90 days.");
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const limit = await checkRateLimit("consultation-request", user.id, 5, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [member] = await db
    .select({
      name: familyMembers.name,
      dateOfBirth: familyMembers.dateOfBirth,
      phone: familyMembers.phone,
      preferredLanguage: familyMembers.preferredLanguage,
    })
    .from(familyMembers)
    .where(eq(familyMembers.id, parsed.data.memberId))
    .limit(1);
  if (!member) return errorState("That family member could not be found.");

  const result = await createConsultationRequest({
    member: {
      name: member.name,
      dateOfBirth: member.dateOfBirth,
      phone: member.phone,
      language: member.preferredLanguage,
    },
    requestedAt: requested.toUTC().toISO() ?? "",
    timezone: zone,
    kind: parsed.data.kind,
    notes: parsed.data.notes || null,
    userId: user.id,
  });

  if (result.status !== "ok") {
    await recordIntegrationEvent({
      type: "CONSULTATION",
      status: result.status === "unavailable" ? "UNAVAILABLE" : "FAILED",
      summary: "Consultation request did not complete.",
      detail: result.reason,
    });
    return errorState(result.reason);
  }

  const scheduledAt = result.data.scheduledAt
    ? new Date(result.data.scheduledAt)
    : requested.toUTC().toJSDate();

  const [appointment] = await db
    .insert(appointments)
    .values({
      memberId: parsed.data.memberId,
      userId: user.id,
      provider: "configured",
      providerAppointmentId: result.data.id,
      scheduledAt,
      timezone: zone,
      kind: parsed.data.kind,
      status: result.data.status,
      joinUrl: result.data.joinUrl ?? null,
      notes: parsed.data.notes || null,
    })
    .returning({ id: appointments.id });

  await db
    .insert(notifications)
    .values({
      userId: user.id,
      memberId: parsed.data.memberId,
      category: "CONSULTATION",
      title:
        result.data.status === "CONFIRMED"
          ? "Consultation confirmed"
          : "Consultation request sent",
      body:
        result.data.status === "CONFIRMED"
          ? `The clinician scheduling partner confirmed the consultation for ${member.name}. Open it for details.`
          : `The request for ${member.name} was sent to the scheduling partner and is awaiting confirmation.`,
      href: `/app/consultations/${appointment.id}`,
      dedupeKey: `consultation-created:${appointment.id}`,
    })
    .onConflictDoNothing();

  await recordAudit({
    actorUserId: user.id,
    memberId: parsed.data.memberId,
    action: "consultation.requested",
    entityType: "appointment",
    entityId: appointment.id,
    metadata: { kind: parsed.data.kind, providerStatus: result.data.status },
  });
  await recordIntegrationEvent({
    type: "CONSULTATION",
    status: "SUCCESS",
    summary: "Consultation request accepted by the scheduling partner.",
  });

  revalidatePath("/app/consultations");
  revalidatePath("/app");
  return successState(
    result.data.status === "CONFIRMED"
      ? "The scheduling partner confirmed the consultation."
      : "Request received by the scheduling partner. It is not confirmed yet.",
    { link: `/app/consultations/${appointment.id}`, linkLabel: "Open consultation" },
  );
}

export async function cancelConsultationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser("/app/consultations");
  const appointmentId = String(formData.get("appointmentId") ?? "");

  const db = await getDb();
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(
      and(eq(appointments.id, appointmentId), eq(appointments.userId, user.id)),
    )
    .limit(1);
  if (!appointment) return errorState("That consultation could not be found.");
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    return errorState("This consultation can no longer be cancelled here.");
  }

  if (!appointment.providerAppointmentId) {
    return errorState("This appointment has no provider reference, so it cannot be safely cancelled.");
  }

  const result = await cancelConsultationRequest(appointment.providerAppointmentId);
  if (result.status !== "ok") {
    return errorState(result.reason);
  }

  await db
    .update(appointments)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId));

  await db
    .insert(notifications)
    .values({
      userId: user.id,
      memberId: appointment.memberId,
      category: "CONSULTATION",
      title: "Consultation cancelled",
      body: "The scheduling partner confirmed the cancellation.",
      href: `/app/consultations/${appointmentId}`,
      dedupeKey: `consultation-cancelled:${appointmentId}:${Date.now()}`,
    })
    .onConflictDoNothing();

  await recordAudit({
    actorUserId: user.id,
    memberId: appointment.memberId,
    action: "consultation.cancelled",
    entityType: "appointment",
    entityId: appointmentId,
    metadata: {},
  });

  revalidatePath("/app/consultations");
  revalidatePath(`/app/consultations/${appointmentId}`);
  return successState("The scheduling partner confirmed cancellation.");
}
