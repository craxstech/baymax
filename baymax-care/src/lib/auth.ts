import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { generateToken, hashIp, hashToken } from "./security";
import { safeInternalPath } from "./utils";

export const SESSION_COOKIE = "baymax_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  timezone: string;
  locale: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  isDemo: boolean;
  createdAt: Date;
};

async function requestMetadata() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const userAgent = (h.get("user-agent") ?? "Unknown device").slice(0, 500);
  return { ipHash: hashIp(ip), userAgent };
}

export async function createSession(userId: string) {
  const db = await getDb();
  const rawToken = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const metadata = await requestMetadata();

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt,
    ipHash: metadata.ipHash,
    userAgent: metadata.userAgent,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });

  return rawToken;
}

export const getSessionUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  try {
    const db = await getDb();
    const [result] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        timezone: users.timezone,
        locale: users.locale,
        role: users.role,
        status: users.status,
        isDemo: users.isDemo,
        createdAt: users.createdAt,
        sessionId: sessions.id,
        lastUsedAt: sessions.lastUsedAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, hashToken(rawToken)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          eq(users.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!result) return null;

    if (Date.now() - result.lastUsedAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
      await db
        .update(sessions)
        .set({ lastUsedAt: new Date() })
        .where(eq(sessions.id, result.sessionId));
    }

    const { sessionId: _sessionId, lastUsedAt: _lastUsedAt, ...user } = result;
    return user;
  } catch {
    return null;
  }
});

export async function requireUser(nextPath = "/app") {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(safeInternalPath(nextPath))}`);
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") {
    redirect("/app?error=forbidden");
  }
  return user;
}

export async function requireVerifiedUser(nextPath = "/app") {
  const user = await requireUser(nextPath);
  if (!user.emailVerifiedAt) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}&needed=1`);
  }
  return user;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    const db = await getDb();
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(rawToken)));
  }
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function revokeSessionForUser(sessionId: string, userId: string) {
  const db = await getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
}

export async function revokeAllSessions(userId: string, except?: string) {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE)?.value;
  const currentHash = rawToken ? hashToken(rawToken) : null;
  const db = await getDb();
  const active = await db
    .select({ id: sessions.id, tokenHash: sessions.tokenHash })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

  for (const session of active) {
    if (session.id === except) continue;
    if (currentHash && session.tokenHash === currentHash) continue;
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
  }
}

export async function currentSessionId() {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(rawToken)))
    .limit(1);
  return row?.id ?? null;
}
