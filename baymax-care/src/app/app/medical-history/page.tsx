import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  ClipboardList,
  FileHeart,
  HeartPulse,
  Plus,
  ShieldCheck,
  Siren,
  Stethoscope,
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
import { medicalHistory } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccessibleMembers, getMemberAccess } from "@/lib/authorization";
import { formatDate, titleCase, todayInZone } from "@/lib/utils";
import {
  createMedicalHistoryAction,
  deleteMedicalHistoryAction,
  updateMedicalHistoryAction,
} from "@/app/actions/history";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Medical history" };

const CATEGORIES = [
  "CONDITION",
  "ALLERGY",
  "SURGERY",
  "HOSPITALIZATION",
  "FAMILY_HISTORY",
  "IMMUNIZATION",
  "PROVIDER",
  "MEASUREMENT",
  "VISIT",
  "NOTE",
] as const;

const SOURCES = ["PATIENT", "CAREGIVER", "CLINICIAN", "IMPORT"] as const;

export default async function MedicalHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; category?: string; added?: string }>;
}) {
  const user = await requireUser("/app/medical-history");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId = params.member && accessible.some((row) => row.member.id === params.member)
    ? params.member
    : "";
  const category = CATEGORIES.includes(params.category as (typeof CATEGORIES)[number])
    ? (params.category as (typeof CATEGORIES)[number])
    : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const db = await getDb();

  const where = and(
    inArray(medicalHistory.memberId, selectedMemberId ? [selectedMemberId] : scopeIds),
    isNull(medicalHistory.deletedAt),
    category ? eq(medicalHistory.category, category) : undefined,
  );

  const [entries, totals, categoryCounts, selectedAccess] = await Promise.all([
    db
      .select()
      .from(medicalHistory)
      .where(where)
      .orderBy(desc(medicalHistory.recordedAt), desc(medicalHistory.createdAt))
      .limit(150),
    db
      .select({
        total: count(),
        conditions: sql<number>`count(*) filter (where ${medicalHistory.category} = 'CONDITION')::int`,
        allergies: sql<number>`count(*) filter (where ${medicalHistory.category} = 'ALLERGY')::int`,
      })
      .from(medicalHistory)
      .where(and(inArray(medicalHistory.memberId, scopeIds), isNull(medicalHistory.deletedAt))),
    db
      .select({ category: medicalHistory.category, value: count() })
      .from(medicalHistory)
      .where(and(inArray(medicalHistory.memberId, scopeIds), isNull(medicalHistory.deletedAt)))
      .groupBy(medicalHistory.category)
      .orderBy(desc(count())),
    selectedMemberId ? getMemberAccess(user.id, selectedMemberId) : Promise.resolve(null),
  ]);

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const memberById = new Map(accessible.map((row) => [row.member.id, row]));
  const canAdd = selectedAccess
    ? selectedAccess.access.canManage
    : accessible.some((row) => row.access.canManage || row.access.role === "OWNER");
  const addMemberId = selectedAccess?.member.id ?? accessible.find((row) => row.access.canManage)?.member.id ?? "";
  const today = todayInZone(user.timezone);

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumbs items={[{ label: "Care", href: "/app" }, { label: "Medical history" }]} />}
        title="Medical history"
        description="A single, private timeline of conditions, allergies, procedures, visits, and clinician notes. Entries are labelled by who recorded them."
        action={
          <Link className="btn btn-secondary" href="/app/family">
            <HeartPulse size={15} aria-hidden="true" /> Family profiles
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="History entries" value={Number(totals[0]?.total ?? 0)} icon={ClipboardList} />
        <Stat
          label="Conditions"
          value={Number(totals[0]?.conditions ?? 0)}
          icon={Stethoscope}
          accent="info"
        />
        <Stat
          label="Allergies"
          value={Number(totals[0]?.allergies ?? 0)}
          icon={Siren}
          accent="danger"
        />
        <Stat
          label="Profiles"
          value={accessible.length}
          detail="Records are scoped to profiles you can access."
          icon={ShieldCheck}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <MemberFilter
          members={members}
          current={selectedMemberId}
          basePath="/app/medical-history"
          label="Filter by profile"
        />
        <form method="get" className="flex flex-wrap items-center gap-2">
          {selectedMemberId && <input type="hidden" name="member" value={selectedMemberId} />}
          <label className="inline-flex items-center gap-2 text-xs text-muted">
            <span className="font-medium text-[#52666e]">Category</span>
            <select className="select min-h-9 py-1 text-xs" name="category" defaultValue={category}>
              <option value="">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-secondary btn-sm" type="submit">
            Apply
          </button>
        </form>
      </div>

      <TwoColumn>
        <Stack>
          {canAdd && addMemberId ? (
            <DisclosurePanel
              summary="Add a history entry"
              description="Record what you know, and note who provided the information. This is not a clinician-authored record unless a clinician enters it."
              defaultOpen={params.added === "1"}
            >
              <ActionForm action={createMedicalHistoryAction} submitLabel="Save history entry">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Family member" name="memberId">
                    <select className="select" id="field-memberId" name="memberId" defaultValue={addMemberId} required>
                      {accessible.map((row) => (
                        <option key={row.member.id} value={row.member.id}>
                          {row.member.name}
                          {row.member.isSelf ? " (you)" : ` · ${row.member.relationship}`}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Category" name="category">
                    <select className="select" id="field-category" name="category" defaultValue="CONDITION" required>
                      {CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          {titleCase(item)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Title" name="title" className="sm:col-span-2">
                    <input
                      className="input"
                      id="field-title"
                      name="title"
                      maxLength={160}
                      placeholder="e.g. Penicillin allergy"
                      required
                    />
                  </FormField>
                  <FormField label="Date recorded" name="recordedAt">
                    <input
                      className="input"
                      id="field-recordedAt"
                      name="recordedAt"
                      type="date"
                      defaultValue={today}
                      max={today}
                      required
                    />
                  </FormField>
                  <FormField label="Source" name="source">
                    <select className="select" id="field-source" name="source" defaultValue="PATIENT">
                      {SOURCES.map((item) => (
                        <option key={item} value={item}>
                          {titleCase(item)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Status" name="status" optional hint="For example: active, resolved, managed.">
                    <input className="input" id="field-status" name="status" maxLength={80} />
                  </FormField>
                  <FormField label="Severity" name="severity" optional>
                    <select className="select" id="field-severity" name="severity" defaultValue="">
                      <option value="">Not recorded</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </FormField>
                  <FormField label="Clinician name" name="clinicianName" optional className="sm:col-span-2">
                    <input
                      className="input"
                      id="field-clinicianName"
                      name="clinicianName"
                      maxLength={120}
                      placeholder="Only if a clinician provided this information"
                    />
                  </FormField>
                  <FormField label="Details" name="details" optional className="sm:col-span-2">
                    <textarea
                      className="textarea"
                      id="field-details"
                      name="details"
                      rows={3}
                      maxLength={4000}
                      placeholder="Symptoms, context, treatment, or outcome. Avoid copying information you do not need."
                    />
                  </FormField>
                </div>
              </ActionForm>
            </DisclosurePanel>
          ) : (
            <InlineNotice tone="info" title="View-only history">
              You can review records for the profiles you can access. Adding and editing history requires
              manage permission from the profile owner.
            </InlineNotice>
          )}

          <Panel>
            <PanelBody>
              <SectionHeading
                title={selectedMemberId ? `${memberById.get(selectedMemberId)?.member.name ?? "Profile"} history` : "Family history timeline"}
                description={`${entries.length} ${entries.length === 1 ? "entry" : "entries"} shown${category ? ` in ${titleCase(category)}` : ""}.`}
                action={
                  <Link className="text-xs font-medium text-aqua-700" href="/app/reports">
                    Reports
                  </Link>
                }
              />
              {entries.length === 0 ? (
                <EmptyState
                  icon={FileHeart}
                  title="No history entries here yet"
                  description={
                    canAdd
                      ? "Start with allergies, active conditions, and immunizations. A short, accurate record is more useful than a complete-looking one."
                      : "The profile owner has not recorded history in this category yet."
                  }
                  action={
                    canAdd && addMemberId ? (
                      <Link className="btn btn-secondary btn-sm" href={`/app/family/${addMemberId}`}>
                        Open care profile
                      </Link>
                    ) : undefined
                  }
                  compact
                />
              ) : (
                <div>
                  {entries.map((entry) => {
                    const member = memberById.get(entry.memberId);
                    const canEdit = Boolean(member?.access.canManage);
                    return (
                      <article key={entry.id} className="border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm font-semibold text-ink">{entry.title}</h3>
                              <StatusBadge status={entry.category} label={titleCase(entry.category)} />
                              {entry.severity ? (
                                <StatusBadge status={entry.severity} label={titleCase(entry.severity)} />
                              ) : null}
                            </div>
                            <p className="mt-1 text-[0.7rem] text-muted">
                              {member?.member.name ?? "Family member"} · {formatDate(entry.recordedAt)} ·{" "}
                              {titleCase(entry.source)}
                              {entry.clinicianName ? ` · ${entry.clinicianName}` : ""}
                              {entry.status ? ` · ${entry.status}` : ""}
                            </p>
                          </div>
                          {canEdit ? (
                            <InlineAction
                              action={deleteMedicalHistoryAction}
                              fields={{ entryId: entry.id, memberId: entry.memberId }}
                              label="Remove"
                              variant="quiet"
                              confirmMessage={`Remove "${entry.title}" from the active record? The entry is soft-deleted and retained in the database.`}
                            />
                          ) : null}
                        </div>
                        {entry.details ? (
                          <p className="mt-2 whitespace-pre-line text-[0.8rem] leading-6 text-[#52666e]">
                            {entry.details}
                          </p>
                        ) : null}
                        {canEdit ? (
                          <DisclosurePanel
                            summary="Edit this entry"
                            className="mt-3 border-0 shadow-none"
                          >
                            <ActionForm action={updateMedicalHistoryAction} submitLabel="Update entry">
                              <input type="hidden" name="entryId" value={entry.id} />
                              <input type="hidden" name="memberId" value={entry.memberId} />
                              <div className="grid gap-3 sm:grid-cols-2">
                                <FormField label="Category" name="category">
                                  <select className="select" id="field-category" name="category" defaultValue={entry.category}>
                                    {CATEGORIES.map((item) => (
                                      <option key={item} value={item}>
                                        {titleCase(item)}
                                      </option>
                                    ))}
                                  </select>
                                </FormField>
                                <FormField label="Date recorded" name="recordedAt">
                                  <input
                                    className="input"
                                    id="field-recordedAt"
                                    name="recordedAt"
                                    type="date"
                                    defaultValue={entry.recordedAt}
                                    max={today}
                                  />
                                </FormField>
                                <FormField label="Title" name="title" className="sm:col-span-2">
                                  <input className="input" id="field-title" name="title" defaultValue={entry.title} maxLength={160} />
                                </FormField>
                                <FormField label="Source" name="source">
                                  <select className="select" id="field-source" name="source" defaultValue={entry.source}>
                                    {SOURCES.map((item) => (
                                      <option key={item} value={item}>
                                        {titleCase(item)}
                                      </option>
                                    ))}
                                  </select>
                                </FormField>
                                <FormField label="Severity" name="severity">
                                  <select className="select" id="field-severity" name="severity" defaultValue={entry.severity ?? ""}>
                                    <option value="">Not recorded</option>
                                    <option value="mild">Mild</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="severe">Severe</option>
                                    <option value="unknown">Unknown</option>
                                  </select>
                                </FormField>
                                <FormField label="Status" name="status" optional>
                                  <input className="input" id="field-status" name="status" defaultValue={entry.status ?? ""} maxLength={80} />
                                </FormField>
                                <FormField label="Clinician name" name="clinicianName" optional>
                                  <input
                                    className="input"
                                    id="field-clinicianName"
                                    name="clinicianName"
                                    defaultValue={entry.clinicianName ?? ""}
                                    maxLength={120}
                                  />
                                </FormField>
                                <FormField label="Details" name="details" optional className="sm:col-span-2">
                                  <textarea className="textarea" id="field-details" name="details" rows={3} defaultValue={entry.details ?? ""} />
                                </FormField>
                              </div>
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
              <SectionHeading title="By category" description="Across the profiles you can access." />
              {categoryCounts.length === 0 ? (
                <InlineEmpty title="No categories yet" description="Categories appear after the first entry is added." />
              ) : (
                <ul className="space-y-2">
                  {categoryCounts.map((row) => (
                    <li key={row.category} className="flex items-center justify-between gap-2 text-xs">
                      <Link
                        className="text-[#52666e] hover:text-aqua-700"
                        href={`/app/medical-history?${new URLSearchParams({
                          ...(selectedMemberId ? { member: selectedMemberId } : {}),
                          category: row.category,
                        }).toString()}`}
                      >
                        {titleCase(row.category)}
                      </Link>
                      <span className="font-semibold text-ink">{Number(row.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Recording guidance" />
              <ul className="space-y-2.5 text-[0.78rem] leading-5 text-[#52666e]">
                <li className="flex gap-2">
                  <Plus size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Record allergies, active conditions, and current medicines first. They matter most in
                  an emergency.
                </li>
                <li className="flex gap-2">
                  <Stethoscope size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Mark the source honestly. A caregiver&apos;s note is not a clinician&apos;s note.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  History is private to people with access to the profile. It is not sent to an AI
                  provider unless you explicitly choose that in a feature that requires consent.
                </li>
              </ul>
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <SectionHeading title="Not for emergencies" />
              <p className="text-[0.78rem] leading-5 text-[#6b3b42]">
                If someone is in immediate danger, call your local emergency number. Baymax Care
                records information; it does not provide emergency care or dispatch help.
              </p>
              <Link className="btn btn-danger-outline btn-sm mt-3" href="/emergency">
                <Siren size={14} aria-hidden="true" /> Emergency guidance
              </Link>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
