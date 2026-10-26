import type { Metadata } from "next";
import Link from "next/link";
import { DateTime } from "luxon";
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
  ArrowRight,
  CalendarClock,
  Check,
  ClipboardList,
  FileText,
  HeartPulse,
  Pill,
  ShieldCheck,
  Sparkles,
  Siren,
  Users,
  X,
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
  Stat,
  StatusBadge,
  ViewAllLink,
} from "@/components/ui/primitives";
import { InlineAction } from "@/components/app-controls";
import { getDb } from "@/db";
import {
  appointments,
  familyMembers,
  medicalHistory,
  medicalReports,
  medications,
  medicationDoses,
  notifications,
  prescriptions,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccessibleMembers } from "@/lib/authorization";
import { ensureDoseWindowForMember } from "@/lib/schedule";
import { ageFromDob, firstName, formatDate, formatDateTime, formatTime, todayInZone } from "@/lib/utils";
import { markDoseAction } from "@/app/actions/medications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; email_delivery?: string; error?: string }>;
}) {
  const user = await requireUser("/app");
  const params = await searchParams;
  const today = todayInZone(user.timezone);
  const members = await getAccessibleMembers(user.id);
  const memberIds = members.map((row) => row.member.id);
  const scopeIds = memberIds.length
    ? memberIds
    : ["00000000-0000-0000-0000-000000000000"];
  const db = await getDb();

  await Promise.all(
    members.map((row) =>
      ensureDoseWindowForMember(row.member.id, user.timezone, today, today).catch(() => 0),
    ),
  );

  const [
    todayDoses,
    activeMedications,
    recentReports,
    recentHistory,
    upcomingConsultations,
    recentNotifications,
    reportCounts,
    historyCounts,
    activeMedCounts,
    prescriptionCounts,
  ] = await Promise.all([
        db
          .select({
            id: medicationDoses.id,
            status: medicationDoses.status,
            scheduledTime: medicationDoses.scheduledTime,
            scheduledAt: medicationDoses.scheduledAt,
            memberId: medicationDoses.memberId,
            medicationName: medications.name,
            strength: medications.strength,
            dose: medications.prescribedDose,
          })
          .from(medicationDoses)
          .innerJoin(medications, eq(medicationDoses.medicationId, medications.id))
          .where(
            and(
              inArray(medicationDoses.memberId, scopeIds),
              eq(medicationDoses.scheduledDate, today),
            ),
          )
          .orderBy(asc(medicationDoses.scheduledAt)),
        db
          .select({
            id: medications.id,
            name: medications.name,
            strength: medications.strength,
            memberId: medications.memberId,
            frequency: medications.frequency,
            scheduledTimes: medications.scheduledTimes,
            endDate: medications.endDate,
          })
          .from(medications)
          .where(and(inArray(medications.memberId, scopeIds), eq(medications.active, true)))
          .orderBy(asc(medications.name)),
        db
          .select({
            id: medicalReports.id,
            title: medicalReports.title,
            status: medicalReports.status,
            reportDate: medicalReports.reportDate,
            category: medicalReports.category,
            memberId: medicalReports.memberId,
            memberName: familyMembers.name,
            tone: familyMembers.avatarTone,
          })
          .from(medicalReports)
          .innerJoin(familyMembers, eq(medicalReports.memberId, familyMembers.id))
          .where(inArray(medicalReports.memberId, scopeIds))
          .orderBy(desc(medicalReports.reportDate), desc(medicalReports.createdAt))
          .limit(4),
        db
          .select({
            id: medicalHistory.id,
            title: medicalHistory.title,
            category: medicalHistory.category,
            recordedAt: medicalHistory.recordedAt,
            memberId: medicalHistory.memberId,
            memberName: familyMembers.name,
            severity: medicalHistory.severity,
          })
          .from(medicalHistory)
          .innerJoin(familyMembers, eq(medicalHistory.memberId, familyMembers.id))
          .where(and(inArray(medicalHistory.memberId, scopeIds), isNull(medicalHistory.deletedAt)))
          .orderBy(desc(medicalHistory.recordedAt), desc(medicalHistory.createdAt))
          .limit(4),
        db
          .select({
            id: appointments.id,
            status: appointments.status,
            scheduledAt: appointments.scheduledAt,
            kind: appointments.kind,
            memberName: familyMembers.name,
            tone: familyMembers.avatarTone,
          })
          .from(appointments)
          .innerJoin(familyMembers, eq(appointments.memberId, familyMembers.id))
          .where(
            and(
              inArray(appointments.memberId, scopeIds),
              inArray(appointments.status, ["REQUESTED", "CONFIRMED"]),
              gte(appointments.scheduledAt, new Date()),
            ),
          )
          .orderBy(asc(appointments.scheduledAt))
          .limit(3),
        db
          .select({
            id: notifications.id,
            title: notifications.title,
            body: notifications.body,
            href: notifications.href,
            category: notifications.category,
            readAt: notifications.readAt,
            createdAt: notifications.createdAt,
          })
          .from(notifications)
          .where(eq(notifications.userId, user.id))
          .orderBy(desc(notifications.createdAt))
          .limit(5),
        db
          .select({ memberId: medicalReports.memberId, value: count() })
          .from(medicalReports)
          .where(inArray(medicalReports.memberId, scopeIds))
          .groupBy(medicalReports.memberId),
        db
          .select({ memberId: medicalHistory.memberId, value: count() })
          .from(medicalHistory)
          .where(and(inArray(medicalHistory.memberId, scopeIds), isNull(medicalHistory.deletedAt)))
          .groupBy(medicalHistory.memberId),
        db
          .select({ memberId: medications.memberId, value: count() })
          .from(medications)
          .where(and(inArray(medications.memberId, scopeIds), eq(medications.active, true)))
          .groupBy(medications.memberId),
        db
          .select({ memberId: prescriptions.memberId, value: count() })
          .from(prescriptions)
          .where(inArray(prescriptions.memberId, scopeIds))
          .groupBy(prescriptions.memberId),
    ]);

  const countByMember = (rows: Array<{ memberId: string; value: unknown }>) =>
    new Map(rows.map((row) => [row.memberId, Number(row.value)]));

  const reportMap = countByMember(reportCounts as Array<{ memberId: string; value: unknown }>);
  const historyMap = countByMember(historyCounts as Array<{ memberId: string; value: unknown }>);
  const medMap = countByMember(activeMedCounts as Array<{ memberId: string; value: unknown }>);
  const prescriptionMap = countByMember(
    prescriptionCounts as Array<{ memberId: string; value: unknown }>,
  );

  const doseList = todayDoses as Array<{
    id: string;
    status: string;
    scheduledTime: string;
    scheduledAt: Date;
    memberId: string;
    medicationName: string;
    strength: string;
    dose: string;
  }>;
  const takenCount = doseList.filter((dose) => dose.status === "TAKEN").length;
  const pendingDoses = doseList.filter((dose) => dose.status === "PENDING");
  const memberNameById = new Map(members.map((row) => [row.member.id, row.member.name]));
  const totalRecords =
    reportMap.size + historyMap.size + medMap.size + prescriptionMap.size > 0;

  const hour = DateTime.now().setZone(user.timezone).hour;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nextDose = pendingDoses[0];

  return (
    <div>
      <PageHeader
        eyebrow="Care overview"
        title={`${greeting}, ${firstName(user.name)}`}
        description={`Here is what needs attention across ${members.length === 1 ? "your family" : `your ${members.length} family profiles`} today. Access is checked again on every request.`}
        action={
          <Link className="btn btn-primary" href="/app/ai-doctor">
            <Sparkles size={15} aria-hidden="true" />
            Ask Baymax
          </Link>
        }
      />

      {params.welcome ? (
        <InlineNotice
          tone="success"
          className="mb-5"
          title="Your private health space is ready"
        >
          Start by recording what you already know. Nothing here is shared with another person
          unless you explicitly invite them.
        </InlineNotice>
      ) : null}
      {params.email_delivery === "unavailable" ? (
        <InlineNotice tone="warning" className="mb-5" title="Email delivery is not configured">
          Your account was created, but the verification email could not be sent. Use the
          development verification option on the verify-email page, or configure SMTP before
          production.
        </InlineNotice>
      ) : null}
      {params.error === "forbidden" ? (
        <InlineNotice tone="danger" className="mb-5" title="That area is restricted">
          Your account does not have permission to open that page.
        </InlineNotice>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Doses today"
          value={`${takenCount}/${doseList.length}`}
          detail={
            doseList.length === 0
              ? "No scheduled doses"
              : nextDose
                ? `Next at ${formatTime(nextDose.scheduledTime, user.timezone)}`
                : "All recorded for today"
          }
          icon={Pill}
        />
        <Stat
          label="Active medicines"
          value={activeMedications.length}
          detail={activeMedications.length ? "Schedules currently running" : "Nothing scheduled"}
          icon={ClipboardList}
          accent="info"
        />
        <Stat
          label="Reports stored"
          value={Array.from(reportMap.values()).reduce((sum, value) => sum + value, 0)}
          detail="Private files with your consent controls"
          icon={FileText}
        />
        <Stat
          label="Consultations ahead"
          value={upcomingConsultations.length}
          detail={upcomingConsultations.length ? "Requested or confirmed" : "None scheduled"}
          icon={CalendarClock}
          accent={upcomingConsultations.length ? "aqua" : "warn"}
        />
      </div>

      <TwoColumn>
        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading
                title="Today's medicines"
                description={`Scheduled in ${user.timezone.replaceAll("_", " ")}. Taking or skipping a dose is recorded with the time and account.`}
                action={<ViewAllLink href="/app/medications" label="Manage" />}
              />
              {doseList.length === 0 ? (
                <EmptyState
                  compact
                  icon={Pill}
                  title="No doses scheduled for today"
                  description="Add a medication schedule from a recorded prescription, or check back when a schedule starts."
                  action={
                    <Link className="btn btn-secondary btn-sm" href="/app/medications">
                      Open medications
                    </Link>
                  }
                />
              ) : (
                <div>
                  {doseList.slice(0, 8).map((dose) => {
                    const member = members.find((row) => row.member.id === dose.memberId);
                    return (
                      <div key={dose.id} className="care-row items-center">
                        <MemberAvatar
                          name={member?.member.name ?? "?"}
                          tone={member?.member.avatarTone ?? 0}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.84rem] font-medium text-ink">
                            {dose.medicationName}{" "}
                            <span className="font-normal text-muted">{dose.strength}</span>
                          </p>
                          <p className="mt-0.5 text-[0.7rem] text-muted">
                            {dose.dose} · {formatTime(dose.scheduledTime, user.timezone)} ·{" "}
                            {memberNameById.get(dose.memberId)}
                          </p>
                        </div>
                        {dose.status === "PENDING" ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <InlineAction
                              action={markDoseAction}
                              fields={{ doseId: dose.id, status: "TAKEN" }}
                              label="Taken"
                              pendingLabel="Saving"
                              variant="primary"
                              icon={<Check size={12} aria-hidden="true" />}
                            />
                            <InlineAction
                              action={markDoseAction}
                              fields={{ doseId: dose.id, status: "SKIPPED" }}
                              label="Skip"
                              pendingLabel="Saving"
                              variant="quiet"
                              icon={<X size={12} aria-hidden="true" />}
                            />
                          </div>
                        ) : (
                          <StatusBadge status={dose.status} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {doseList.length > 8 ? (
                <p className="mt-3 text-[0.7rem] text-muted">
                  Showing the first 8 of {doseList.length} doses.{" "}
                  <Link className="link" href="/app/medications">
                    See the full day
                  </Link>
                </p>
              ) : null}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Your family"
                description="Each profile is separate. Caregiver access is explicit, scoped, and revocable."
                action={<ViewAllLink href="/app/family" label="Family profiles" />}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {members.slice(0, 6).map(({ member, access }) => {
                  const age = ageFromDob(member.dateOfBirth);
                  const activeMeds = medMap.get(member.id) ?? 0;
                  return (
                    <Link
                      key={member.id}
                      href={`/app/family/${member.id}`}
                      className="group rounded-lg border border-line bg-white p-3.5 transition-colors hover:border-aqua-300 hover:bg-aqua-50/30"
                    >
                      <div className="flex items-start gap-2.5">
                        <MemberAvatar name={member.name} tone={member.avatarTone} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.84rem] font-semibold text-ink group-hover:text-aqua-800">
                            {member.name}
                            {member.isSelf ? " (you)" : ""}
                          </p>
                          <p className="mt-0.5 text-[0.7rem] text-muted">
                            {member.relationship}
                            {age !== null ? ` · ${age} years` : ""}
                            {member.bloodGroup ? ` · ${member.bloodGroup}` : ""}
                          </p>
                        </div>
                        {access.role === "CAREGIVER" && (
                          <span className="badge badge-neutral">Caregiver</span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[0.68rem] text-muted">
                        <span>{historyMap.get(member.id) ?? 0} history</span>
                        <span>{activeMeds} medicines</span>
                        <span>{reportMap.get(member.id) ?? 0} reports</span>
                        <span>{prescriptionMap.get(member.id) ?? 0} prescriptions</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {members.length === 0 ? (
                <InlineEmpty
                  title="No accessible family profiles"
                  description="Your account may have had access revoked, or the profile was archived."
                  action={
                    <Link className="btn btn-secondary btn-sm" href="/app/family">
                      Family settings
                    </Link>
                  }
                />
              ) : null}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Recent reports"
                description="Files stay private. Analysis only runs when you choose it and AI consent is active."
                action={<ViewAllLink href="/app/reports" label="All reports" />}
              />
              {recentReports.length === 0 ? (
                <InlineEmpty
                  title="No reports yet"
                  description="Upload a lab, imaging, discharge, or consultation report to keep it with the right family member."
                  action={
                    <Link className="btn btn-secondary btn-sm" href="/app/reports">
                      Upload a report
                    </Link>
                  }
                />
              ) : (
                <div>
                  {recentReports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/app/reports/${report.id}`}
                      className="care-row items-center hover:bg-[#fbfdfd]"
                    >
                      <span className="icon-tile icon-tile-sm">
                        <FileText size={14} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.84rem] font-medium text-ink">{report.title}</p>
                        <p className="mt-0.5 text-[0.7rem] text-muted">
                          {report.memberName} · {formatDate(report.reportDate)} ·{" "}
                          {report.category.replaceAll("_", " ")}
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
                title="Recent health history"
                description="A record of what you and your caregivers have added."
                action={<ViewAllLink href="/app/medical-history" label="Open history" />}
              />
              {recentHistory.length === 0 ? (
                <InlineEmpty
                  title="Your history is still empty"
                  description="Add conditions, allergies, surgeries, immunizations, or clinician notes so the information is ready when it matters."
                  action={
                    <Link className="btn btn-secondary btn-sm" href="/app/medical-history">
                      Add a health entry
                    </Link>
                  }
                />
              ) : (
                <div>
                  {recentHistory.map((entry) => (
                    <div key={entry.id} className="care-row items-center">
                      <span className="icon-tile icon-tile-sm">
                        <HeartPulse size={14} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.84rem] font-medium text-ink">{entry.title}</p>
                        <p className="mt-0.5 text-[0.7rem] text-muted">
                          {entry.memberName} · {entry.category.toLowerCase()} ·{" "}
                          {formatDate(entry.recordedAt)}
                        </p>
                      </div>
                      {entry.severity && <StatusBadge status={entry.severity} />}
                    </div>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          {!totalRecords ? (
            <DisclosurePanel
              summary="Start with the essentials"
              description="A short checklist to make this workspace useful. You control every entry."
              defaultOpen
            >
              <ol className="space-y-3">
                {[
                  {
                    title: "Complete your own profile",
                    description: "Add your date of birth, blood group, and contact details.",
                    href: `/app/family/${members.find((row) => row.member.isSelf)?.member.id ?? ""}`,
                    done: Boolean(members.find((row) => row.member.isSelf)?.member.dateOfBirth),
                  },
                  {
                    title: "Record allergies and conditions",
                    description: "These appear in the emergency summary you choose to share.",
                    href: "/app/medical-history",
                    done: (historyMap.get(members.find((row) => row.member.isSelf)?.member.id ?? "") ?? 0) > 0,
                  },
                  {
                    title: "Upload a recent report",
                    description: "Keep the original private and decide later whether to analyse it.",
                    href: "/app/reports",
                    done: (reportMap.get(members.find((row) => row.member.isSelf)?.member.id ?? "") ?? 0) > 0,
                  },
                  {
                    title: "Add a prescription and medicine schedule",
                    description: "Reminders are built from a prescription you have recorded.",
                    href: "/app/prescriptions",
                    done: (prescriptionMap.get(members.find((row) => row.member.isSelf)?.member.id ?? "") ?? 0) > 0,
                  },
                ].map((item, index) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[0.65rem] font-semibold ${
                        item.done
                          ? "border-[#c9e7d8] bg-[#f2faf6] text-[#176a48]"
                          : "border-line bg-[#fbfdfd] text-[#7c8c92]"
                      }`}
                    >
                      {item.done ? <Check size={12} aria-hidden="true" /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <Link className="text-[0.84rem] font-medium text-ink hover:text-aqua-700" href={item.href}>
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-[0.72rem] leading-5 text-muted">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </DisclosurePanel>
          ) : null}
        </Stack>

        <Stack>
          <Panel className="overflow-hidden">
            <div className="border-b border-line bg-[#f0fbfa] px-4 py-4">
              <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-aqua-800">
                <ShieldCheck size={14} aria-hidden="true" /> Private by design
              </div>
              <p className="mt-2 text-[0.78rem] leading-5 text-[#3e515a]">
                Health records are visible only to you and caregivers you invite. Uploaded files
                are served through short-lived, signed links checked against your session.
              </p>
              <Link
                className="mt-2 inline-flex items-center gap-1 text-[0.72rem] font-semibold text-aqua-800 hover:underline"
                href="/app/settings/privacy"
              >
                Review privacy controls <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <div className="px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-muted">
                Quick actions
              </p>
              <div className="mt-2 grid gap-1">
                {[
                  { href: "/app/reports", label: "Upload a report", icon: FileText },
                  { href: "/app/medical-history", label: "Add health history", icon: ClipboardList },
                  { href: "/app/family", label: "Add a family member", icon: Users },
                  { href: "/app/womens-health", label: "Women's health", icon: HeartPulse },
                  { href: "/app/alerts", label: "Emergency & SOS", icon: Siren },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[0.78rem] font-medium text-[#52666e] hover:bg-aqua-50 hover:text-aqua-800"
                    >
                      <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Upcoming consultations"
                action={<ViewAllLink href="/app/consultations" label="All" />}
              />
              {upcomingConsultations.length === 0 ? (
                <InlineEmpty
                  title="No consultations booked"
                  description="A real booking is only offered when a clinician scheduling partner is configured."
                />
              ) : (
                <div className="space-y-3">
                  {upcomingConsultations.map((consultation) => (
                    <Link
                      key={consultation.id}
                      href={`/app/consultations/${consultation.id}`}
                      className="flex items-start gap-2.5 rounded-md border border-line p-2.5 hover:border-aqua-300"
                    >
                      <MemberAvatar name={consultation.memberName} tone={consultation.tone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.78rem] font-medium text-ink">
                          {consultation.memberName}
                        </p>
                        <p className="mt-0.5 text-[0.68rem] text-muted">
                          {formatDateTime(consultation.scheduledAt, user.timezone)}
                        </p>
                      </div>
                      <StatusBadge status={consultation.status} />
                    </Link>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Recent notifications" action={<ViewAllLink href="/app/notifications" label="All" />} />
              {recentNotifications.length === 0 ? (
                <InlineEmpty
                  title="No notifications"
                  description="Medication, report, family, and emergency updates will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((notification) => {
                    const content = (
                      <>
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                              notification.readAt ? "bg-[#c6d9d8]" : "bg-aqua-500"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-[0.78rem] font-medium leading-5 text-ink">
                              {notification.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[0.68rem] leading-4 text-muted">
                              {notification.body}
                            </p>
                            <p className="mt-1 text-[0.64rem] text-[#8a999e]">
                              {formatDateTime(notification.createdAt, user.timezone)}
                            </p>
                          </div>
                        </div>
                      </>
                    );
                    return notification.href ? (
                      <Link key={notification.id} href={notification.href} className="block rounded-md p-1 hover:bg-[#fbfdfd]">
                        {content}
                      </Link>
                    ) : (
                      <div key={notification.id} className="p-1">
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Your care companion" />
              <p className="text-[0.78rem] leading-5 text-[#52666e]">
                Baymax Care can explain records and help you prepare questions. It does not
                diagnose, prescribe, dispatch emergency services, or replace a clinician.
              </p>
              <div className="mt-3 grid gap-2">
                <Link className="btn btn-secondary btn-sm justify-start" href="/app/ai-doctor">
                  <Sparkles size={13} aria-hidden="true" />
                  Open AI family doctor
                </Link>
                <Link className="btn btn-secondary btn-sm justify-start" href="/app/consultations">
                  <CalendarClock size={13} aria-hidden="true" />
                  Consultations
                </Link>
                <Link
                  className="btn btn-danger-outline btn-sm justify-start"
                  href="/app/alerts"
                >
                  <Siren size={13} aria-hidden="true" />
                  Emergency & SOS
                </Link>
              </div>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
