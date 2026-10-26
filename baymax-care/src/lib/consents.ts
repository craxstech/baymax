import "server-only";

import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { consents } from "@/db/schema";
import { brand } from "./config";

export type ConsentKind =
  | "TERMS"
  | "PRIVACY"
  | "HEALTH_PROCESSING"
  | "AI_PROCESSING"
  | "MARKETING"
  | "WOMENS_HEALTH";

export async function hasActiveConsent(
  userId: string,
  kind: ConsentKind,
  memberId?: string | null,
) {
  const db = await getDb();
  const [row] = await db
    .select({ id: consents.id, granted: consents.granted })
    .from(consents)
    .where(
      and(
        eq(consents.userId, userId),
        eq(consents.kind, kind),
        eq(consents.version, brand.legalVersion),
        isNull(consents.revokedAt),
        memberId
          ? or(eq(consents.memberId, memberId), isNull(consents.memberId))
          : isNull(consents.memberId),
      ),
    )
    .orderBy(desc(consents.createdAt))
    .limit(1);
  return Boolean(row?.granted);
}

export async function latestConsent(userId: string, kind: ConsentKind) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(consents)
    .where(and(eq(consents.userId, userId), eq(consents.kind, kind)))
    .orderBy(desc(consents.createdAt))
    .limit(1);
  return row ?? null;
}

export async function grantConsent({
  userId,
  kind,
  memberId,
  metadata = {},
}: {
  userId: string;
  kind: ConsentKind;
  memberId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  await db.insert(consents).values({
    userId,
    memberId: memberId ?? null,
    kind,
    version: brand.legalVersion,
    granted: true,
    metadata,
  });
}

export async function revokeConsent(userId: string, kind: ConsentKind) {
  const db = await getDb();
  await db
    .update(consents)
    .set({ revokedAt: new Date(), granted: false })
    .where(
      and(
        eq(consents.userId, userId),
        eq(consents.kind, kind),
        isNull(consents.revokedAt),
      ),
    );
}
