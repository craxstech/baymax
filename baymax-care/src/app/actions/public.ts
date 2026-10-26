"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";
import {
  errorState,
  successState,
  type ActionState,
  zodFieldErrors,
} from "@/lib/action-state";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { emailSchema, nameSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  topic: z.enum(["product", "privacy", "security", "accessibility", "partnerships", "other"]),
  message: z
    .string()
    .trim()
    .min(20, "Please add at least 20 characters so we can help.")
    .max(3000, "Please keep the message under 3,000 characters."),
});

export async function contactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return errorState("Please check the form and try again.", zodFieldErrors(parsed.error));
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await checkRateLimit("contact", `${ip}:${parsed.data.email}`, 4, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  try {
    const db = await getDb();
    await db.insert(contactMessages).values(parsed.data);
  } catch (error) {
    logger.error("contact_message_failed", error);
    return errorState(
      "We couldn't save your message. Please try again, or email our support address directly.",
    );
  }

  return successState(
    "Your message has been received. Support will reply by email, usually within two working days. Please do not send urgent medical information here.",
  );
}
