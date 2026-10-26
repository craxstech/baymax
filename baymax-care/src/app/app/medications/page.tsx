import type { Metadata } from "next";
import Link from "next/link";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from "drizzle-orm";
import {
  Bell,
  Check,
  ClipboardList,
  Clock,
  PauseCircle,
  Pill,
  PlayCircle,
  Plus,
  ShieldCheck,
  SkipForward,
} from "lucide-react";
import {
  Breadcrumbs,
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
  PageHeader,
  SectionHeading,
  Stat,
  StatusBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { InlineAction, MemberFilter } from "@/components/app-controls";
import { getDb } from "@/db";
import {
  familyMembers,
  medicationDoses,
  medications,
  prescriptions,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccessibleMembers } from "@/lib/authorization";
import { ensureDoseWindowForMember } from "@/lib/schedule";
import { emailConfigured, smsConfigured } from "@/lib/config";
import { formatDate, formatTime, todayInZone } from "@/lib/utils";
import {
  createMedicationAction,
  discontinueMedicationAction,
  markDoseAction,
  setMedicationActiveAction,
} from "@/app/actions/medications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Medications" };

export default async function MedicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; added?: string }>;
}) {
  const user = await requireUser("/app/medications");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId =
    params.member && accessible.some((row) => row.member.id === params.member) ? params.member : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const today = todayInZone(user.timezone);
  const weekAgo = (() => {
    const [year, month, day] = today.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - 6);
    return date.toISOString().slice(0, 10);
  })();

  await Promise.all(
    accessible.map((row) =>
      ensureDoseWindowForMember(row.member.id, user.timezone, today, today).catch(() => 0),
    ),
  );

  const db = await getDb();
  const filteredIds = selectedMemberId ? [selectedMemberId] : scopeIds;
  const [doseRows, scheduleRows, weekStats, eligiblePrescriptions] = await Promise.all([
    db
      .select({
        id: medicationDoses.id,
        memberId: medicationDoses.memberId,
        status: medicationDoses.status,
        scheduledTime: medicationDoses.scheduledTime,
        scheduledAt: medicationDoses.scheduledAt,
        medicationId: medications.id,
        medicationName: medications.name,
        strength: medications.strength,
        dose: medications.prescribedDose,
        instructions: medications.instructions,
        foodInstructions: medications.foodInstructions,
      })
      .from(medicationDoses)
      .innerJoin(medications, eq(medicationDoses.medicationId, medications.id))
      .where(
        and(
          inArray(medicationDoses.memberId, filteredIds),
          eq(medicationDoses.scheduledDate, today),
        ),
      )
      .orderBy(asc(medicationDoses.scheduledAt), asc(medications.name)),
    db
      .select({
        medication: medications,
        memberName: familyMembers.name,
        prescriptionPrescriber: prescriptions.prescriberName,
        prescriptionIssuedAt: prescriptions.issuedAt,
        prescriptionStatus: prescriptions.status,
      })
      .from(medications)
      .innerJoin(familyMembers, eq(medications.memberId, familyMembers.id))
      .innerJoin(prescriptions, eq(medications.prescriptionId, prescriptions.id))
      .where(inArray(medications.memberId, filteredIds))
      .orderBy(desc(medications.active), asc(medications.name)),
    db
      .select({
        total: count(),
        taken: sql<number>`count(*) filter (where ${medicationDoses.status} = 'TAKEN')::int`,
        skipped: sql<number>`count(*) filter (where ${medicationDoses.status} = 'SKIPPED')::int`,
        missed: sql<number>`count(*) filter (where ${medicationDoses.status} = 'MISSED')::int`,
      })
      .from(medicationDoses)
      .where(
        and(
          inArray(medicationDoses.memberId, filteredIds),
          gte(medicationDoses.scheduledDate, weekAgo),
          lte(medicationDoses.scheduledDate, today),
        ),
      ),
    db
      .select({
        id: prescriptions.id,
        memberId: prescriptions.memberId,
        prescriberName: prescriptions.prescriberName,
        issuedAt: prescriptions.issuedAt,
        validUntil: prescriptions.validUntil,
      })
      .from(prescriptions)
      .where(
        and(
          inArray(prescriptions.memberId, scopeIds),
          inArray(prescriptions.status, ["UNVERIFIED", "VERIFIED"]),
          sql`(${prescriptions.validUntil} is null or ${prescriptions.validUntil} >= ${today})`,
        ),
      )
      .orderBy(desc(prescriptions.issuedAt)),
  ]);

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const memberById = new Map(accessible.map((row) => [row.member.id, row]));
  const managed = accessible.filter((row) => row.access.canManage || row.access.canManageMedications);
  const addMemberId = selectedMemberId && managed.some((row) => row.member.id === selectedMemberId)
    ? selectedMemberId
    : managed[0]?.member.id ?? "";

  const taken = doseRows.filter((dose) => dose.status === "TAKEN").length;
  const skipped = doseRows.filter((dose) => dose.status === "SKIPPED").length;
  const pending = doseRows.filter((dose) => dose.status === "PENDING").length;
  const missed = doseRows.filter((dose) => dose.status === "MISSED").length;
  const activeSchedules = scheduleRows.filter((row) => row.medication.active);

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumbs items={[{ label: "Care", href: "/app" }, { label: "Medications" }]} />}
        title="Medications"
        description="Mark doses as taken or skipped, keep schedules tied to a recorded prescription, and review what is active. Medicine reminders are not a substitute for clinical instructions."
        action={
          <>
            <Link className="btn btn-secondary" href="/app/prescriptions">
              <ClipboardList size={15} aria-hidden="true" /> Prescriptions
            </Link>
            <Link className="btn btn-secondary" href="/app/notifications">
              <Bell size={15} aria-hidden="true" /> Reminder settings
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Doses today"
          value={`${taken}/${doseRows.length}`}
          detail={`${pending} pending · ${skipped} skipped${missed ? ` · ${missed} missed` : ""}`}
          icon={Check}
        />
        <Stat
          label="Active schedules"
          value={activeSchedules.length}
          detail={`${scheduleRows.length - activeSchedules.length} paused or ended`}
          icon={Pill}
          accent="info"
        />
        <Stat
          label="7-day adherence"
          value={
            Number(weekStats[0]?.total ?? 0) > 0
              ? `${Math.round((Number(weekStats[0]?.taken ?? 0) / Number(weekStats[0]?.total ?? 1)) * 100)}%`
              : "—"
          }
          detail={`${Number(weekStats[0]?.taken ?? 0)} of ${Number(weekStats[0]?.total ?? 0)} doses marked taken`}
          icon={Clock}
          accent="warn"
        />
        <Stat
          label="External reminders"
          value={emailConfigured() || smsConfigured() ? "Partly available" : "Not configured"}
          detail="In-app reminders always work; SMS and email require providers."
          icon={Bell}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <MemberFilter
          members={members}
          current={selectedMemberId}
          basePath="/app/medications"
          label="Filter by profile"
        />
        <p className="text-[0.7rem] text-muted">
          Scheduled in {user.timezone.replaceAll("_", " ")} · today {formatDate(today)}
        </p>
      </div>

      <TwoColumn>
        <Stack>
          {managed.length > 0 ? (
            <DisclosurePanel
              summary="Add a medicine schedule"
              description="A schedule must follow a prescription recorded for the same family member. This app does not prescribe."
              defaultOpen={params.added === "1" || eligiblePrescriptions.length === 0}
            >
              {eligiblePrescriptions.length === 0 ? (
                <InlineNotice tone="warning" title="Record a prescription first">
                  A medicine schedule needs a prescription recorded in this workspace. It will remain
                  marked unverified unless a configured provider verifies it.{" "}
                  <Link className="font-semibold underline underline-offset-2" href="/app/prescriptions">
                    Record a prescription
                  </Link>
                </InlineNotice>
              ) : (
                <ActionForm action={createMedicationAction} submitLabel="Add schedule">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Family member" name="memberId">
                      <select className="select" id="field-memberId" name="memberId" defaultValue={addMemberId} required>
                        {managed.map((row) => (
                          <option key={row.member.id} value={row.member.id}>
                            {row.member.name}
                            {row.member.isSelf ? " (you)" : ` · ${row.member.relationship}`}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Prescription" name="prescriptionId">
                      <select className="select" id="field-prescriptionId" name="prescriptionId" required>
                        <option value="">Choose a recorded prescription</option>
                        {eligiblePrescriptions.map((prescription) => (
                          <option key={prescription.id} value={prescription.id}>
                            {memberById.get(prescription.memberId)?.member.name ?? "Member"} ·{" "}
                            {prescription.prescriberName} · {formatDate(prescription.issuedAt)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Medicine name" name="name">
                      <input className="input" id="field-name" name="name" maxLength={120} required placeholder="As written on the prescription" />
                    </FormField>
                    <FormField label="Strength" name="strength">
                      <input className="input" id="field-strength" name="strength" maxLength={60} required placeholder="e.g. 500 mg" />
                    </FormField>
                    <FormField label="Form" name="dosageForm">
                      <input className="input" id="field-dosageForm" name="dosageForm" maxLength={60} required placeholder="e.g. tablet" />
                    </FormField>
                    <FormField label="Prescribed dose" name="prescribedDose">
                      <input className="input" id="field-prescribedDose" name="prescribedDose" maxLength={80} required placeholder="e.g. 1 tablet" />
                    </FormField>
                    <FormField label="Route" name="route">
                      <input className="input" id="field-route" name="route" maxLength={60} required defaultValue="oral" />
                    </FormField>
                    <FormField label="Frequency" name="frequency">
                      <input className="input" id="field-frequency" name="frequency" maxLength={80} required placeholder="e.g. twice daily" />
                    </FormField>
                    <FormField label="Scheduled times" name="times" hint="24-hour times separated by commas, e.g. 08:00, 20:00">
                      <input className="input" id="field-times" name="times" required placeholder="08:00, 20:00" />
                    </FormField>
                    <FormField label="Start date" name="startDate">
                      <input className="input" id="field-startDate" name="startDate" type="date" defaultValue={today} required />
                    </FormField>
                    <FormField label="End date" name="endDate" optional>
                      <input className="input" id="field-endDate" name="endDate" type="date" />
                    </FormField>
                    <FormField label="Prescriber" name="prescriber">
                      <input className="input" id="field-prescriber" name="prescriber" maxLength={120} required placeholder="Name on the prescription" />
                    </FormField>
                    <FormField label="Instructions" name="instructions" optional className="sm:col-span-2">
                      <textarea className="textarea" id="field-instructions" name="instructions" rows={2} maxLength={1000} />
                    </FormField>
                    <FormField label="Food instructions" name="foodInstructions" optional>
                      <input className="input" id="field-foodInstructions" name="foodInstructions" maxLength={300} placeholder="e.g. after food" />
                    </FormField>
                    <FormField label="Refill note" name="refillNote" optional>
                      <input className="input" id="field-refillNote" name="refillNote" maxLength={300} />
                    </FormField>
                  </div>
                  <InlineNotice tone="warning">
                    Enter the prescription exactly as written. If anything is unclear, ask the prescriber
                    or pharmacist before creating or changing a schedule.
                  </InlineNotice>
                </ActionForm>
              )}
            </DisclosurePanel>
          ) : (
            <InlineNotice tone="info" title="View-only medicine access">
              You can see today&apos;s doses and schedules. Adding or changing medicine schedules requires
              medication permission from the profile owner.
            </InlineNotice>
          )}

          <Panel>
            <PanelBody>
              <SectionHeading
                title={`Today's doses · ${formatDate(today)}`}
                description="Mark a dose only after it has actually been taken or intentionally skipped."
              />
              {doseRows.length === 0 ? (
                <EmptyState
                  icon={Pill}
                  title="No doses scheduled today"
                  description="There are no active medicine schedules for this selection today. Check paused schedules or add a schedule from a recorded prescription."
                  compact
                />
              ) : (
                <div>
                  {doseRows.map((dose) => {
                    const member = memberById.get(dose.memberId);
                    const canAct =
                      member &&
                      (member.access.canManage || member.access.canManageMedications);
                    return (
                      <div key={dose.id} className="care-row items-start">
                        <span className="icon-tile icon-tile-sm">
                          <Pill size={13} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[0.84rem] font-medium text-ink">
                              {dose.medicationName} <span className="font-normal text-muted">{dose.strength}</span>
                            </p>
                            <StatusBadge status={dose.status} />
                          </div>
                          <p className="mt-0.5 text-[0.7rem] text-muted">
                            {member?.member.name ?? "Family member"} · {dose.dose} ·{" "}
                            {formatTime(dose.scheduledTime, user.timezone)}
                            {dose.foodInstructions ? ` · ${dose.foodInstructions}` : ""}
                          </p>
                          {dose.instructions ? (
                            <p className="mt-1 text-[0.72rem] leading-5 text-[#52666e]">{dose.instructions}</p>
                          ) : null}
                        </div>
                        {dose.status === "PENDING" && canAct ? (
                          <div className="flex shrink-0 flex-wrap gap-1">
                            <InlineAction
                              action={markDoseAction}
                              fields={{ doseId: dose.id, status: "TAKEN" }}
                              label="Taken"
                              variant="primary"
                              icon={<Check size={12} aria-hidden="true" />}
                            />
                            <InlineAction
                              action={markDoseAction}
                              fields={{ doseId: dose.id, status: "SKIPPED" }}
                              label="Skip"
                              variant="quiet"
                              icon={<SkipForward size={12} aria-hidden="true" />}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Medicine schedules"
                description="Active, paused, and ended schedules. Past dose history stays available."
              />
              {scheduleRows.length === 0 ? (
                <InlineEmpty
                  title="No schedules recorded"
                  description="Add a schedule from a prescription to begin tracking doses."
                />
              ) : (
                <div className="space-y-3">
                  {scheduleRows.map((row) => {
                    const medication = row.medication;
                    const member = memberById.get(medication.memberId);
                    const canAct =
                      member &&
                      (member.access.canManage || member.access.canManageMedications);
                    return (
                      <article key={medication.id} className="rounded-lg border border-line bg-white p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm font-semibold text-ink">{medication.name}</h3>
                              <span className="badge badge-neutral">{medication.strength}</span>
                              <StatusBadge status={medication.active ? "active" : "paused"} />
                            </div>
                            <p className="mt-1 text-[0.7rem] text-muted">
                              {row.memberName} · {medication.prescribedDose} · {medication.frequency} ·{" "}
                              {medication.scheduledTimes.join(", ")}
                            </p>
                            <p className="text-[0.66rem] text-muted">
                              {formatDate(medication.startDate)}
                              {medication.endDate ? ` to ${formatDate(medication.endDate)}` : " onward"} ·{" "}
                              {medication.route}
                              {medication.foodInstructions ? ` · ${medication.foodInstructions}` : ""}
                            </p>
                            <p className="mt-1 text-[0.64rem] text-muted">
                              Prescription: {row.prescriptionPrescriber} · issued {formatDate(row.prescriptionIssuedAt)} ·{" "}
                              {row.prescriptionStatus.replaceAll("_", " ").toLowerCase()}
                            </p>
                          </div>
                          {canAct ? (
                            <div className="flex flex-wrap gap-1.5">
                              <InlineAction
                                action={setMedicationActiveAction}
                                fields={{
                                  medicationId: medication.id,
                                  memberId: medication.memberId,
                                  active: !medication.active,
                                }}
                                label={medication.active ? "Pause" : "Resume"}
                                variant="quiet"
                                icon={
                                  medication.active ? (
                                    <PauseCircle size={12} aria-hidden="true" />
                                  ) : (
                                    <PlayCircle size={12} aria-hidden="true" />
                                  )
                                }
                                confirmMessage={
                                  medication.active
                                    ? `Pause ${medication.name}? No new doses will be generated while paused.`
                                    : `Resume ${medication.name}?`
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                        {medication.instructions ? (
                          <p className="mt-2 text-[0.72rem] leading-5 text-[#52666e]">{medication.instructions}</p>
                        ) : null}
                        {medication.active && canAct ? (
                          <DisclosurePanel summary="End this schedule" tone="danger" className="mt-3 border-0 shadow-none">
                            <ActionForm action={discontinueMedicationAction} submitLabel="End schedule" submitClassName="btn-danger">
                              <input type="hidden" name="medicationId" value={medication.id} />
                              <input type="hidden" name="memberId" value={medication.memberId} />
                              <InlineNotice tone="danger" title="Stop only on clinical advice">
                                This ends the schedule today and stops new doses. It does not delete past
                                dose history. Type STOP to confirm.
                              </InlineNotice>
                              <FormField label='Type "STOP" to confirm' name="confirmation">
                                <input className="input" id="field-confirmation" name="confirmation" autoComplete="off" />
                              </FormField>
                            </ActionForm>
                          </DisclosurePanel>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </PanelBody>
          </Panel>
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Reminders" />
              <p className="text-[0.78rem] leading-5 text-[#52666e]">
                In-app notifications are recorded for dose events. Email and SMS reminders require
                separately configured providers and opt-in preferences.
              </p>
              <div className="mt-3 space-y-2 text-[0.72rem]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Email</span>
                  <StatusBadge status={emailConfigured() ? "active" : "unavailable"} label={emailConfigured() ? "Configured" : "Not configured"} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">SMS</span>
                  <StatusBadge status={smsConfigured() ? "active" : "unavailable"} label={smsConfigured() ? "Configured" : "Not configured"} />
                </div>
              </div>
              <Link className="btn btn-secondary btn-sm mt-3" href="/app/notifications">
                Notification preferences
              </Link>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Safety rules" />
              <ul className="space-y-2.5 text-[0.78rem] leading-5 text-[#52666e]">
                <li className="flex gap-2">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Never start, stop, or change a medicine because of this app. Follow the prescriber and
                  pharmacist.
                </li>
                <li className="flex gap-2">
                  <Clock size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Mark doses honestly. A missed dose record is more useful than an invented one.
                </li>
                <li className="flex gap-2">
                  <Plus size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  If a dose was missed, follow the medicine&apos;s instructions or ask a pharmacist. Do not
                  double up unless a clinician says so.
                </li>
              </ul>
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <SectionHeading title="Allergic reaction or overdose" />
              <p className="text-[0.78rem] leading-5 text-[#6b3b42]">
                Call your local emergency number immediately. Do not wait for the app to send a reminder
                or notification.
              </p>
              <Link className="btn btn-danger-outline btn-sm mt-3" href="/emergency">
                Emergency guidance
              </Link>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
