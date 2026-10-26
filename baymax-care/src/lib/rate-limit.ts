import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";
import { serverConfig } from "./config";
import { hashValue } from "./security";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * A persistent, transactional fixed-window limiter. Keys must already be
 * non-identifying (hash email/IP at the call site).
 */
export async function checkRateLimit(
  scope: string,
  key: string,
  limit = 10,
  windowMs = 15 * 60_000,
): Promise<RateLimitResult> {
  if (!serverConfig.rateLimitEnabled) {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }

  const db = await getDb();
  const compositeKey = `${scope}:${hashValue(key)}`;
  const now = new Date();

  return db.transaction(async (tx) => {
    await tx
      .insert(rateLimits)
      .values({ key: compositeKey, count: 0, windowStart: now })
      .onConflictDoNothing();

    const [row] = await tx
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, compositeKey))
      .for("update")
      .limit(1);

    if (!row) {
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    const windowExpired = now.getTime() - row.windowStart.getTime() >= windowMs;
    if (windowExpired) {
      await tx
        .update(rateLimits)
        .set({ count: 1, windowStart: now })
        .where(eq(rateLimits.key, compositeKey));
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    if (row.count >= limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((row.windowStart.getTime() + windowMs - now.getTime()) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    await tx
      .update(rateLimits)
      .set({ count: row.count + 1 })
      .where(eq(rateLimits.key, compositeKey));

    return {
      allowed: true,
      remaining: Math.max(0, limit - row.count - 1),
      retryAfterSeconds: 0,
    };
  });
}

export function formatRateLimitMessage(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Please try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}
