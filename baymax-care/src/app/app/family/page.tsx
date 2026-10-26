import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  Archive,
  ArrowRight,
  ClipboardList,
  FileText,
  HeartPulse,
  Lock,
  Pill,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DisclosurePanel,
  InlineEmpty,
  Panel,
  PanelBody,
  Stack,
  TwoColumn,
} from "@/components/ui/app-ui";
import {
  EmptyState,
  InlineNotice,
  MemberAvatar,
  PageHeader,
  SectionHeading,
} from "@/components/ui/primitives";
import { ActionForm } from "@/components/ui/action-form";
import { getDb } from "@/db";
import {
  caregiverInvites,
  familyMembers,
  medicalHistory,
  medicalReports,
  medications,
} from "@/db/schema";
import { createFamilyMemberAction } from "@/app/actions/family";
import { requireUser } from "@/lib/auth";
import { getAccessibleMembers } from "@/lib/authorization";
import { ageFromDob, formatDate } from "@/lib/utils";
import { FamilyMemberFields } from "@/components/family-member-fields";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Family profiles",
};

export default async function FamilyPage() {
  const user = await requireUser("/app/family");
  const members = await getAccessibleMembers(user.id);
  const memberIds = members.map((row) => row.member.id);
  const scopeIds = memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const db = await getDb();

  const [historyCounts, reportCounts, activeMedCounts, pendingInvites] =
    await Promise.all([
      db
        .select({ memberId: medicalHistory.memberId, value: count() })
        .from(medicalHistory)
        .where(and(inArray(medicalHistory.memberId, scopeIds), isNull(medicalHistory.deletedAt)))
        .groupBy(medicalHistory.memberId),
      db
        .select({ memberId: medicalReports.memberId, value: count() })
        .from(medicalReports)
        .where(inArray(medicalReports.memberId, scopeIds))
        .groupBy(medicalReports.memberId),
      db
        .select({ memberId: medications.memberId, value: count() })
        .from(medications)
        .where(and(inArray(medications.memberId, scopeIds), eq(medications.active, true)))
        .groupBy(medications.memberId),
      db
        .select({
          memberId: caregiverInvites.memberId,
          email: caregiverInvites.email,
          expiresAt: caregiverInvites.expiresAt,
        })
        .from(caregiverInvites)
        .where(
          and(
            eq(caregiverInvites.invitedById, user.id),
            isNull(caregiverInvites.acceptedAt),
            isNull(caregiverInvites.revokedAt),
          ),
        )
        .orderBy(desc(caregiverInvites.createdAt)),
    ]);

  // Archived profiles are retained for accountability. Owners can still see that
  // a profile exists and when it was archived, but it is excluded from care views.
  const archived = await db
    .select({
      id: familyMembers.id,
      name: familyMembers.name,
      relationship: familyMembers.relationship,
      archivedAt: familyMembers.archivedAt,
    })
    .from(familyMembers)
    .where(and(eq(familyMembers.createdById, user.id), isNotNull(familyMembers.archivedAt)))
    .limit(10);

  const toMap = (rows: Array<{ memberId: string; value: unknown }>) =>
    new Map(rows.map((row) => [row.memberId, Number(row.value)]));

  const historyMap = toMap(historyCounts);
  const reportMap = toMap(reportCounts);
  const medMap = toMap(activeMedCounts);
  const inviteByMember = new Map<string, typeof pendingInvites>();
  for (const invite of pendingInvites) {
    const list = inviteByMember.get(invite.memberId) ?? [];
    list.push(invite);
    inviteByMember.set(invite.memberId, list);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Family"
        title="The people in your care"
        description="Profiles are for people whose health information you are responsible for, such as yourself, children, or parents. Each profile is isolated. A caregiver gets their own account and an explicit invitation."
        action={
          <Link className="btn btn-secondary" href="/app/settings/privacy">
            <ShieldCheck size={15} aria-hidden="true" />
            Privacy controls
          </Link>
        }
      />

      <TwoColumn>
        <Stack>
          <div className="grid gap-4 md:grid-cols-2">
            {members.map(({ member, access }) => {
              const age = ageFromDob(member.dateOfBirth);
              const invites = inviteByMember.get(member.id) ?? [];
              return (
                <Panel key={member.id} className="flex flex-col">
                  <PanelBody className="flex-1">
                    <div className="flex items-start gap-3">
                      <MemberAvatar name={member.name} tone={member.avatarTone} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/app/family/${member.id}`}
                            className="truncate text-[0.98rem] font-semibold text-ink hover:text-aqua-700"
                          >
                            {member.name}
                          </Link>
                          {member.isSelf && <span className="badge badge-aqua">You</span>}
                          {access.role === "CAREGIVER" && (
                            <span className="badge badge-neutral">Caregiver access</span>
                          )}
                        </div>
                        <p className="mt-1 text-[0.75rem] leading-5 text-muted">
                          {member.relationship}
                          {age !== null ? ` · ${age} years` : ""}
                          {member.bloodGroup ? ` · ${member.bloodGroup}` : ""}
                        </p>
                        {member.dateOfBirth && (
                          <p className="text-[0.68rem] text-[#8a999e]">
                            Born {formatDate(member.dateOfBirth)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                      <div>
                        <p className="text-sm font-semibold text-ink">{historyMap.get(member.id) ?? 0}</p>
                        <p className="text-[0.6rem] uppercase tracking-[0.05em] text-muted">History</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{medMap.get(member.id) ?? 0}</p>
                        <p className="text-[0.6rem] uppercase tracking-[0.05em] text-muted">Medicines</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{reportMap.get(member.id) ?? 0}</p>
                        <p className="text-[0.6rem] uppercase tracking-[0.05em] text-muted">Reports</p>
                      </div>
                    </div>

                    {invites.length > 0 && (
                      <p className="mt-3 rounded-md border border-[#ead7b5] bg-[#fffbf3] px-2.5 py-1.5 text-[0.68rem] leading-4 text-[#725018]">
                        {invites.length} caregiver invitation{invites.length === 1 ? "" : "s"} awaiting
                        acceptance.
                      </p>
                    )}
                  </PanelBody>
                  <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
                    <Link
                      href={`/app/family/${member.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-aqua-700 hover:underline"
                    >
                      Open profile <ArrowRight size={12} aria-hidden="true" />
                    </Link>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/app/medical-history?member=${member.id}`}
                        className="btn btn-quiet btn-sm btn-icon"
                        aria-label={`Medical history for ${member.name}`}
                        title="Medical history"
                      >
                        <ClipboardList size={14} aria-hidden="true" />
                      </Link>
                      <Link
                        href={`/app/medications?member=${member.id}`}
                        className="btn btn-quiet btn-sm btn-icon"
                        aria-label={`Medications for ${member.name}`}
                        title="Medications"
                      >
                        <Pill size={14} aria-hidden="true" />
                      </Link>
                      <Link
                        href={`/app/reports?member=${member.id}`}
                        className="btn btn-quiet btn-sm btn-icon"
                        aria-label={`Reports for ${member.name}`}
                        title="Reports"
                      >
                        <FileText size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>

          {members.length === 0 && (
            <Panel>
              <EmptyState
                icon={Users}
                title="No active family profiles"
                description="Your access may have been revoked, or profiles were archived. If you are a caregiver, ask the profile owner to invite you again."
              />
            </Panel>
          )}

          <DisclosurePanel
            summary="Add a family member"
            description="Create a profile for someone whose care you manage. This does not create an account for them."
            defaultOpen={members.length === 0}
          >
            <ActionForm
              action={createFamilyMemberAction}
              submitLabel="Add family member"
              secondarySubmit={
                <span className="text-[0.7rem] text-muted">
                  You will be recorded as the profile owner.
                </span>
              }
            >
              <InlineNotice tone="info">
                Only add another person&apos;s information when you have their permission or are
                responsible for their care. You can archive the profile at any time.
              </InlineNotice>
              <FamilyMemberFields idPrefix="add-" />
            </ActionForm>
          </DisclosurePanel>

          {archived.length > 0 && (
            <DisclosurePanel
              summary={`Archived profiles (${archived.length})`}
              description="Archived profiles are hidden from care views and caregiver access is revoked. Records are retained."
            >
              <div className="space-y-2">
                {archived.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-line bg-[#fbfdfd] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8rem] font-medium text-ink">{member.name}</p>
                      <p className="text-[0.68rem] text-muted">
                        {member.relationship} · archived {formatDate(member.archivedAt)}
                      </p>
                    </div>
                    <span className="badge badge-neutral">
                      <Archive size={10} aria-hidden="true" /> Archived
                    </span>
                  </div>
                ))}
              </div>
            </DisclosurePanel>
          )}
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="How family access works" />
              <ul className="space-y-3 text-[0.78rem] leading-5 text-[#52666e]">
                {[
                  {
                    icon: UserPlus,
                    title: "You own your profiles",
                    text: "Adding someone creates a profile under your account, with you as owner.",
                  },
                  {
                    icon: Users,
                    title: "Caregivers need their own account",
                    text: "Invite them by email from a profile. They must sign in with that same email to accept.",
                  },
                  {
                    icon: Lock,
                    title: "Permissions are scoped",
                    text: "View, manage, medication, and alert permissions are separate and can be revoked.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Every request is checked",
                    text: "Pages and actions re-check both account status and profile access on the server.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title} className="flex items-start gap-2.5">
                      <span className="icon-tile icon-tile-sm mt-0.5">
                        <Icon size={13} aria-hidden="true" />
                      </span>
                      <span>
                        <strong className="font-semibold text-ink">{item.title}.</strong> {item.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </PanelBody>
          </Panel>

          <Panel className="border-aqua-200 bg-[#fbfefd]">
            <PanelBody>
              <div className="flex items-center gap-2 text-[0.72rem] font-semibold text-aqua-800">
                <HeartPulse size={14} aria-hidden="true" />
                A note about children and dependants
              </div>
              <p className="mt-2 text-[0.76rem] leading-5 text-[#52666e]">
                A parent or guardian can maintain a child&apos;s record. As the child grows, they
                may need their own account and control of their information. Plan that transition
                with your family; this app does not automate it.
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Caregiver invitations" />
              <p className="text-[0.76rem] leading-5 text-muted">
                Pending invitations are shown on the relevant profile. You can cancel an invitation
                there before it is accepted.
              </p>
              {pendingInvites.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {pendingInvites.slice(0, 5).map((invite) => (
                    <div key={`${invite.memberId}-${invite.email}`} className="rounded-md border border-line px-2.5 py-2">
                      <p className="truncate text-[0.74rem] font-medium text-ink">{invite.email}</p>
                      <p className="text-[0.66rem] text-muted">
                        For {members.find((row) => row.member.id === invite.memberId)?.member.name ?? "a family member"} ·
                        expires {formatDate(invite.expiresAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-line px-3 py-4 text-center text-[0.72rem] text-muted">
                  No pending invitations.
                </p>
              )}
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
