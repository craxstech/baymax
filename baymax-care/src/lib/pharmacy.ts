import "server-only";

import { z } from "zod";
import { integrations, pharmacyConfigured } from "./config";
import { logger } from "./logger";

/**
 * Pharmacy gateway contract (operator-provided):
 *   POST {PHARMACY_API_BASE_URL}/orders
 *   Authorization: Bearer <PHARMACY_API_KEY>
 *   Idempotency-Key: <uuid>
 *
 * The gateway must validate the prescription with the pharmacy and return a
 * real order reference. This app never fabricates an order, price, stock
 * status, or delivery estimate when the provider is unavailable.
 */
const orderResponseSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "AWAITING_PROVIDER",
    "CONFIRMED",
    "PROCESSING",
    "DISPATCHED",
    "DELIVERED",
    "CANCELLED",
    "FAILED",
  ]),
  totalAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().min(1).max(8).optional(),
  deliveryEstimate: z.string().max(300).nullable().optional(),
});

export type PharmacyOrderInput = {
  prescriptionId: string;
  member: {
    name: string;
    dateOfBirth: string | null;
    phone: string | null;
    language: string;
  };
  prescriberName: string;
  issuedAt: string;
  items: Array<{ name: string; strength: string; quantity: number }>;
  deliveryAddress: string;
  currency: string;
};

export type PharmacyOrderResult =
  | { status: "ok"; data: z.infer<typeof orderResponseSchema> }
  | { status: "unavailable"; reason: string }
  | { status: "error"; reason: string };

export async function createPharmacyOrder(
  input: PharmacyOrderInput,
  idempotencyKey: string,
): Promise<PharmacyOrderResult> {
  if (!pharmacyConfigured()) {
    return {
      status: "unavailable",
      reason:
        "No pharmacy partner is configured. Set PHARMACY_PROVIDER, PHARMACY_API_BASE_URL, and PHARMACY_API_KEY to enable ordering.",
    };
  }

  try {
    const response = await fetch(
      `${integrations.pharmacy.baseUrl.replace(/\/$/, "")}/orders`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integrations.pharmacy.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": idempotencyKey,
          "X-Contract-Version": "2026-01",
        },
        body: JSON.stringify({
          prescriptionId: input.prescriptionId,
          patient: input.member,
          prescriber: input.prescriberName,
          issuedAt: input.issuedAt,
          items: input.items,
          deliveryAddress: input.deliveryAddress,
          currency: input.currency,
        }),
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      logger.warn("pharmacy_provider_rejected", { status: response.status });
      return {
        status: "error",
        reason:
          response.status === 401 || response.status === 403
            ? "The pharmacy gateway rejected the configured credentials."
            : `The pharmacy gateway could not accept the order (HTTP ${response.status}). No order was placed.`,
      };
    }

    const parsed = orderResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      logger.warn("pharmacy_provider_invalid_response");
      return {
        status: "error",
        reason:
          "The pharmacy gateway returned a response this app could not verify. No order is shown as placed; contact support.",
      };
    }

    return { status: "ok", data: parsed.data };
  } catch (error) {
    logger.error("pharmacy_request_failed", error);
    return {
      status: "error",
      reason: "The pharmacy gateway could not be reached. No order was placed.",
    };
  }
}
