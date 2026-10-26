"use server";

import { and, desc, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  alertDeliveries,
  ambulanceRequests,
  emergencyContacts,
  familyAccess,
  familyMembers,
  medicalHistory,
  medications,
  notifications,
  sosAlerts,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { permissionMessage, requireMemberAccess } from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { emergencyContactSchema } from "@/lib/validation";
import { ambulanceConfigured, smsConfigured, emailConfigured } from "@/lib/config";
import { sendEmail, sosEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { requestAmbulance } from "@/lib/ambulance";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { ageFromDob } from "@/lib/utils";

function parseCoordinate(
  raw: string,
  min: number,
  max: number,
): { value: number | null; error?: string } {
  if (!raw.trim()) return { value: null };
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { value: null, error: "Location coordinates were not valid." };
  }
  return { value: parsed };
}

async function healthSummary(memberId: string) {
  const db = await getDb();
  const [member] = await db
    .select({
      name: familyMembers.name,
      dateOfBirth: familyMembers.dateOfBirth,
      bloodGroup: familyMembers.bloodGroup,
    })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1);
  if (!member) return "";

  const [relevantHistory, activeMeds] = await Promise.all([
    db
      .select({
        category: medicalHistory.category,
        title: medicalHistory.title,
        severity: medicalHistory.severity,
      })
      .from(medicalHistory)
      .where(
        and(
          eq(medicalHistory.memberId, memberId),
          isNull(medicalHistory.deletedAt),
          or(
            eq(medicalHistory.category, "ALLERGY"),
            eq(medicalHistory.category, "CONDITION"),
          ),
        ),
      )
      .orderBy(desc(medicalHistory.recordedAt))
      .limit(10),
    db
      .select({
        name: medications.name,
        strength: medications.strength,
        dose: medications.prescribedDose,
      })
      .from(medications)
      .where(and(eq(medications.memberId, memberId), eq(medications.active, true)))
      .limit(12),
  ]);

  const age = ageFromDob(member.dateOfBirth);
  const lines = [
    `Name: ${member.name}${age !== null ? `, age ${age}` : ""}${member.bloodGroup ? `, blood group ${member.bloodGroup}` : ""}`,
  ];
  if (relevantHistory.length > 0) {
    lines.push(
      `Allergies/conditions: ${relevantHistory
        .map((item) => `${item.title}${item.severity ? ` (${item.severity})` : ""}`)
        .join("; ")}`,
    );
  }
  if (activeMeds.length > 0) {
    lines.push(
      `Current medicines: ${activeMeds
        .map((med) => `${med.name} ${med.strength} (${med.dose})`)
        .join("; ")}`,
    );
  }
  lines.push(
    "This summary is user-recorded and may be incomplete. It is not a clinical assessment.",
  );
  return lines.join("\n").slice(0, 2000);
}

export async function addEmergencyContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/alerts");
  const parsed = emergencyContactSchema.safeParse({
    memberId: formData.get("memberId"),
    name: formData.get("name"),
    relationship: formData.get("relationship"),
    phone: formData.get("phone"),
    email: formData.get("email")?.toString() || undefined,
    isPrimary: formData.get("isPrimary") === "on",
    consentToContact: formData.get("consentToContact"),
    consentToShareHealth: formData.get("consentToShareHealth") === "on",
  });
  if (!parsed.success) {
    return errorState("Check the emergency contact details.", zodFieldErrors(parsed.error));
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  await db.transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx
        .update(emergencyContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(emergencyContacts.memberId, parsed.data.memberId));
    }
    await tx.insert(emergencyContacts).values({
      memberId: parsed.data.memberId,
      name: parsed.data.name,
      relationship: parsed.data.relationship,
      phone: parsed.data.phone,
      email: parsed.data.email?.toLowerCase() ?? null,
      isPrimary: parsed.data.isPrimary,
      consentToContact: true,
      consentToShareHealth: parsed.data.consentToShareHealth,
    });
  });

  await recordAudit({
    actorUserId: user.id,
    memberId: parsed.data.memberId,
    action: "emergency.contact_added",
    entityType: "emergency_contact",
    metadata: { primary: parsed.data.isPrimary },
  });

  revalidatePath("/app/alerts");
  return successState(
    "Emergency contact saved. SMS and email delivery still depend on configured providers; this app never dispatches emergency services.",
  );
}

export async function deleteEmergencyContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/alerts");
  const contactId = String(formData.get("contactId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const result = await db
    .delete(emergencyContacts)
    .where(
      and(
        eq(emergencyContacts.id, contactId),
        eq(emergencyContacts.memberId, memberId),
      ),
    )
    .returning({ id: emergencyContacts.id });
  if (result.length === 0) return errorState("That emergency contact could not be found.");

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "emergency.contact_deleted",
    entityType: "emergency_contact",
    entityId: contactId,
    metadata: {},
  });

  revalidatePath("/app/alerts");
  return successState("Emergency contact removed.");
}

export async function sendSosAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/alerts");
  const memberId = String(formData.get("memberId") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);
  const shareHealthSummary = formData.get("shareHealthSummary") === "on";

  const lat = parseCoordinate(String(formData.get("latitude") ?? ""), -90, 90);
  const lng = parseCoordinate(String(formData.get("longitude") ?? ""), -180, 180);
  const accuracyRaw = String(formData.get("accuracy") ?? "").trim();
  const accuracy = accuracyRaw ? Math.max(0, Math.min(100000, Math.round(Number(accuracyRaw)))) : null;
  if (accuracyRaw && !Number.isFinite(accuracy)) {
    return errorState("Location accuracy was not valid.");
  }
  if (lat.error || lng.error) return errorState("The shared location was not valid.");
  if ((lat.value === null) !== (lng.value === null)) {
    return errorState("Share both latitude and longitude, or neither.");
  }

  try {
    await requireMemberAccess(user.id, memberId, "view");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const limit = await checkRateLimit("sos", user.id, 3, 15 * 60_000);
  if (!limit.allowed) {
    return errorState(
      `Too many SOS attempts. Call your local emergency number directly. ${formatRateLimitMessage(limit.retryAfterSeconds)}`,
    );
  }

  const db = await getDb();
  const [member] = await db
    .select({ name: familyMembers.name })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1);
  if (!member) return errorState("That family member could not be found.");

  const contacts = await db
    .select()
    .from(emergencyContacts)
    .where(
      and(
        eq(emergencyContacts.memberId, memberId),
        eq(emergencyContacts.consentToContact, true),
      ),
    );

  const [alert] = await db
    .insert(sosAlerts)
    .values({
      userId: user.id,
      memberId,
      status: "SENDING",
      latitude: lat.value !== null ? lat.value.toFixed(6) : null,
      longitude: lng.value !== null ? lng.value.toFixed(6) : null,
      locationAccuracyM: accuracy,
      message: message || null,
      shareHealthSummary,
    })
    .returning({ id: sosAlerts.id });

  const locationText =
    lat.value !== null && lng.value !== null
      ? `${lat.value.toFixed(5)}, ${lng.value.toFixed(5)}${accuracy ? ` (±${accuracy} m)` : ""} · https://maps.google.com/?q=${lat.value.toFixed(5)},${lng.value.toFixed(5)}`
      : null;
  const summary = shareHealthSummary ? await healthSummary(memberId) : null;

  const attempts: Array<{
    channel: "SMS" | "EMAIL";
    status: "SENT" | "FAILED" | "UNAVAILABLE";
    error?: string;
  }> = [];

  for (const contact of contacts) {
    const contactSummary = contact.consentToShareHealth ? summary : null;
    const baseBody = `Emergency alert from Baymax Care: ${member.name} has recorded an SOS and asked for help.${message ? ` Message: ${message}` : ""}${locationText ? ` Location: ${locationText}` : " No location shared."}${contactSummary ? `\n\nShared health information:\n${contactSummary}` : ""}\n\nThis is a notification only. It does not dispatch emergency services. Call them and local emergency services now.`;

    if (contact.phone) {
      const sms = smsConfigured()
        ? await sendSms(contact.phone, baseBody.slice(0, 1400))
        : { status: "unavailable" as const, error: "SMS delivery is not configured." };
      const status =
        sms.status === "sent" ? "SENT" : sms.status === "unavailable" ? "UNAVAILABLE" : "FAILED";
      attempts.push({ channel: "SMS", status, error: "error" in sms ? sms.error : undefined });
      await db.insert(alertDeliveries).values({
        alertId: alert.id,
        contactId: contact.id,
        channel: "SMS",
        status,
        providerReference: sms.status === "sent" ? sms.providerReference ?? null : null,
        errorMessage: "error" in sms ? sms.error : null,
      });
    }

    if (contact.email) {
      const email = emailConfigured()
        ? await sendEmail({
            to: contact.email,
            ...sosEmail(contact.name, member.name, locationText, contactSummary),
          })
        : { status: "unavailable" as const, error: "Email delivery is not configured." };
      const status =
        email.status === "sent" ? "SENT" : email.status === "unavailable" ? "UNAVAILABLE" : "FAILED";
      attempts.push({ channel: "EMAIL", status, error: "error" in email ? email.error : undefined });
      await db.insert(alertDeliveries).values({
        alertId: alert.id,
        contactId: contact.id,
        channel: "EMAIL",
        status,
        providerReference: email.status === "sent" ? email.providerReference ?? null : null,
        errorMessage: "error" in email ? email.error : null,
      });
    }
  }

  // In-app recipients are family members or caregivers explicitly allowed to
  // receive alerts. This does not imply that an emergency contact was reached.
  const recipients = await db
    .select({ userId: familyAccess.userId, accessId: familyAccess.id })
    .from(familyAccess)
    .where(
      and(
        eq(familyAccess.memberId, memberId),
        eq(familyAccess.canReceiveAlerts, true),
        isNull(familyAccess.revokedAt),
      ),
    );
  const inAppRecipients = recipients.filter((recipient) => recipient.userId !== user.id);
  if (inAppRecipients.length > 0) {
    await db.insert(notifications).values(
      inAppRecipients.map((recipient) => ({
        userId: recipient.userId,
        memberId,
        category: "EMERGENCY" as const,
        title: `Emergency alert for ${member.name}`,
        body: `${member.name} recorded an SOS.${message ? ` Message: ${message.slice(0, 180)}` : ""} Open the emergency page. This notification does not dispatch emergency services.`,
        href: "/app/alerts",
        dedupeKey: `sos:${alert.id}:${recipient.userId}`,
      })),
    );
    await db.insert(alertDeliveries).values(
      inAppRecipients.map((recipient) => ({
        alertId: alert.id,
        channel: "IN_APP" as const,
        status: "SENT" as const,
      })),
    );
  }

  const delivered = attempts.filter((attempt) => attempt.status === "SENT").length;
  const unavailable = attempts.filter((attempt) => attempt.status === "UNAVAILABLE").length;
  const failed = attempts.filter((attempt) => attempt.status === "FAILED").length;

  const status =
    contacts.length === 0
      ? "NO_CHANNEL"
      : delivered > 0 && delivered === attempts.length
        ? "COMPLETED"
        : delivered > 0
          ? "PARTIAL"
          : attempts.length > 0 && unavailable === attempts.length
            ? "NO_CHANNEL"
            : attempts.length === 0
              ? "NO_CHANNEL"
              : "FAILED";

  await db
    .update(sosAlerts)
    .set({ status, completedAt: new Date() })
    .where(eq(sosAlerts.id, alert.id));

  await db
    .insert(notifications)
    .values({
      userId: user.id,
      memberId,
      category: "EMERGENCY",
      title:
        status === "NO_CHANNEL"
          ? "SOS not delivered externally"
          : status === "COMPLETED"
            ? "SOS delivered to emergency contacts"
            : "SOS partially delivered",
      body:
        status === "NO_CHANNEL"
          ? "No configured message channel delivered your SOS. Call your local emergency number now. The alert is recorded in your account."
          : `${delivered} of ${attempts.length} external contact deliveries succeeded. ${failed ? `${failed} failed. ` : ""}${unavailable ? `${unavailable} were unavailable because a provider is not configured. ` : ""}This does not dispatch emergency services.`,
      href: "/app/alerts",
      dedupeKey: `sos-receipt:${alert.id}`,
    })
    .onConflictDoNothing();

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "emergency.sos_recorded",
    entityType: "sos_alert",
    entityId: alert.id,
    metadata: { status, contacts: contacts.length, attempts: attempts.length },
  });

  if (attempts.some((attempt) => attempt.status === "UNAVAILABLE")) {
    await recordIntegrationEvent({
      type: "SMS",
      status: "UNAVAILABLE",
      summary: "SOS delivery attempted with at least one unconfigured channel.",
    });
  }

  revalidatePath("/app/alerts");
  revalidatePath("/app/notifications");

  if (status === "NO_CHANNEL") {
    return errorState(
      "Your SOS was recorded, but no external contact was reached. No SMS or email provider is configured, or no emergency contact has a reachable channel. Call your local emergency number now.",
    );
  }
  if (status === "FAILED") {
    return errorState(
      "Your SOS was recorded, but every external delivery failed. Call your local emergency number now and try to reach your contact directly.",
    );
  }
  return successState(
    status === "COMPLETED"
      ? "SOS recorded. The configured provider accepted every contact delivery. This is not an emergency-services dispatch; call local emergency services if there is immediate danger."
      : "SOS recorded. Some contact deliveries did not succeed. Check the delivery log below and call your local emergency number if there is immediate danger.",
  );
}

export async function requestAmbulanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/alerts");
  const memberId = String(formData.get("memberId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const lat = parseCoordinate(String(formData.get("latitude") ?? ""), -90, 90);
  const lng = parseCoordinate(String(formData.get("longitude") ?? ""), -180, 180);
  const accuracyRaw = String(formData.get("accuracy") ?? "").trim();
  const accuracy = accuracyRaw ? Math.round(Number(accuracyRaw)) : null;
  if (accuracyRaw && !Number.isFinite(accuracy)) {
    return errorState("Location accuracy was not valid.");
  }

  try {
    await requireMemberAccess(user.id, memberId, "view");
  } catch (error) {
    return errorState(permissionMessage(error));
  }
  if (lat.value === null || lng.value === null) {
    return errorState("Share your location before requesting an ambulance through a partner.");
  }
  if (lat.error || lng.error) return errorState("The shared location was not valid.");

  const limit = await checkRateLimit("ambulance", user.id, 3, 15 * 60_000);
  if (!limit.allowed) {
    return errorState(
      `Too many requests. Call your local emergency number directly. ${formatRateLimitMessage(limit.retryAfterSeconds)}`,
    );
  }

  const db = await getDb();
  const [member] = await db
    .select({ name: familyMembers.name })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1);
  if (!member) return errorState("That family member could not be found.");

  const [record] = await db
    .insert(ambulanceRequests)
    .values({
      userId: user.id,
      provider: ambulanceConfigured() ? "configured" : "unconfigured",
      status: "REQUESTED",
      detail: note || null,
    })
    .returning({ id: ambulanceRequests.id });

  if (!ambulanceConfigured()) {
    await db
      .update(ambulanceRequests)
      .set({
        status: "UNAVAILABLE",
        detail: "No ambulance partner configured. User instructed to call emergency services directly.",
      })
      .where(eq(ambulanceRequests.id, record.id));
    await recordIntegrationEvent({
      type: "AMBULANCE",
      status: "UNAVAILABLE",
      summary: "Ambulance request refused because no partner is configured.",
    });
    revalidatePath("/app/alerts");
    return errorState(
      "No ambulance partner is configured, so no request was sent. Call your local emergency number now.",
    );
  }

  const result = await requestAmbulance(
    {
      alertId: null,
      memberName: member.name,
      latitude: lat.value,
      longitude: lng.value,
      locationAccuracyM: Number.isFinite(accuracy) ? accuracy : null,
      note: note || null,
    },
    record.id,
  );

  if (result.status !== "ok") {
    await db
      .update(ambulanceRequests)
      .set({ status: "FAILED", detail: result.reason })
      .where(eq(ambulanceRequests.id, record.id));
    await recordIntegrationEvent({
      type: "AMBULANCE",
      status: "FAILED",
      summary: "Ambulance partner request did not complete.",
    });
    revalidatePath("/app/alerts");
    return errorState(result.reason);
  }

  await db
    .update(ambulanceRequests)
    .set({
      provider: "configured",
      status: result.data.status,
      providerRequestId: result.data.id,
      detail: result.data.detail ?? note ?? null,
    })
    .where(eq(ambulanceRequests.id, record.id));

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "emergency.ambulance_requested",
    entityType: "ambulance_request",
    entityId: record.id,
    metadata: { providerStatus: result.data.status },
  });

  revalidatePath("/app/alerts");
  return successState(
    `The ambulance partner acknowledged the request with status: ${result.data.status.replaceAll("_", " ")}. Call your local emergency number as well if there is immediate danger.`,
  );
}
