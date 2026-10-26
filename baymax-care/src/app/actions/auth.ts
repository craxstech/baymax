"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  authTokens,
  consents,
  families,
  familyAccess,
  familyMembers,
  notificationPreferences,
  notifications,
  users,
} from "@/db/schema";
import {
  createSession,
  destroyCurrentSession,
  getSessionUser,
  requireUser,
  revokeAllSessions,
} from "@/lib/auth";
import {
  errorState,
  successState,
  type ActionState,
  zodFieldErrors,
} from "@/lib/action-state";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import {
  checkRateLimit,
  formatRateLimitMessage,
} from "@/lib/rate-limit";
import { emailConfigured, brand, serverConfig } from "@/lib/config";
import {
  generateToken,
  hashIp,
  hashToken,
} from "@/lib/security";
import { logger } from "@/lib/logger";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";
import {
  passwordResetEmail,
  sendEmail,
  verificationEmail,
  type DeliveryResult,
} from "@/lib/email";
import { safeInternalPath } from "@/lib/utils";

const DEV_VERIFY_COOKIE = "baymax_dev_verify";
const DUMMY_BCRYPT_HASH =
  "$2b$12$G0F6mWWmZrACAnTGy8CFkO28II/P.IFeiTn1k9CiqYdvWKOhgFJIu";

async function requestIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

function appUrl(path: string) {
  return new URL(path, brand.url).toString();
}

async function issueVerification(userId: string, email: string, name: string) {
  const db = await getDb();
  const rawToken = generateToken();
  await db.insert(authTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    type: "EMAIL_VERIFY",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const url = appUrl(`/verify-email?token=${encodeURIComponent(rawToken)}`);
  const content = verificationEmail(name, url);
  const delivery = await sendEmail({ to: email, ...content });

  if (delivery.status !== "sent") {
    logger.warn("verification_email_not_sent", {
      status: delivery.status,
      reason: delivery.error,
    });
    await recordIntegrationEvent({
      type: "EMAIL",
      status: delivery.status === "unavailable" ? "UNAVAILABLE" : "FAILED",
      summary: "Verification email was not delivered.",
      detail: delivery.error,
    });
  }

  return { rawToken, delivery };
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await requestIp();
  const emailValue = String(formData.get("email") ?? "").trim().toLowerCase();
  const limit = await checkRateLimit("register", `${ip}:${emailValue}`, 5, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms"),
    acceptHealthProcessing: formData.get("acceptHealthProcessing"),
    next: formData.get("next")?.toString(),
  });

  if (!parsed.success) {
    return errorState(
      "Please check the highlighted information and try again.",
      zodFieldErrors(parsed.error),
    );
  }

  const data = parsed.data;
  const db = await getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    return errorState(
      "An account with this email already exists. Sign in or reset your password instead.",
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  let newUserId = "";

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name: data.name,
          email: data.email,
          passwordHash,
        })
        .returning({ id: users.id });
      newUserId = user.id;

      const [family] = await tx
        .insert(families)
        .values({
          name: `${data.name.split(" ")[0]}'s family`,
          ownerId: user.id,
        })
        .returning({ id: families.id });

      const [member] = await tx
        .insert(familyMembers)
        .values({
          familyId: family.id,
          name: data.name,
          relationship: "Self",
          isSelf: true,
          createdById: user.id,
        })
        .returning({ id: familyMembers.id });

      await tx.insert(familyAccess).values({
        memberId: member.id,
        userId: user.id,
        role: "OWNER",
        canView: true,
        canManage: true,
        canManageMedications: true,
        canReceiveAlerts: true,
        grantedById: user.id,
      });

      await tx.insert(consents).values([
        {
          userId: user.id,
          kind: "TERMS",
          version: brand.legalVersion,
          granted: true,
          metadata: { surface: "registration" },
        },
        {
          userId: user.id,
          kind: "PRIVACY",
          version: brand.legalVersion,
          granted: true,
          metadata: { surface: "registration" },
        },
        {
          userId: user.id,
          kind: "HEALTH_PROCESSING",
          version: brand.legalVersion,
          granted: true,
          metadata: { surface: "registration" },
        },
      ]);

      await tx.insert(notificationPreferences).values({
        userId: user.id,
        emailEnabled: false,
        smsEnabled: false,
        categories: {
          MEDICATION: true,
          CONSULTATION: true,
          PRESCRIPTION: true,
          ORDER: true,
          REPORT: true,
          HEALTH_REMINDER: true,
          FAMILY: true,
          EMERGENCY: true,
          SYSTEM: true,
        },
      });
    });
  } catch (error) {
    logger.error("registration_failed", error);
    return errorState("We couldn't create your account. Please try again.");
  }

  await recordAudit({
    actorUserId: newUserId,
    action: "account.created",
    entityType: "user",
    entityId: newUserId,
    metadata: { consents: ["TERMS", "PRIVACY", "HEALTH_PROCESSING"] },
    ip,
  });

  const { rawToken, delivery } = await issueVerification(
    newUserId,
    data.email,
    data.name,
  );

  // Only when email cannot be delivered in an explicitly local environment do
  // we keep the verification token in an HttpOnly cookie so the flow can be
  // completed. This does not pretend an email was sent.
  if (
    delivery.status !== "sent" &&
    !emailConfigured() &&
    serverConfig.devExposeAuthLinks &&
    !serverConfig.isProduction
  ) {
    const store = await cookies();
    store.set(DEV_VERIFY_COOKIE, rawToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/verify-email",
      maxAge: 24 * 60 * 60,
    });
  }

  await createSession(newUserId);
  redirect(
    `/app?welcome=1${delivery.status === "sent" ? "" : "&email_delivery=unavailable"}`,
  );
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await requestIp();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next")?.toString(),
  });

  if (!parsed.success) {
    return errorState(
      "Please check your email and password.",
      zodFieldErrors(parsed.error),
    );
  }

  const limit = await checkRateLimit(
    "login",
    `${ip}:${parsed.data.email}`,
    10,
    15 * 60_000,
  );
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return errorState(
      "This account is temporarily locked after repeated sign-in attempts. Try again later or reset your password.",
    );
  }

  const valid = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_BCRYPT_HASH,
  );

  if (!user || !valid) {
    if (user) {
      const failedLoginCount = user.failedLoginCount + 1;
      await db
        .update(users)
        .set({
          failedLoginCount,
          lockedUntil:
            failedLoginCount >= 8 ? new Date(Date.now() + 15 * 60_000) : user.lockedUntil,
        })
        .where(eq(users.id, user.id));
    }
    await recordAudit({
      actorUserId: user?.id ?? null,
      action: "auth.login_failed",
      entityType: "user",
      entityId: user?.id ?? null,
      metadata: {},
      ip,
    });
    return errorState("The email or password is incorrect.");
  }

  if (user.status !== "ACTIVE") {
    return errorState("This account cannot sign in. Contact support if you need help.");
  }

  await db
    .update(users)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await createSession(user.id);
  await recordAudit({
    actorUserId: user.id,
    action: "auth.login_succeeded",
    entityType: "user",
    entityId: user.id,
    metadata: {},
    ip,
  });

  redirect(safeInternalPath(parsed.data.next, "/app"));
}

export async function logoutAction() {
  const user = await getSessionUser();
  await destroyCurrentSession();
  if (user) {
    await recordAudit({
      actorUserId: user.id,
      action: "auth.logout",
      entityType: "user",
      entityId: user.id,
      metadata: {},
    });
  }
  redirect("/");
}

export async function verifyEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawToken = String(formData.get("token") ?? "").trim();
  if (!rawToken) {
    return errorState("This verification link is incomplete. Request a new email.");
  }

  const db = await getDb();
  const [token] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(rawToken)),
        eq(authTokens.type, "EMAIL_VERIFY"),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!token) {
    return errorState(
      "This verification link is invalid or has expired. Request a new verification email.",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, token.userId));
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(eq(authTokens.id, token.id));
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(authTokens.userId, token.userId),
          eq(authTokens.type, "EMAIL_VERIFY"),
          isNull(authTokens.usedAt),
        ),
      );
    await tx
      .insert(notifications)
      .values({
        userId: token.userId,
        category: "SYSTEM",
        title: "Email verified",
        body: "Your email address is now verified. Account and reminder emails can be delivered.",
        href: "/app/settings/security",
        dedupeKey: `email-verified:${token.id}`,
      })
      .onConflictDoNothing();
  });

  const store = await cookies();
  if (store.get(DEV_VERIFY_COOKIE)?.value === rawToken) {
    store.delete(DEV_VERIFY_COOKIE);
  }

  await recordAudit({
    actorUserId: token.userId,
    action: "auth.email_verified",
    entityType: "user",
    entityId: token.userId,
    metadata: {},
  });

  return successState("Your email is verified. You can continue to your health space.", {
    link: "/app",
    linkLabel: "Open your dashboard",
  });
}

export async function resendVerificationAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/verify-email");
  if (user.emailVerifiedAt) {
    return successState("Your email is already verified.", {
      link: "/app",
      linkLabel: "Open your dashboard",
    });
  }

  const limit = await checkRateLimit("verify-resend", user.id, 3, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const { delivery } = await issueVerification(user.id, user.email, user.name);
  if (delivery.status === "sent") {
    return successState("A new verification email is on its way.");
  }

  let developmentHint = "";
  if (serverConfig.devExposeAuthLinks && !serverConfig.isProduction) {
    developmentHint =
      " Email is not configured locally, so use the local verification button on this page.";
  }
  return errorState(
    `We couldn't send the email. ${delivery.error}${developmentHint}`,
  );
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await requestIp();
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return errorState(
      "Enter the email address used for your account.",
      zodFieldErrors(parsed.error),
    );
  }

  const limit = await checkRateLimit(
    "password-reset",
    `${ip}:${parsed.data.email}`,
    4,
    30 * 60_000,
  );
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  let developmentUrl: string | undefined;
  let deliveryStatus: DeliveryResult["status"] | undefined;

  if (user) {
    const rawToken = generateToken();
    await db.insert(authTokens).values({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      type: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    const resetPath = `/reset-password?token=${encodeURIComponent(rawToken)}`;
    const url = appUrl(resetPath);
    const email = passwordResetEmail(user.name, url);
    const delivery = await sendEmail({ to: user.email, ...email });
    deliveryStatus = delivery.status;

    if (delivery.status !== "sent") {
      await recordIntegrationEvent({
        type: "EMAIL",
        status: delivery.status === "unavailable" ? "UNAVAILABLE" : "FAILED",
        summary: "Password reset email was not delivered.",
        detail: delivery.error,
      });
    }

    if (
      delivery.status !== "sent" &&
      serverConfig.devExposeAuthLinks &&
      !serverConfig.isProduction
    ) {
      developmentUrl = resetPath;
    }

    await recordAudit({
      actorUserId: user.id,
      action: "auth.password_reset_requested",
      entityType: "user",
      entityId: user.id,
      metadata: { emailDelivery: deliveryStatus },
      ip,
    });
  }

  if (developmentUrl) {
    return successState(
      "If an account exists, a reset link has been generated. Email delivery is not configured locally, so use this development-only link.",
      {
        link: developmentUrl,
        linkLabel: "Open development reset link",
      },
    );
  }

  return successState(
    "If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.",
  );
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return errorState("Check the new password and try again.", zodFieldErrors(parsed.error));
  }

  const db = await getDb();
  const [token] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(parsed.data.token)),
        eq(authTokens.type, "PASSWORD_RESET"),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!token) {
    return errorState("This reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date(), failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, token.userId));
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(eq(authTokens.id, token.id));
  });

  await revokeAllSessions(token.userId);
  await recordAudit({
    actorUserId: token.userId,
    action: "auth.password_reset_completed",
    entityType: "user",
    entityId: token.userId,
    metadata: {},
  });

  return successState(
    "Your password has been reset. All other sessions have been signed out.",
    { link: "/login", linkLabel: "Sign in with your new password" },
  );
}

export async function currentIpHash() {
  return hashIp(await requestIp());
}
