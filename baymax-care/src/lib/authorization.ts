import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { familyAccess, familyMembers } from "@/db/schema";

export type MemberRow = typeof familyMembers.$inferSelect;
export type AccessRow = typeof familyAccess.$inferSelect;

export type MemberAccess = {
  member: MemberRow;
  access: AccessRow;
};

export async function getAccessibleMembers(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ member: familyMembers, access: familyAccess })
    .from(familyAccess)
    .innerJoin(familyMembers, eq(familyAccess.memberId, familyMembers.id))
    .where(
      and(
        eq(familyAccess.userId, userId),
        isNull(familyAccess.revokedAt),
        isNull(familyMembers.archivedAt),
      ),
    )
    .orderBy(asc(familyMembers.isSelf), asc(familyMembers.name));

  return rows;
}

export async function getMemberAccess(
  userId: string,
  memberId: string,
): Promise<MemberAccess | null> {
  if (!memberId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ member: familyMembers, access: familyAccess })
    .from(familyAccess)
    .innerJoin(familyMembers, eq(familyAccess.memberId, familyMembers.id))
    .where(
      and(
        eq(familyAccess.memberId, memberId),
        eq(familyAccess.userId, userId),
        isNull(familyAccess.revokedAt),
        isNull(familyMembers.archivedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function requireMemberAccess(
  userId: string,
  memberId: string,
  permission: "view" | "manage" | "medications" = "view",
) {
  const result = await getMemberAccess(userId, memberId);
  if (!result) throw new MemberAccessError("not_found");
  if (!result.access.canView && permission === "view") {
    throw new MemberAccessError("forbidden");
  }
  if (permission === "manage" && !result.access.canManage) {
    throw new MemberAccessError("forbidden");
  }
  if (permission === "medications" && !(result.access.canManage || result.access.canManageMedications)) {
    throw new MemberAccessError("forbidden");
  }
  return result;
}

export class MemberAccessError extends Error {
  code: "forbidden" | "not_found";
  constructor(code: "forbidden" | "not_found") {
    super(code === "forbidden" ? "You do not have permission for this action." : "Member not found.");
    this.code = code;
  }
}

export function permissionMessage(error: unknown) {
  if (error instanceof MemberAccessError) {
    return error.code === "forbidden"
      ? "You do not have permission to change this family member's information."
      : "That family member could not be found in your account.";
  }
  return "You do not have access to this family member's information.";
}
