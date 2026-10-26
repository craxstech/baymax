"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  caregiverInvites,
  consents,
  families,
  familyAccess,
  familyMembers,
  notifications,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  MemberAccessError,
  permissionMessage,
  requireMemberAccess,
} from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import {
  caregiverInviteSchema,
  familyMemberSchema,
} from "@/lib/validation";
import { brand, emailConfigured, serverConfig } from "@/lib/config";
import { caregiverInviteEmail, sendEmail } from "@/lib/email";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { generateToken, hashToken } from "@/lib/security";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

async function ownedFamilyId(userId: string) {
  const db = await getDb();
  const [family] = await db
    .select({ id: families.id })
    .from(families)
    .where(eq(families.ownerId, userId))
    .limit(1);
  if (family) return family.id;

  const [created] = await db
    .insert(families)
    .values({ name: "My family", ownerId: userId })
    .returning({ id: families.id });
  return created.id;
}

export async function createFamilyMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/family");
  const parsed = familyMemberSchema.safeParse({
    name: formData.get("name"),
    relationship: formData.get("relationship"),
    dateOfBirth: formData.get("dateOfBirth")?.toString() ?? "",
    sex: formData.get("sex")?.toString() ?? "",
    preferredLanguage: formData.get("preferredLanguage")?.toString() || "English",
    phone: formData.get("phone")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    bloodGroup: formData.get("bloodGroup")?.toString() ?? "",
  });

  if (!parsed.success) {
    return errorState("Check the family member's details.", zodFieldErrors(parsed.error));
  }

  const limit = await checkRateLimit("family-member-create", user.id, 20, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const familyId = await ownedFamilyId(user.id);
  const data = parsed.data;

  try {
    let memberId = "";
    await db.transaction(async (tx) => {
      const [{ memberCount }] = await tx
        .select({ memberCount: sql<number>`count(*)::int` })
        .from(familyMembers)
        .where(eq(familyMembers.familyId, familyId));

      const [member] = await tx
        .insert(familyMembers)
        .values({
          familyId,
          name: data.name,
          relationship: data.relationship,
          dateOfBirth: data.dateOfBirth ?? null,
          sex: data.sex ?? null,
          preferredLanguage: data.preferredLanguage,
          phone: data.phone ?? null,
          email: data.email?.toLowerCase() ?? null,
          bloodGroup: data.bloodGroup || null,
          avatarTone: Number(memberCount ?? 0) % 4,
          createdById: user.id,
        })
        .returning({ id: familyMembers.id });
      memberId = member.id;

      await tx.insert(familyAccess).values({
        memberId,
        userId: user.id,
        role: "OWNER",
        canView: true,
        canManage: true,
        canManageMedications: true,
        canReceiveAlerts: true,
        grantedById: user.id,
      });

      await tx.insert(consents).values({
        userId: user.id,
        memberId,
        kind: "HEALTH_PROCESSING",
        version: brand.legalVersion,
        granted: true,
        metadata: { surface: "family-member-create", attestation: "permission-to-add" },
      });
    });

    await recordAudit({
      actorUserId: user.id,
      memberId,
      action: "family.member_created",
      entityType: "family_member",
      entityId: memberId,
      metadata: {},
    });

    revalidatePath("/app");
    revalidatePath("/app/family");
    return successState(`${data.name} was added to your family.`, {
      link: `/app/family/${memberId}`,
      linkLabel: "Open their profile",
    });
  } catch (error) {
    logger.error("family_member_create_failed", error);
    return errorState("We couldn't add this family member. Please try again.");
  }
}

export async function updateFamilyMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/family");
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    if (error instanceof MemberAccessError) return errorState(permissionMessage(error));
    return errorState("We couldn't verify access to this family member.");
  }

  const parsed = familyMemberSchema.safeParse({
    name: formData.get("name"),
    relationship: formData.get("relationship"),
    dateOfBirth: formData.get("dateOfBirth")?.toString() ?? "",
    sex: formData.get("sex")?.toString() ?? "",
    preferredLanguage: formData.get("preferredLanguage")?.toString() || "English",
    phone: formData.get("phone")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    bloodGroup: formData.get("bloodGroup")?.toString() ?? "",
  });
  if (!parsed.success) {
    return errorState("Check the family member's details.", zodFieldErrors(parsed.error));
  }

  const data = parsed.data;
  const db = await getDb();
  await db
    .update(familyMembers)
    .set({
      name: data.name,
      relationship: data.relationship,
      dateOfBirth: data.dateOfBirth ?? null,
      sex: data.sex ?? null,
      preferredLanguage: data.preferredLanguage,
      phone: data.phone ?? null,
      email: data.email?.toLowerCase() ?? null,
      bloodGroup: data.bloodGroup || null,
      updatedAt: new Date(),
    })
    .where(eq(familyMembers.id, memberId));

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "family.member_updated",
    entityType: "family_member",
    entityId: memberId,
    metadata: {},
  });

  revalidatePath("/app/family");
  revalidatePath(`/app/family/${memberId}`);
  return successState("Family member details updated.");
}

export async function archiveFamilyMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/family");
  const memberId = String(formData.get("memberId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "ARCHIVE") {
    return errorState('Type "ARCHIVE" to confirm. This keeps the records but removes the profile from active care.');
  }

  try {
    const { member, access } = await requireMemberAccess(user.id, memberId, "manage");
    if (member.isSelf) return errorState("You cannot archive your own profile.");
    if (access.role !== "OWNER" && member.createdById !== user.id) {
      return errorState("Only the profile owner can archive this family member.");
    }

    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(familyMembers)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(familyMembers.id, memberId));
      await tx
        .update(familyAccess)
        .set({ revokedAt: new Date() })
        .where(and(eq(familyAccess.memberId, memberId), isNull(familyAccess.revokedAt)));
    });

    await recordAudit({
      actorUserId: user.id,
      memberId,
      action: "family.member_archived",
      entityType: "family_member",
      entityId: memberId,
      metadata: {},
    });

    revalidatePath("/app/family");
    return successState("This profile has been archived. Its records are retained in the database but no longer shown in care views.", {
      link: "/app/family",
      linkLabel: "Back to family",
    });
  } catch (error) {
    return errorState(permissionMessage(error));
  }
}

export async function inviteCaregiverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/family");
  const parsed = caregiverInviteSchema.safeParse({
    memberId: formData.get("memberId"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return errorState("Check the invitation details.", zodFieldErrors(parsed.error));
  }

  const permissions = {
    view: true,
    manage: formData.get("manage") === "on",
    medications: formData.get("medications") === "on",
    alerts: formData.get("alerts") === "on",
  };

  if (parsed.data.email === user.email.toLowerCase()) {
    return errorState("You already have access to this family workspace.");
  }

  let member;
  try {
    ({ member } = await requireMemberAccess(user.id, parsed.data.memberId, "manage"));
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const limit = await checkRateLimit("caregiver-invite", user.id, 10, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (existingUser[0]) {
    const [access] = await db
      .select({ id: familyAccess.id, revokedAt: familyAccess.revokedAt })
      .from(familyAccess)
      .where(
        and(
          eq(familyAccess.memberId, member.id),
          eq(familyAccess.userId, existingUser[0].id),
        ),
      )
      .limit(1);
    if (access && !access.revokedAt) {
      return errorState("This person already has access to this family member.");
    }
  }

  await db
    .update(caregiverInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(caregiverInvites.memberId, member.id),
        eq(caregiverInvites.email, parsed.data.email),
        isNull(caregiverInvites.acceptedAt),
        isNull(caregiverInvites.revokedAt),
      ),
    );

  const rawToken = generateToken(32);
  const [invite] = await db
    .insert(caregiverInvites)
    .values({
      memberId: member.id,
      email: parsed.data.email,
      permissions,
      tokenHash: hashToken(rawToken),
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
    })
    .returning({ id: caregiverInvites.id });

  const path = `/caregiver-invite/${rawToken}`;
  const url = new URL(path, brand.url).toString();
  const content = caregiverInviteEmail(user.name, member.name, url);
  const delivery = await sendEmail({ to: parsed.data.email, ...content });

  if (delivery.status !== "sent") {
    await recordIntegrationEvent({
      type: "EMAIL",
      status: delivery.status === "unavailable" ? "UNAVAILABLE" : "FAILED",
      summary: "Caregiver invitation email was not delivered.",
      detail: delivery.error,
    });

    if (
      serverConfig.devExposeAuthLinks &&
      !serverConfig.isProduction &&
      !emailConfigured()
    ) {
      return successState(
        "The invitation was created, but email delivery is not configured locally. Use this development-only link to review the invitation.",
        { link: path, linkLabel: "Open caregiver invitation" },
      );
    }

    await db
      .update(caregiverInvites)
      .set({ revokedAt: new Date() })
      .where(eq(caregiverInvites.id, invite.id));
    return errorState(
      `The invitation could not be emailed, so it was revoked. ${delivery.error}`,
    );
  }

  await recordAudit({
    actorUserId: user.id,
    memberId: member.id,
    action: "family.caregiver_invited",
    entityType: "caregiver_invite",
    entityId: invite.id,
    metadata: { permissions },
  });

  revalidatePath(`/app/family/${member.id}`);
  return successState("Invitation sent. The person must sign in with the invited email address to accept.");
}

export async function acceptCaregiverInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawToken = String(formData.get("token") ?? "").trim();
  const user = await requireUser(`/caregiver-invite/${rawToken}`);
  if (!rawToken) return errorState("This invitation link is incomplete.");

  const db = await getDb();
  const [invite] = await db
    .select({
      id: caregiverInvites.id,
      memberId: caregiverInvites.memberId,
      email: caregiverInvites.email,
      permissions: caregiverInvites.permissions,
      invitedById: caregiverInvites.invitedById,
      expiresAt: caregiverInvites.expiresAt,
      acceptedAt: caregiverInvites.acceptedAt,
      revokedAt: caregiverInvites.revokedAt,
      memberName: familyMembers.name,
    })
    .from(caregiverInvites)
    .innerJoin(familyMembers, eq(caregiverInvites.memberId, familyMembers.id))
    .where(eq(caregiverInvites.tokenHash, hashToken(rawToken)))
    .limit(1);

  if (!invite) return errorState("This invitation is invalid or has been replaced.");
  if (invite.revokedAt) return errorState("This invitation was revoked by the person who sent it.");
  if (invite.acceptedAt) return errorState("This invitation has already been accepted.");
  if (invite.expiresAt < new Date()) return errorState("This invitation has expired. Ask for a new one.");
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return errorState(
      `This invitation was sent to ${invite.email}. Sign in with that email address to accept it.`,
    );
  }

  const [existing] = await db
    .select({ id: familyAccess.id, revokedAt: familyAccess.revokedAt })
    .from(familyAccess)
    .where(
      and(
        eq(familyAccess.memberId, invite.memberId),
        eq(familyAccess.userId, user.id),
      ),
    )
    .limit(1);

  if (existing && !existing.revokedAt) {
    return errorState("You already have access to this family member.");
  }

  await db.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(familyAccess)
        .set({
          role: "CAREGIVER",
          canView: invite.permissions.view,
          canManage: invite.permissions.manage,
          canManageMedications: invite.permissions.medications,
          canReceiveAlerts: invite.permissions.alerts,
          grantedById: invite.invitedById,
          revokedAt: null,
        })
        .where(eq(familyAccess.id, existing.id));
    } else {
      await tx.insert(familyAccess).values({
        memberId: invite.memberId,
        userId: user.id,
        role: "CAREGIVER",
        canView: invite.permissions.view,
        canManage: invite.permissions.manage,
        canManageMedications: invite.permissions.medications,
        canReceiveAlerts: invite.permissions.alerts,
        grantedById: invite.invitedById,
      });
    }

    await tx
      .update(caregiverInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(caregiverInvites.id, invite.id));

    await tx
      .insert(notifications)
      .values({
        userId: invite.invitedById,
        memberId: invite.memberId,
        category: "FAMILY",
        title: "Caregiver access accepted",
        body: `${user.name} accepted your invitation to help care for ${invite.memberName}.`,
        href: `/app/family/${invite.memberId}`,
        dedupeKey: `caregiver-accepted:${invite.id}`,
      })
      .onConflictDoNothing();
  });

  await recordAudit({
    actorUserId: user.id,
    memberId: invite.memberId,
    action: "family.caregiver_invite_accepted",
    entityType: "caregiver_invite",
    entityId: invite.id,
    metadata: { permissions: invite.permissions },
  });

  revalidatePath("/app");
  revalidatePath("/app/family");
  return successState(`You now have caregiver access to ${invite.memberName}.`, {
    link: `/app/family/${invite.memberId}`,
    linkLabel: "Open their profile",
  });
}

export async function revokeFamilyAccessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/family");
  const memberId = String(formData.get("memberId") ?? "");
  const accessId = String(formData.get("accessId") ?? "");

  try {
    const { member, access } = await requireMemberAccess(user.id, memberId, "manage");
    if (access.role !== "OWNER" && member.createdById !== user.id) {
      return errorState("Only the profile owner can change caregiver access.");
    }

    const db = await getDb();
    const [target] = await db
      .select({ id: familyAccess.id, userId: familyAccess.userId, role: familyAccess.role })
      .from(familyAccess)
      .where(and(eq(familyAccess.id, accessId), eq(familyAccess.memberId, memberId)))
      .limit(1);
    if (!target) return errorState("That access record could not be found.");
    if (target.userId === user.id || target.role === "OWNER") {
      return errorState("The profile owner's access cannot be removed.");
    }

    await db
      .update(familyAccess)
      .set({ revokedAt: new Date() })
      .where(eq(familyAccess.id, accessId));
    await db
      .insert(notifications)
      .values({
        userId: target.userId,
        memberId,
        category: "FAMILY",
        title: "Caregiver access changed",
        body: `Your access to ${member.name}'s care workspace was removed.`,
        href: "/app/family",
        dedupeKey: `access-revoked:${accessId}:${Date.now()}`,
      })
      .onConflictDoNothing();

    await recordAudit({
      actorUserId: user.id,
      memberId,
      action: "family.access_revoked",
      entityType: "family_access",
      entityId: accessId,
      metadata: {},
    });

    revalidatePath(`/app/family/${memberId}`);
    return successState("Caregiver access removed.");
  } catch (error) {
    return errorState(permissionMessage(error));
  }
}

export async function cancelCaregiverInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/family");
  const memberId = String(formData.get("memberId") ?? "");
  const inviteId = String(formData.get("inviteId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  await db
    .update(caregiverInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(caregiverInvites.id, inviteId),
        eq(caregiverInvites.memberId, memberId),
        isNull(caregiverInvites.acceptedAt),
      ),
    );

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "family.caregiver_invite_revoked",
    entityType: "caregiver_invite",
    entityId: inviteId,
    metadata: {},
  });

  revalidatePath(`/app/family/${memberId}`);
  return successState("Invitation cancelled.");
}
