import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, inArray } from "drizzle-orm";
import {
  CalendarDays,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";
import {
  Breadcrumbs,
  DisclosurePanel,
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
  StatusBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { MemberFilter } from "@/components/app-controls";
import { getDb } from "@/db";
import {
  cycleEntries,
  womenHealthPreferences,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  permissionMessage,
  requireMemberAccess,
  getAccessibleMembers,
} from "@/lib/authorization";
import { hasActiveConsent } from "@/lib/consents";
import { emailConfigured, smsConfigured, aiConfigured, brand } from "@/lib/config";
import { predictCycle } from "@/lib/cycle";
import { cycleEntrySchema, linesToArray } from "@/lib/validation";
import {
  grantWomensHealthConsentAction,
  revokeWomensHealthConsentAction,
  createCycleEntryAction,
  deleteCycleEntryAction,
  updateWomenHealthPreferencesAction,
} from "@/app/actions/womens-health";
import { decryptText } from "@/lib/security";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Women's health" };

export default async function WomensHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; saved?: string }>;
}) {
  const user = await requireUser("/app/womens-health");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId =
    params.member && accessible.some((row) => row.member.id === params.member)
      ? params.member
      : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-000000000000"];
  const db = await getDb();

  const [entries, preferences, aiConsent, womensHealthConsent] = await Promise.all([
    db
      .select()
      .from(cycleEntries)
      .where(
        and(
          selectedMemberId
            ? eq(cycleEntries.memberId, selectedMemberId)
            : inArray(cycleEntries.memberId, scopeIds),
        ),
      )
      .orderBy(desc(cycleEntries.startDate))
      .limit(120),
    db
      .select()
      .from(womenHealthPreferences)
      .where(eq(womenHealthPreferences.userId, user.id))
      .limit(1),
    hasActiveConsent(user.id, "AI_PROCESSING"),
    hasActiveConsent(user.id, "WOMENS_HEALTH"),
  ]);

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const memberById = new Map(accessible.map((row) => [row.member.id, row.member]));
  const managed = accessible.filter((row) => row.access.canManage);
  const defaultMemberId = selectedMemberId && managed.some((row) => row.member.id === selectedMemberId)
    ? selectedMemberId
    : managed[0]?.member.id ?? "";

  const entriesWithMember = entries.map((entry) => ({
    ...entry,
    memberName: memberById.get(entry.memberId)?.name ?? "Family member",
    notes: decryptText(entry.notesEncrypted ?? null) ?? null,
    startDateStr: String(entry.startDate).slice(0, 10),
    endDateStr: entry.endDate ? String(entry.endDate).slice(0, 10) : null,
  }));

  const latestEntry = entriesWithMember[0];
  const starts = entriesWithMember
    .map((e) => e.startDateStr)
    .filter(Boolean);
  const prediction = starts.length > 0 ? predictCycle(starts) : null;

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs items={[
            { label: "Care", href: "/app" },
            { label: "Women's health" },
          ]} />
        }
        title="Women's health & cycle tracking"
        description={
          "Private period and symptom tracking for you or a family member you manage. " +
          "Entries are encrypted at rest and are never shown on shared family dashboards unless you choose to share them."
        }
        action={
          <>
            <Link className="btn btn-secondary" href="/app/settings/privacy">
              <ShieldCheck size={15} aria-hidden="true" /> Privacy
            </Link>
            <a
              className="btn btn-danger-outline"
              href={`tel:${brand.emergencyNumber}`}
              aria-label={`Call emergency number ${brand.emergencyNumber}`}
            >
              <PhoneCall size={15} aria-hidden="true" /> Emergency
            </a>
          </>
        }
      />

      {!womensHealthConsent ? (
        <DisclosurePanel
          summary="Turn on private cycle tracking"
          description={
            "Cycle entries, symptoms, and notes are stored only for your account and are encrypted at rest. " +
            "Granting consent lets you log entries and view history. You can revoke it at any time."
          }
          defaultOpen
        >
          <p className="mb-3 text-[0.78rem] leading-5 text-muted">
            This section is for one person&apos;s private cycle data. Choose the family member whose cycle
            you want to track, then add period start and end dates, symptoms, flow, mood, and notes.
          </p>
          <ActionForm
            action={grantWomensHealthConsentAction}
            submitLabel="Enable cycle tracking"
          >
            <p className="text-[0.72rem] leading-5 text-muted">
              I understand this data is stored privately and can be deleted at any time.
            </p>
          </ActionForm>
        </DisclosurePanel>
      ) : null}

      {womensHealthConsent && (
        <>
          <InlineNotice tone="info" className="mb-5" title="Privacy reminder">
            Cycle entries are associated with a specific family member. Only you and caregivers you
            explicitly grant access to can view them. They never appear on the shared family dashboard.
          </InlineNotice>

          <TwoColumn>
            <Stack>
              <DisclosurePanel
                summary="Log a cycle entry"
                description={
                  "Record the start date, flow, symptoms, mood, and private notes for a cycle day."
                }
                defaultOpen={params.saved === "1"}
              >
                {managed.length > 0 ? (
                  <ActionForm action={createCycleEntryAction} submitLabel="Save entry">
                    <FormField label="Family member" name="memberId">
                      <select
                        className="select"
                        id="field-memberId"
                        name="memberId"
                        defaultValue={defaultMemberId}
                        required
                      >
                        {managed.map((row) => (
                          <option key={row.member.id} value={row.member.id}>
                            {row.member.name}
                            {row.member.isSelf ? " (you)" : ` · ${row.member.relationship}`}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Period start date" name="startDate">
                      <input
                        className="input"
                        id="field-startDate"
                        name="startDate"
                        type="date"
                        required
                      />
                    </FormField>
                    <FormField label="Period end date" name="endDate" optional>
                      <input
                        className="input"
                        id="field-endDate"
                        name="endDate"
                        type="date"
                      />
                    </FormField>
                    <FormField label="Flow" name="flow" optional>
                      <select className="select" id="field-flow" name="flow">
                        <option value="">Not specified</option>
                        <option value="SPOTTING">Spotting</option>
                        <option value="LIGHT">Light</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HEAVY">Heavy</option>
                      </select>
                    </FormField>
                    <FormField label="Symptoms" name="symptomsText" optional hint="Comma-separated, e.g. cramps, headache, fatigue">
                      <input
                        className="input"
                        id="field-symptomsText"
                        name="symptomsText"
                        placeholder="cramps, headache, bloating"
                        maxLength={200}
                      />
                    </FormField>
                    <FormField label="Mood" name="mood" optional>
                      <input
                        className="input"
                        id="field-mood"
                        name="mood"
                        placeholder="e.g. calm, irritable"
                        maxLength={60}
                      />
                    </FormField>
                    <FormField label="Energy" name="energy" optional>
                      <select className="select" id="field-energy" name="energy">
                        <option value="">Not specified</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </FormField>
                    <FormField label="Private notes" name="notes" optional hint="Encrypted at rest. Only you can read them.">
                      <textarea
                        className="textarea"
                        id="field-notes"
                        name="notes"
                        rows={3}
                        maxLength={2000}
                        placeholder="Private notes about this cycle day"
                      />
                    </FormField>
                    <p className="text-[0.68rem] leading-4 text-muted">
                      Predictions are estimates, not medical certainty. This is not contraception or
                      fertility guidance.
                    </p>
                  </ActionForm>
                ) : (
                  <InlineNotice tone="info" title="Manage permission required">
                    You need manage permission for a family member to log cycle entries. Add a family
                    member first, or ask the account owner to grant you access.
                  </InlineNotice>
                )}
              </DisclosurePanel>

              {prediction && (
                <Panel>
                  <PanelBody>
                    <SectionHeading title="Cycle estimate" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="panel p-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                          Average cycle length
                        </p>
                        <p className="text-lg font-semibold text-ink">
                          {prediction.averageCycleDays} days
                        </p>
                        <p className="mt-1 text-[0.68rem] text-muted">
                          Based on {prediction.cyclesUsed} recorded cycle{gapText(prediction.cyclesUsed)}
                        </p>
                      </div>
                      <div className="panel p-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                          Estimated next period
                        </p>
                        <p className="text-lg font-semibold text-ink">
                          {formatDate(prediction.nextStart)}
                        </p>
                        <p className="mt-1 text-[0.68rem] text-muted">
                          Cycle day {prediction.cycleDay}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[0.72rem] leading-5 text-muted">
                      {prediction.explanation}
                    </p>
                    <p className="text-[0.68rem] leading-5 text-muted">
                      This is a calendar average only. It is not a diagnosis, not contraception, and
                      does not predict fertile windows. Add more cycle starts for a more useful average.
                    </p>
                  </PanelBody>
                </Panel>
              )}

              {latestEntry && (
                <Panel>
                  <PanelBody>
                    <SectionHeading title="Most recent entry" />
                    <dl className="space-y-3 text-[0.78rem]">
                      <div className="flex items-start justify-between gap-3 border-b border-line pb-2">
                        <dt className="text-muted">Period start</dt>
                        <dd className="text-ink">{formatDate(latestEntry.startDateStr)}</dd>
                      </div>
                      {latestEntry.endDateStr && (
                        <div className="flex items-start justify-between gap-3 border-b border-line pb-2">
                          <dt className="text-muted">Period end</dt>
                          <dd className="text-ink">{formatDate(latestEntry.endDateStr)}</dd>
                        </div>
                      )}
                      {latestEntry.flow && (
                        <div className="flex items-start justify-between gap-3 border-b border-line pb-2">
                          <dt className="text-muted">Flow</dt>
                          <dd className="text-ink">{titleCase(latestEntry.flow)}</dd>
                        </div>
                      )}
                      {latestEntry.symptoms.length > 0 && (
                        <div className="flex items-start justify-between gap-3 border-b border-line pb-2">
                          <dt className="text-muted">Symptoms</dt>
                          <dd className="text-ink">{latestEntry.symptoms.join(", ")}</dd>
                        </div>
                      )}
                      {latestEntry.mood && (
                        <div className="flex items-start justify-between gap-3 border-b border-line pb-2">
                          <dt className="text-muted">Mood</dt>
                          <dd className="text-ink">{latestEntry.mood}</dd>
                        </div>
                      )}
                      {latestEntry.energy && (
                        <div className="flex items-start justify-between gap-3 border-b border-line pb-2">
                          <dt className="text-muted">Energy</dt>
                          <dd className="text-ink">{latestEntry.energy}</dd>
                        </div>
                      )}
                      {latestEntry.notes && (
                        <div className="flex items-start justify-between gap-3">
                          <dt className="text-muted">Private notes</dt>
                          <dd className="text-ink break-words">{latestEntry.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </PanelBody>
                </Panel>
              )}
            </Stack>

            <Stack>
              <Panel>
                <PanelBody>
                  <SectionHeading
                    title="Cycle history"
                    description={entriesWithMember.length ? `${entriesWithMember.length} entry${entriesWithMember.length === 1 ? "" : "s"} recorded.` : "No cycle entries yet."}
                  />
                  {entriesWithMember.length === 0 ? (
                    <EmptyState
                      icon={CalendarDays}
                      title="No cycle entries yet"
                      description="Add your first period start date to begin cycle tracking. Each entry is private to the selected family member."
                      compact
                    />
                  ) : (
                    <div className="space-y-2">
                      {entriesWithMember.slice(0, 20).map((entry) => (
                        <Link
                          key={entry.id}
                          href="#"
                          className="flex items-start gap-2.5 rounded-md border border-line p-2.5 hover:border-aqua-300 hover:bg-aqua-50/30"
                        >
                          <div className="mt-1 flex-shrink-0">
                            <CalendarDays size={13} aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.78rem] font-medium text-ink truncate">
                              {entry.memberName}
                            </p>
                            <p className="mt-0.5 text-[0.68rem] text-muted">
                              {formatDate(entry.startDateStr)}{" · "}
                              {entry.flow ? titleCase(entry.flow) : "Flow not recorded"}
                            </p>
                          </div>
                          <StatusBadge status={entry.flow ?? "unspecified"} />
                        </Link>
                      ))}
                      {entriesWithMember.length > 20 && (
                        <p className="mt-2 text-[0.68rem] text-muted">
                          Showing the most recent 20 entries.
                        </p>
                      )}
                    </div>
                  )}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelBody>
                  <SectionHeading title="Preferences" />
                  <p className="mb-3 text-[0.78rem] leading-5 text-muted">
                    Choose whether period predictions and reminders are shown. You can turn them off
                    at any time.
                  </p>
                  <ActionForm action={updateWomenHealthPreferencesAction} submitLabel="Save preferences">
                    <label className="check-row mb-3">
                      <input
                        type="checkbox"
                        name="predictionsEnabled"
                        defaultChecked={preferences?.[0]?.predictionsEnabled ?? true}
                      />
                      <span className="check-copy">
                        Show cycle predictions and estimates
                      </span>
                    </label>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        name="remindersEnabled"
                        defaultChecked={preferences?.[0]?.remindersEnabled ?? false}
                      />
                      <span className="check-copy">
                        Send cycle reminders (email/SMS only when configured)
                      </span>
                    </label>
                    {!emailConfigured() && !smsConfigured() && (
                      <InlineNotice tone="info" className="mt-3" title="Reminder delivery not configured">
                        Reminder preferences are saved, but no email or SMS provider is configured on
                        this server, so reminders will not be delivered yet.
                      </InlineNotice>
                    )}
                  </ActionForm>
                </PanelBody>
              </Panel>
            </Stack>
          </TwoColumn>

          <Panel>
            <PanelBody>
              <SectionHeading title="Revoke consent and data" />
              <p className="mb-3 text-[0.78rem] leading-5 text-[#6b3b42]">
                Revoking consent hides this section. Existing entries remain in your account until you
                delete them individually or delete your account.
              </p>
              <ActionForm action={revokeWomensHealthConsentAction} submitLabel="Revoke cycle-tracking consent" submitClassName="btn-danger-outline">
                <p className="text-[0.68rem] leading-4 text-[#6b3b42]">
                  This cannot be undone for future entries. Re-enable tracking in privacy settings if
                  you change your mind.
                </p>
              </ActionForm>
            </PanelBody>
          </Panel>
        </>
      )}

      <Panel className="border-[#e7b9be] bg-[#fffafa]">
        <PanelBody>
          <SectionHeading title="What this section does not do" />
          <ul className="space-y-2 text-[0.78rem] leading-5 text-[#6b3b42]">
            <li>
              It does not diagnose pregnancy, fertility, or any medical condition from cycle dates.
            </li>
            <li>
              It does not predict ovulation or fertile windows with certainty.
            </li>
            <li>
              It is not contraception and should not be used to prevent or plan pregnancy.
            </li>
            <li>
              It never shares cycle data in family dashboards or notifications unless you explicitly
              choose to include it in an SOS health summary.
            </li>
          </ul>
        </PanelBody>
      </Panel>
    </div>
  );
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function gapText(count: number) {
  return count === 1 ? "" : "s";
}
