import "server-only";

import { headers } from "next/headers";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";
import { hashIp } from "./security";
import { logger } from "./logger";

type AuditInput = {
  actorUserId?: string | null;
  memberId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string;
};

/**
 * Audit metadata deliberately contains identifiers and categories only —
 * never free-text health content, passwords, tokens, or uploaded documents.
 */
export async function recordAudit(input: AuditInput) {
  try {
    let ipHash: string | undefined;
    if (input.ip) ipHash = hashIp(input.ip);
    else {
      const h = await headers();
      const forwarded = h.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip");
      ipHash = ip ? hashIp(ip) : undefined;
    }

    const db = await getDb();
    await db.insert(auditEvents).values({
      actorUserId: input.actorUserId ?? null,
      memberId: input.memberId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      ipHash,
    });
  } catch (error) {
    logger.error("audit_write_failed", error, { action: input.action });
  }
}

export async function recordIntegrationEvent(input: {
  type: "AI" | "EMAIL" | "SMS" | "STORAGE" | "PHARMACY" | "CONSULTATION" | "AMBULANCE" | "OCR";
  status: "SUCCESS" | "UNAVAILABLE" | "FAILED";
  summary: string;
  detail?: string;
}) {
  try {
    const db = await getDb();
    const { integrationEvents } = await import("@/db/schema");
    await db.insert(integrationEvents).values({
      type: input.type,
      status: input.status,
      summary: input.summary,
      detail: input.detail,
    });
  } catch (error) {
    logger.error("integration_event_write_failed", error);
  }
}
