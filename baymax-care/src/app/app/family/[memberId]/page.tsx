import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
} from "drizzle-orm";
import {
  ClipboardList,
  FileText,
  HeartPulse,
  Mail,
  Phone,
  Pill,
  Siren,
} from "lucide-react";
import {
  Breadcrumbs,
  DisclosurePanel,
  InlineEmpty,
  KeyValue,
  Panel,
  PanelBody,
  Stack,
  TwoColumn,
} from "@/components/ui/app-ui";
import {
  InlineNotice,
  MemberAvatar,
  PageHeader,
  SectionHeading,
  Stat,
  StatusBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { InlineAction } from "@/components/app-controls";
import { FamilyMemberFields } from "@/components/family-member-fields";
import { getDb } from "@/db";
import {
  appointments,
  caregiverInvites,
  emergencyContacts,
  familyAccess,
  familyMembers,
  medicalHistory,
  medicalReports,
  medications,
  medicationDoses,
  prescriptions,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getMemberAccess } from "@/lib/authorization";
import { ensureDoseWindowForMember } from "@/lib/schedule";
import { emailConfigured } from "@/lib/config";
import { ageFromDob, formatDate, formatDateTime, formatTime, todayInZone } from "@/lib/utils";
import {
  archiveFamilyMemberAction,
  cancelCaregiverInviteAction,
  inviteCaregiverAction,
  revokeFamilyAccessAction,
  updateFamilyMemberAction,
} from "@/app/actions/family";
import { markDoseAction } from "@/app/actions/medications";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ memberId: string }>;
}): Promise<Metadata> {
  const user = await requireUser("/app/family");
  const { memberId } = await params;
  const access = await getMemberAccess(user.id, memberId);
  return { title: access ? access.member.name : "Family member" };
}

export default async function FamilyMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser("/app/family");
  const { memberId } = await params;
  const query = await searchParams;
  const accessResult = await getMemberAccess(user.id, memberId);
  if (!accessResult) notFound();

  const { member, access } = accessResult;
  const canManage = access.canManage || access.role === "OWNER";
  const canMedications = access.canManage || access.canManageMedications;
  const today = todayInZone(user.timezone);
  const db = await getDb();

  await ensureDoseWindowForMember(member.id, user.timezone, today, today).catch(() => 0);

  const [
    historyRows,
    historyCount,
    reportRows,
    reportCount,
    medicationRows,
    todayDoses,
    prescriptionRows,
    prescriptionCount,
    contacts,
    accessRows,
    invites,
    upcoming,
  ] = await Promise.all([
    db
      .select()
      .from(medicalHistory)
      .where(and(eq(medicalHistory.memberId, member.id), isNull(medicalHistory.deletedAt)))
      .orderBy(desc(medicalHistory.recordedAt), desc(medicalHistory.createdAt))
      .limit(5),
    db
      .select({ value: count() })
      .from(medicalHistory)
      .where(and(eq(medicalHistory.memberId, member.id), isNull(medicalHistory.deletedAt))),
    db
      .select()
      .from(medicalReports)
      .where(eq(medicalReports.memberId, member.id))
      .orderBy(desc(medicalReports.reportDate), desc(medicalReports.createdAt))
      .limit(4),
    db
      .select({ value: count() })
      .from(medicalReports)
      .where(eq(medicalReports.memberId, member.id)),
    db
      .select()
      .from(medications)
      .where(and(eq(medications.memberId, member.id), eq(medications.active, true)))
      .orderBy(asc(medications.name))
      .limit(8),
    db
      .select({
        id: medicationDoses.id,
        status: medicationDoses.status,
        scheduledTime: medicationDoses.scheduledTime,
        medicationName: medications.name,
        strength: medications.strength,
        dose: medications.prescribedDose,
      })
      .from(medicationDoses)
      .innerJoin(medications, eq(medicationDoses.medicationId, medications.id))
      .where(
        and(
          eq(medicationDoses.memberId, member.id),
          eq(medicationDoses.scheduledDate, today),
        ),
      )
      .orderBy(asc(medicationDoses.scheduledAt)),
    db
      .select({
        id: prescriptions.id,
        prescriberName: prescriptions.prescriberName,
        clinicName: prescriptions.clinicName,
        issuedAt: prescriptions.issuedAt,
        validUntil: prescriptions.validUntil,
        status: prescriptions.status,
        fileId: prescriptions.fileId,
      })
      .from(prescriptions)
      .where(eq(prescriptions.memberId, member.id))
      .orderBy(desc(prescriptions.issuedAt))
      .limit(5),
    db
      .select({ value: count() })
      .from(prescriptions)
      .where(eq(prescriptions.memberId, member.id)),
    db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.memberId, member.id))
      .orderBy(desc(emergencyContacts.isPrimary), asc(emergencyContacts.name))
      .limit(5),
    db
      .select({
        accessId: familyAccess.id,
        userId: familyAccess.userId,
        role: familyAccess.role,
        canView: familyAccess.canView,
        canManage: familyAccess.canManage,
        canManageMedications: familyAccess.canManageMedications,
        canReceiveAlerts: familyAccess.canReceiveAlerts,
        name: users.name,
        email: users.email,
        createdAt: familyAccess.createdAt,
      })
      .from(familyAccess)
      .innerJoin(users, eq(familyAccess.userId, users.id))
      .where(and(eq(familyAccess.memberId, member.id), isNull(familyAccess.revokedAt)))
      .orderBy(asc(familyAccess.role), asc(users.name)),
    db
      .select()
      .from(caregiverInvites)
      .where(
        and(
          eq(caregiverInvites.memberId, member.id),
          isNull(caregiverInvites.acceptedAt),
          isNull(caregiverInvites.revokedAt),
        ),
      )
      .orderBy(desc(caregiverInvites.createdAt)),
    db
      .select({
        id: appointments.id,
        status: appointments.status,
        scheduledAt: appointments.scheduledAt,
        kind: appointments.kind,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.memberId, member.id),
          eq(appointments.userId, user.id),
          gte(appointments.scheduledAt, new Date()),
          inArray(appointments.status, ["REQUESTED", "CONFIRMED"]),
        ),
      )
      .orderBy(asc(appointments.scheduledAt))
      .limit(1),
  ]);

  const age = ageFromDob(member.dateOfBirth);
  const isOwner = access.role === "OWNER";

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Family", href: "/app/family" },
              { label: member.name },
            ]}
          />
        }
        title={member.name}
        description={`${member.relationship}${age !== null ? ` · ${age} years` : ""}${member.bloodGroup ? ` · ${member.bloodGroup}` : ""}. You have ${isOwner ? "owner" : "caregiver"} access to this profile.`}
        action={
          <>
            <Link className="btn btn-secondary" href={`/app/medical-history?member=${member.id}`}>
              <ClipboardList size={15} aria-hidden="true" />
              Health history
            </Link>
            {canMedications && (
              <Link className="btn btn-primary" href={`/app/medications?member=${member.id}`}>
                <Pill size={15} aria-hidden="true" />
                Medications
              </Link>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="History entries" value={Number(historyCount[0]?.value ?? 0)} icon={ClipboardList} />
        <Stat
          label="Active medicines"
          value={medicationRows.length}
          detail={`${todayDoses.filter((dose) => dose.status === "TAKEN").length}/${todayDoses.length} doses taken today`}
          icon={Pill}
          accent="info"
        />
        <Stat label="Reports" value={Number(reportCount[0]?.value ?? 0)} icon={FileText} />
        <Stat
          label="Prescriptions"
          value={Number(prescriptionCount[0]?.value ?? 0)}
          icon={HeartPulse}
          accent="warn"
        />
      </div>

      <TwoColumn>
        <Stack>
          <Panel>
            <PanelBody>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <MemberAvatar name={member.name} tone={member.avatarTone} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-lg font-semibold tracking-[-0.03em]">{member.name}</h2>
                    {member.isSelf && <span className="badge badge-aqua">You</span>}
                    <span className="badge badge-neutral">{member.relationship}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                    <KeyValue label="Date of birth">{formatDate(member.dateOfBirth)}</KeyValue>
                    <KeyValue label="Age">{age !== null ? `${age} years` : "Not recorded"}</KeyValue>
                    <KeyValue label="Blood group">{member.bloodGroup ?? "Not recorded"}</KeyValue>
                    <KeyValue label="Language">{member.preferredLanguage}</KeyValue>
                    <KeyValue label="Phone">{member.phone ?? "Not recorded"}</KeyValue>
                    <KeyValue label="Email">{member.email ?? "Not recorded"}</KeyValue>
                  </dl>
                  {member.email ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className="btn btn-quiet btn-sm" href={`tel:${member.phone ?? ""}`}>
                        <Phone size={12} aria-hidden="true" /> Call
                      </a>
                      <a className="btn btn-quiet btn-sm" href={`mailto:${member.email}`}>
                        <Mail size={12} aria-hidden="true" /> Email
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </PanelBody>
          </Panel>

          {!canManage && (
            <InlineNotice tone="info" title="View-only access">
              You can see this profile and today&apos;s care information. Editing, inviting
              caregivers, and managing medicines require additional permissions from the owner.
            </InlineNotice>
          )}

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Today's care"
                description={`Scheduled in ${user.timezone.replaceAll("_", " ")}.`}
                action={
                  canMedications ? (
                    <Link className="text-xs font-medium text-aqua-700" href={`/app/medications?member=${member.id}`}>
                      Manage
                    </Link>
                  ) : undefined
                }
              />
              {todayDoses.length === 0 ? (
                <InlineEmpty
                  title="No doses scheduled today"
                  description={
                    canMedications
                      ? "Add a medicine schedule from a recorded prescription."
                      : "The profile owner has not scheduled medicine for today."
                  }
                />
              ) : (
                <div className="space-y-1">
                  {todayDoses.map((dose) => (
                    <div key={dose.id} className="care-row items-center">
                      <span className="icon-tile icon-tile-sm">
                        <Pill size={13} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.82rem] font-medium text-ink">
                          {dose.medicationName} <span className="font-normal text-muted">{dose.strength}</span>
                        </p>
                        <p className="text-[0.68rem] text-muted">
                          {dose.dose} · {formatTime(dose.scheduledTime, user.timezone)}
                        </p>
                      </div>
                      {dose.status === "PENDING" && canMedications ? (
                        <div className="flex gap-1">
                          <InlineAction
                            action={markDoseAction}
                            fields={{ doseId: dose.id, status: "TAKEN" }}
                            label="Taken"
                            variant="primary"
                          />
                          <InlineAction
                            action={markDoseAction}
                            fields={{ doseId: dose.id, status: "SKIPPED" }}
                            label="Skip"
                            variant="quiet"
                          />
                        </div>
                      ) : (
                        <StatusBadge status={dose.status} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {medicationRows.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.055em] text-muted">
                    Active schedules
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {medicationRows.map((medication) => (
                      <span key={medication.id} className="chip">
                        {medication.name} {medication.strength}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Recent medical history"
                action={
                  <Link className="text-xs font-medium text-aqua-700" href={`/app/medical-history?member=${member.id}`}>
                    View all
                  </Link>
                }
              />
              {historyRows.length === 0 ? (
                <InlineEmpty
                  title="No history recorded"
                  description="Conditions, allergies, surgeries, immunizations, and clinician notes belong here."
                  action={
                    canManage ? (
                      <Link className="btn btn-secondary btn-sm" href={`/app/medical-history?member=${member.id}`}>
                        Add history
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <div>
                  {historyRows.map((entry) => (
                    <div key={entry.id} className="care-row items-start">
                      <span className="icon-tile icon-tile-sm">
                        <HeartPulse size={13} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[0.82rem] font-medium text-ink">{entry.title}</p>
                          <StatusBadge status={entry.category} label={entry.category.replaceAll("_", " ")} />
                        </div>
                        <p className="mt-0.5 text-[0.68rem] text-muted">
                          {formatDate(entry.recordedAt)}
                          {entry.source ? ` · ${entry.source.toLowerCase()}` : ""}
                        </p>
                        {entry.details && (
                          <p className="mt-1 line-clamp-2 text-[0.74rem] leading-5 text-[#52666e]">
                            {entry.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Reports"
                action={
                  <Link className="text-xs font-medium text-aqua-700" href={`/app/reports?member=${member.id}`}>
                    View all
                  </Link>
                }
              />
              {reportRows.length === 0 ? (
                <InlineEmpty
                  title="No reports stored"
                  description="Upload a report to keep the original file private and optionally ask for a plain-language explanation."
                  action={
                    canManage ? (
                      <Link className="btn btn-secondary btn-sm" href={`/app/reports?member=${member.id}`}>
                        Upload a report
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <div>
                  {reportRows.map((report) => (
                    <Link key={report.id} href={`/app/reports/${report.id}`} className="care-row items-center">
                      <span className="icon-tile icon-tile-sm">
                        <FileText size={13} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.82rem] font-medium text-ink">{report.title}</p>
                        <p className="text-[0.68rem] text-muted">
                          {formatDate(report.reportDate)} · {report.category.replaceAll("_", " ")}
                        </p>
                      </div>
                      <StatusBadge status={report.status} />
                    </Link>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Prescriptions"
                action={
                  <Link className="text-xs font-medium text-aqua-700" href={`/app/prescriptions?member=${member.id}`}>
                    View all
                  </Link>
                }
              />
              {prescriptionRows.length === 0 ? (
                <InlineEmpty
                  title="No prescriptions recorded"
                  description="Record a prescription from a clinician before building a medicine schedule or ordering from a configured pharmacy."
                />
              ) : (
                <div>
                  {prescriptionRows.map((prescription) => (
                    <div key={prescription.id} className="care-row items-center">
                      <span className="icon-tile icon-tile-sm">
                        <ClipboardList size={13} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.82rem] font-medium text-ink">
                          {prescription.prescriberName}
                          {prescription.clinicName ? ` · ${prescription.clinicName}` : ""}
                        </p>
                        <p className="text-[0.68rem] text-muted">
                          Issued {formatDate(prescription.issuedAt)}
                          {prescription.validUntil ? ` · valid until ${formatDate(prescription.validUntil)}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={prescription.status} />
                    </div>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          {canManage && (
            <DisclosurePanel
              summary="Edit profile details"
              description="These details are used across the care workspace. Changes are written to the audit log."
              defaultOpen={query.edit === "1"}
            >
              <ActionForm action={updateFamilyMemberAction} submitLabel="Save changes">
                <input type="hidden" name="memberId" value={member.id} />
                <FamilyMemberFields member={member} idPrefix="edit-" />
              </ActionForm>
            </DisclosurePanel>
          )}

          {canManage && !member.isSelf && (
            <DisclosurePanel
              summary="Archive this profile"
              tone="danger"
              description="Archiving hides the profile from care views and revokes caregiver access. Records are retained."
            >
              <ActionForm action={archiveFamilyMemberAction} submitLabel="Archive profile" submitClassName="btn-danger">
                <input type="hidden" name="memberId" value={member.id} />
                <InlineNotice tone="danger" title="This removes the profile from active care">
                  You cannot undo this from the app. Type ARCHIVE to confirm. Existing records stay
                  in the database but are no longer visible through family care views.
                </InlineNotice>
                <FormField label='Type "ARCHIVE" to confirm' name="confirmation">
                  <input id="field-confirmation" name="confirmation" className="input" autoComplete="off" />
                </FormField>
              </ActionForm>
            </DisclosurePanel>
          )}
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Care information" />
              <dl className="space-y-3">
                <KeyValue label="Emergency contacts">
                  {contacts.length === 0 ? (
                    <span className="text-muted">None recorded. Add contacts in Emergency & SOS.</span>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <div key={contact.id}>
                          <span className="font-medium">{contact.name}</span>{" "}
                          <span className="text-muted">· {contact.relationship}</span>
                          <span className="block text-[0.76rem]">{contact.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </KeyValue>
                <KeyValue label="Upcoming consultation">
                  {upcoming.length === 0 || !upcoming[0] ? (
                    <span className="text-muted">None</span>
                  ) : (
                    <Link className="link" href={`/app/consultations/${upcoming[0].id}`}>
                      {formatDateTime(upcoming[0].scheduledAt, user.timezone)}
                    </Link>
                  )}
                </KeyValue>
              </dl>
              <div className="mt-3 grid gap-2">
                <Link className="btn btn-secondary btn-sm justify-start" href={`/app/alerts?member=${member.id}`}>
                  <Siren size={13} aria-hidden="true" /> Emergency & SOS
                </Link>
                <Link className="btn btn-secondary btn-sm justify-start" href={`/app/nutrition?member=${member.id}`}>
                  <HeartPulse size={13} aria-hidden="true" /> Nutrition
                </Link>
                <Link className="btn btn-secondary btn-sm justify-start" href={`/app/womens-health?member=${member.id}`}>
                  <HeartPulse size={13} aria-hidden="true" /> Women&apos;s health
                </Link>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Access to this profile" description="Owner and caregiver access, checked on each request." />
              <div className="space-y-2.5">
                {accessRows.map((row) => (
                  <div key={row.accessId} className="flex items-start justify-between gap-2 rounded-md border border-line p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[0.78rem] font-medium text-ink">
                        {row.name} {row.userId === user.id ? "(you)" : ""}
                      </p>
                      <p className="truncate text-[0.66rem] text-muted">{row.email}</p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        <span className="badge badge-aqua">{row.role === "OWNER" ? "Owner" : "Caregiver"}</span>
                        {row.canManage && <span className="badge badge-neutral">Manage</span>}
                        {row.canManageMedications && <span className="badge badge-neutral">Medicines</span>}
                        {row.canReceiveAlerts && <span className="badge badge-neutral">Alerts</span>}
                      </p>
                    </div>
                    {isOwner && row.userId !== user.id && row.role !== "OWNER" && canManage ? (
                      <InlineAction
                        action={revokeFamilyAccessAction}
                        fields={{ memberId: member.id, accessId: row.accessId }}
                        label="Remove"
                        variant="danger-outline"
                        confirmMessage={`Remove ${row.name}'s access to ${member.name}?`}
                      />
                    ) : null}
                  </div>
                ))}
              </div>

              {canManage && isOwner && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-[0.72rem] font-semibold text-ink">Invite a caregiver</p>
                  <p className="mt-0.5 text-[0.68rem] leading-4 text-muted">
                    They need their own account with the same email address. Permissions can be
                    revoked later.
                  </p>
                  {!emailConfigured() && (
                    <InlineNotice tone="warning" className="mt-2">
                      Email delivery is not configured. The invitation will only be delivered if
                      SMTP is set up; in local development a one-time review link may be shown.
                    </InlineNotice>
                  )}
                  <ActionForm action={inviteCaregiverAction} submitLabel="Send invitation" className="mt-3">
                    <input type="hidden" name="memberId" value={member.id} />
                    <FormField label="Caregiver email" name="email">
                      <input
                        id="field-caregiver-email"
                        name="email"
                        type="email"
                        className="input"
                        required
                        maxLength={254}
                        placeholder="name@example.com"
                      />
                    </FormField>
                    <div className="space-y-2">
                      <label className="check-row">
                        <input type="checkbox" name="manage" />
                        <span className="check-copy">Can edit profile and health records</span>
                      </label>
                      <label className="check-row">
                        <input type="checkbox" name="medications" />
                        <span className="check-copy">Can manage medicine schedules</span>
                      </label>
                      <label className="check-row">
                        <input type="checkbox" name="alerts" />
                        <span className="check-copy">Can receive in-app SOS alerts</span>
                      </label>
                    </div>
                  </ActionForm>
                </div>
              )}

              {invites.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-[0.72rem] font-semibold text-ink">Pending invitations</p>
                  <div className="mt-2 space-y-2">
                    {invites.map((invite) => (
                      <div key={invite.id} className="rounded-md border border-[#ead7b5] bg-[#fffbf3] p-2.5">
                        <p className="truncate text-[0.74rem] font-medium text-ink">{invite.email}</p>
                        <p className="text-[0.64rem] text-muted">
                          Expires {formatDate(invite.expiresAt)} · permissions: view
                          {invite.permissions.manage ? ", manage" : ""}
                          {invite.permissions.medications ? ", medicines" : ""}
                          {invite.permissions.alerts ? ", alerts" : ""}
                        </p>
                        {canManage && (
                          <div className="mt-1.5">
                            <InlineAction
                              action={cancelCaregiverInviteAction}
                              fields={{ memberId: member.id, inviteId: invite.id }}
                              label="Cancel invitation"
                              variant="quiet"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <div className="flex items-center gap-2 text-[0.72rem] font-semibold text-[#a82f3d]">
                <Siren size={14} aria-hidden="true" /> Emergency
              </div>
              <p className="mt-2 text-[0.76rem] leading-5 text-[#6b3b42]">
                Baymax Care does not dispatch emergency services. If there is immediate danger,
                call your local emergency number. The SOS page can notify contacts you have added,
                when SMS or email is configured.
              </p>
              <Link className="btn btn-danger-outline btn-sm mt-3" href={`/app/alerts?member=${member.id}`}>
                Open emergency & SOS
              </Link>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Privacy note" />
              <p className="text-[0.76rem] leading-5 text-muted">
                This profile is visible to {accessRows.length} account{accessRows.length === 1 ? "" : "s"}.
                Records and uploaded files are not shared publicly. Removing caregiver access takes
                effect on the next request.
              </p>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
