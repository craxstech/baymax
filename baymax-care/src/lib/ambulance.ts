import "server-only";

import { z } from "zod";
import { ambulanceConfigured, integrations } from "./config";
import { logger } from "./logger";

/**
 * Ambulance partner contract (operator-provided):
 *   POST {AMBULANCE_API_BASE_URL}/requests
 *   Authorization: Bearer <AMBULANCE_API_KEY>
 *   Idempotency-Key: <uuid>
 *
 * Emergency medical transport is regulated and location-specific. This app
 * never invents a dispatch, vehicle, or ETA. Without a verified local partner,
 * the UI tells the user to call emergency services directly.
 */
const responseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["RECEIVED", "DISPATCHED", "EN_ROUTE", "COMPLETED", "CANCELLED", "FAILED"]),
  detail: z.string().max(500).optional(),
});

export type AmbulanceResult =
  | { status: "ok"; data: z.infer<typeof responseSchema> }
  | { status: "unavailable"; reason: string }
  | { status: "error"; reason: string };

export async function requestAmbulance(
  input: {
    alertId: string | null;
    memberName: string;
    latitude: number | null;
    longitude: number | null;
    locationAccuracyM: number | null;
    note: string | null;
  },
  idempotencyKey: string,
): Promise<AmbulanceResult> {
  if (!ambulanceConfigured()) {
    return {
      status: "unavailable",
      reason:
        "No ambulance partner is configured for this deployment. Call your local emergency number directly. Baymax Care has not contacted an ambulance service.",
    };
  }

  if (input.latitude === null || input.longitude === null) {
    return {
      status: "error",
      reason: "A precise location is required before an ambulance request can be sent.",
    };
  }

  try {
    const response = await fetch(
      `${integrations.ambulance.baseUrl.replace(/\/$/, "")}/requests`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integrations.ambulance.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      logger.warn("ambulance_provider_rejected", { status: response.status });
      return {
        status: "error",
        reason: `The ambulance partner could not accept the request (HTTP ${response.status}). Call your local emergency number now.`,
      };
    }

    const parsed = responseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      return {
        status: "error",
        reason:
          "The ambulance partner returned an unverifiable response. Call your local emergency number now.",
      };
    }
    return { status: "ok", data: parsed.data };
  } catch (error) {
    logger.error("ambulance_request_failed", error);
    return {
      status: "error",
      reason:
        "The ambulance partner could not be reached. Call your local emergency number now.",
    };
  }
}
