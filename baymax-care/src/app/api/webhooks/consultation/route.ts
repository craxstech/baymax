"use server";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { webhookEvents, appointments } from "@/db/schema";
import { verifyWebhook } from "@/lib/security";
import { recordIntegrationEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const secret = process.env.CONSULTATION_WEBHOOK_SECRET;
  const body = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";

  if (!secret) {
    logger.warn("consultation_webhook_no_secret");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!verifyWebhook(Buffer.from(body), signature, secret)) {
    logger.warn("consultation_webhook_invalid_signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId =
    typeof payload === "object" && payload !== null && "event_id" in payload
      ? String((payload as { event_id?: unknown }).event_id)
      : null;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
  }

  const payloadHash = await (await import("node:crypto")).default
    .createHash("sha256")
    .update(body)
    .digest("hex");

  const db = await getDb();

  const existing = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, eventId))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  await db.insert(webhookEvents).values({
    provider: "consultation",
    eventId,
    payloadHash,
    status: "RECEIVED",
  });

  try {
    const appointmentId =
      typeof payload === "object" && payload !== null && "appointment_id" in payload
        ? String((payload as { appointment_id?: unknown }).appointment_id)
        : null;
    const status =
      typeof payload === "object" && payload !== null && "status" in payload
        ? String((payload as { status?: unknown }).status)
        : null;

    if (appointmentId && status) {
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.providerAppointmentId, appointmentId))
        .limit(1);

      if (appointment) {
        await db
          .update(appointments)
          .set({
            status: status as unknown as typeof appointments.$inferInsert["status"],
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, appointment.id));
      }
    }

    await db
      .update(webhookEvents)
      .set({ status: "PROCESSED", processedAt: new Date() })
      .where(eq(webhookEvents.eventId, eventId));

    await recordIntegrationEvent({
      type: "CONSULTATION",
      status: "SUCCESS",
      summary: "Consultation webhook processed.",
      detail: `Event ${eventId}`,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error("consultation_webhook_process_failed", error);
    await db
      .update(webhookEvents)
      .set({ status: "FAILED", errorMessage: String(error) })
      .where(eq(webhookEvents.eventId, eventId));
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
