import "server-only";

import { integrations, smsConfigured } from "./config";
import { logger } from "./logger";
import type { DeliveryResult } from "./email";

export async function sendSms(to: string, body: string): Promise<DeliveryResult> {
  if (!smsConfigured()) {
    return {
      status: "unavailable",
      error: "SMS delivery is not configured. Add the TWILIO_* environment variables.",
    };
  }

  try {
    const sid = integrations.sms.accountSid;
    const token = integrations.sms.authToken;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: integrations.sms.fromNumber,
          Body: body,
        }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );

    const data = (await response.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
      code?: number;
    };

    if (!response.ok) {
      logger.warn("sms_provider_rejected", { statusCode: response.status, code: data.code });
      return {
        status: "failed",
        error: data.message ? "The SMS provider rejected the message." : "SMS delivery failed.",
      };
    }

    return { status: "sent", providerReference: data.sid };
  } catch (error) {
    logger.error("sms_delivery_failed", error);
    return { status: "failed", error: "The SMS provider could not be reached." };
  }
}
