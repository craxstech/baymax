"use server";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  accountDeletionRecords,
  consents,
  families,
  files,
  sessions,
  users,
} from "@/db/schema";
import { requireUser, revokeAllSessions, revokeSessionForUser } from "@/lib/auth";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { changePasswordSchema, profileSchema } from "@/lib/validation";
import { grantConsent, revokeConsent, type ConsentKind } from "@/lib/consents";
import { serverConfig } from "@/lib/config";
import { deletePrivateFile } from "@/lib/storage";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { hashEmail } from "@/lib/security";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/settings");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) {
    return errorState("Check your profile details.", zodFieldErrors(parsed.error));
  }

  const timezoneValid = (() => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone }).format();
      return true;
    } catch {
      return false;
    }
  })();
  if (!timezoneValid) {
    return errorState("Choose a valid time zone.", {
      timezone: ["Choose a time zone from the list."],
    });
  }

  const db = await getDb();
  await db
    .update(users)
    .set({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      locale: parsed.data.locale,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await recordAudit({
    actorUserId: user.id,
    action: "account.profile_updated",
    entityType: "user",
    entityId: user.id,
    metadata: { locale: parsed.data.locale },
  });

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return successState("Profile updated. Times across the app now use the selected time zone.");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/settings/security");
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return errorState("Check the password fields.", zodFieldErrors(parsed.error));
  }

  const limit = await checkRateLimit("password-change", user.id, 5, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) return errorState("Your account could not be loaded.");

  const valid = await bcrypt.compare(parsed.data.currentPassword, row.passwordHash);
  if (!valid) {
    return errorState("Your current password is incorrect.", {
      currentPassword: ["Your current password is incorrect."],
    });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return errorState("Choose a password different from your current one.", {
      newPassword: ["Choose a different password."],
    });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date(), failedLoginCount: 0, lockedUntil: null })
    .where(eq(users.id, user.id));

  await revokeAllSessions(user.id);
  await recordAudit({
    actorUserId: user.id,
    action: "account.password_changed",
    entityType: "user",
    entityId: user.id,
    metadata: {},
  });

  revalidatePath("/app/settings/security");
  return successState(
    "Password changed. Other devices have been signed out; this session stays active.",
  );
}

const SETTINGS_CONSENTS = new Set<ConsentKind>(["AI_PROCESSING", "MARKETING"]);

export async function updateConsentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/settings/privacy");
  const kind = String(formData.get("kind") ?? "") as ConsentKind;
  const grant = formData.get("granted") === "true";

  if (!SETTINGS_CONSENTS.has(kind)) {
    return errorState("That consent type is not managed on this page.");
  }

  if (grant) {
    await grantConsent({
      userId: user.id,
      kind,
      metadata: { surface: "settings-privacy" },
    });
  } else {
    await revokeConsent(user.id, kind);
  }

  await recordAudit({
    actorUserId: user.id,
    action: grant ? "consent.granted" : "consent.revoked",
    entityType: "consent",
    entityId: user.id,
    metadata: { kind },
  });

  revalidatePath("/app/settings/privacy");
  revalidatePath("/app/ai-doctor");
  return successState(
    grant
      ? "Consent recorded. You can withdraw it at any time."
      : "Consent withdrawn. Features that depend on it are now disabled.",
  );
}

export async function revokeSpecificSessionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/settings/security");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return errorState("That session could not be found.");

  const db = await getDb();
  const [row] = await db
    .select({ id: sessions.id, revokedAt: sessions.revokedAt })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
    .limit(1);
  if (!row) return errorState("That session could not be found.");

  await revokeSessionForUser(sessionId, user.id);
  await recordAudit({
    actorUserId: user.id,
    action: "account.session_revoked",
    entityType: "session",
    entityId: sessionId,
    metadata: {},
  });

  revalidatePath("/app/settings/security");
  return successState("That session was signed out.");
}

export async function revokeOtherSessionsAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/settings/security");
  await revokeAllSessions(user.id);
  await recordAudit({
    actorUserId: user.id,
    action: "account.other_sessions_revoked",
    entityType: "user",
    entityId: user.id,
    metadata: {},
  });

  revalidatePath("/app/settings/security");
  return successState("Other sessions were signed out. This device stays signed in.");
}

export async function requestAccountDeletionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/settings");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  if (confirmation !== "DELETE MY ACCOUNT") {
    return errorState('Type "DELETE MY ACCOUNT" exactly to confirm.');
  }
  if (!password) {
    return errorState("Enter your password to confirm account deletion.", {
      password: ["Enter your current password."],
    });
  }

  const limit = await checkRateLimit("account-deletion", user.id, 3, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [row] = await db
    .select({ passwordHash: users.passwordHash, email: users.email })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) return errorState("Your account could not be loaded.");

  const valid = await bcrypt.compare(password, row.passwordHash);
  if (!valid) {
    return errorState("Your password is incorrect, so the account was not deleted.", {
      password: ["Your password is incorrect."],
    });
  }

  const ownedFiles = await db
    .select({ id: files.id, storageKey: files.storageKey })
    .from(files)
    .where(eq(files.ownerUserId, user.id));

  for (const file of ownedFiles) {
    try {
      await deletePrivateFile(file.storageKey);
    } catch (error) {
      logger.error("account_deletion_file_cleanup_failed", error);
      return errorState(
        "One of your private files could not be removed from storage, so the account was not deleted. Please try again or contact support.",
      );
    }
  }

  await recordAudit({
    actorUserId: user.id,
    action: "account.deletion_requested",
    entityType: "user",
    entityId: user.id,
    metadata: { fileCount: ownedFiles.length },
  });

  const emailHash = hashEmail(row.email);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(accountDeletionRecords).values({
        emailHash,
        requestedByUserId: user.id,
        reason: reason || null,
      });
      await tx.delete(users).where(eq(users.id, user.id));
    });
  } catch (error) {
    logger.error("account_deletion_failed", error);
    return errorState("The account could not be deleted. Nothing further was changed.");
  }

  redirect("/?account=deleted");
}

export async function resetDemoWorkspaceAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/settings");
  if (!user.isDemo || serverConfig.isProduction) {
    return errorState("Demo reset is only available in a local demo workspace.");
  }

  const db = await getDb();
  const ownedFamilies = await db
    .select({ id: families.id })
    .from(families)
    .where(eq(families.ownerId, user.id));
  for (const family of ownedFamilies) {
    await db.delete(families).where(eq(families.id, family.id));
  }
  await db.delete(consents).where(and(eq(consents.userId, user.id), isNull(consents.revokedAt)));
  await recordAudit({
    actorUserId: user.id,
    action: "demo.workspace_reset",
    entityType: "user",
    entityId: user.id,
    metadata: {},
  });

  revalidatePath("/app");
  revalidatePath("/app/family");
  return successState("Demo care data cleared. Use the demo seed instructions to recreate it.");
}
