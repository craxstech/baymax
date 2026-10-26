import "server-only";

import { z } from "zod";
import { consultationConfigured, integrations } from "./config";
import { logger } from "./logger";

/**
 * Consultation gateway contract (operator-provided):
 *   POST {CONSULTATION_API_BASE_URL}/appointments
 *   GET  {CONSULTATION_API_BASE_URL}/appointments/:id
 *   DELETE {CONSULTATION_API_BASE_URL}/appointments/:id
 *
 * A gateway is responsible for licensed-clinician availability and video
 * links. This repository deliberately contains no synthetic clinician roster
 * or fabricated consultation success.
 */
const appointmentResponseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED", "FAILED"]),
  scheduledAt: z.string().datetime().optional(),
  joinUrl: z.string().url().nullable().optional(),
});

export type ConsultationRequest = {
  member: {
    name: string;
    dateOfBirth: string | null;
    phone: string | null;
    language: string;
  };
  requestedAt: string;
  timezone: string;
  kind: string;
  notes: string | null;
  userId: string;
};

export type ConsultationResult =
  | { status: "ok"; data: z.infer<typeof appointmentResponseSchema> }
  | { status: "unavailable"; reason: string }
  | { status: "error"; reason: string };

export async function createConsultationRequest(
  input: ConsultationRequest,
): Promise<ConsultationResult> {
  if (!consultationConfigured()) {
    return {
      status: "unavailable",
      reason:
        "No clinician scheduling partner is configured. Set CONSULTATION_PROVIDER, CONSULTATION_API_BASE_URL, and CONSULTATION_API_KEY to enable booking.",
    };
  }

  try {
    const response = await fetch(
      `${integrations.consultation.baseUrl.replace(/\/$/, "")}/appointments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integrations.consultation.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Contract-Version": "2026-01",
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      logger.warn("consultation_provider_rejected", { status: response.status });
      return {
        status: "error",
        reason:
          response.status === 401 || response.status === 403
            ? "The consultation gateway rejected the configured credentials."
            : `The consultation gateway could not accept the request (HTTP ${response.status}). No appointment was booked.`,
      };
    }

    const parsed = appointmentResponseSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!parsed.success) {
      logger.warn("consultation_provider_invalid_response");
      return {
        status: "error",
        reason:
          "The consultation gateway returned an unverified response. No appointment is shown as confirmed.",
      };
    }
    return { status: "ok", data: parsed.data };
  } catch (error) {
    logger.error("consultation_request_failed", error);
    return {
      status: "error",
      reason: "The consultation gateway could not be reached. No appointment was booked.",
    };
  }
}

export async function cancelConsultationRequest(providerAppointmentId: string) {
  if (!consultationConfigured()) {
    return {
      status: "unavailable" as const,
      reason: "No consultation provider is configured, so cancellation must be handled manually.",
    };
  }

  try {
    const response = await fetch(
      `${integrations.consultation.baseUrl.replace(/\/$/, "")}/appointments/${encodeURIComponent(providerAppointmentId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${integrations.consultation.apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );
    if (!response.ok && response.status !== 404) {
      return {
        status: "error" as const,
        reason: `The consultation gateway could not confirm cancellation (HTTP ${response.status}).`,
      };
    }
    return { status: "ok" as const };
  } catch (error) {
    logger.error("consultation_cancel_failed", error);
    return {
      status: "error" as const,
      reason: "The consultation gateway could not be reached to cancel the appointment.",
    };
  }
}
