import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Clock,
  Stethoscope,
  Video,
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
  InlineNotice,
  PageHeader,
  SectionHeading,
  Stat,
  StatusBadge,
  UnavailableBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { InlineAction, MemberFilter } from "@/components/app-controls";
import { getDb } from "@/db";
import { appointments } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth";
import { getAccessibleMembers } from "@/lib/authorization";
import { consultationConfigured } from "@/lib/config";
import { formatDateTime } from "@/lib/utils";
import { cancelConsultationAction, requestConsultationAction } from "@/app/actions/consultations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Consultations" };

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const user = await requireVerifiedUser("/app/consultations");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId =
    params.member && accessible.some((row) => row.member.id === params.member) ? params.member : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const managed = accessible.filter((row) => row.access.canManage);
  const addMemberId = selectedMemberId && managed.some((row) => row.member.id === selectedMemberId)
    ? selectedMemberId
    : managed[0]?.member.id ?? "";
  const db = await getDb();

  const rows = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, user.id),
        inArray(appointments.memberId, selectedMemberId ? [selectedMemberId] : scopeIds),
      ),
    )
    .orderBy(desc(appointments.scheduledAt))
    .limit(100);

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const memberById = new Map(accessible.map((row) => [row.member.id, row]));
  const configured = consultationConfigured();
  const upcoming = rows.filter(
    (row) => row.status === "REQUESTED" || row.status === "CONFIRMED",
  );

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumbs items={[{ label: "Care", href: "/app" }, { label: "Consultations" }]} />}
        title="Consultations"
        description="Request a consultation only through a configured clinician scheduling partner. The app never invents clinicians, availability, confirmations, or video links."
        action={
          <Link className="btn btn-secondary" href="/app/settings">
            <ClipboardList size={15} aria-hidden="true" /> Integration status
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Consultations" value={rows.length} icon={CalendarClock} />
        <Stat label="Upcoming" value={upcoming.length} detail="Requested or confirmed." icon={Clock} accent="info" />
        <Stat
          label="Scheduling partner"
          value={configured ? "Configured" : "Not configured"}
          detail={configured ? "Requests can be sent." : "Booking is disabled."}
          icon={Stethoscope}
          accent={configured ? "aqua" : "warn"}
        />
        <Stat
          label="Video links"
          value={rows.filter((row) => row.joinUrl).length}
          detail="Only links supplied by a provider are shown."
          icon={Video}
        />
      </div>

      <div className="mb-5">
        <MemberFilter
          members={members}
          current={selectedMemberId}
          basePath="/app/consultations"
          label="Filter by profile"
        />
      </div>

      <TwoColumn>
        <Stack>
          {!configured ? (
            <InlineNotice tone="warning" title="No consultation partner is configured">
              The consultation page is available, but no request can be sent. A real integration requires
              a clinician network, scheduling agreement, and server credentials (
              <code className="rounded bg-black/5 px-1">CONSULTATION_PROVIDER</code>,{" "}
              <code className="rounded bg-black/5 px-1">CONSULTATION_API_BASE_URL</code>,{" "}
              <code className="rounded bg-black/5 px-1">CONSULTATION_API_KEY</code>). No placeholder
              clinician or appointment is shown.
            </InlineNotice>
          ) : managed.length === 0 ? (
            <InlineNotice tone="info" title="View-only consultation access">
              Requesting a consultation requires manage permission for the family member.
            </InlineNotice>
          ) : (
            <DisclosurePanel
              summary="Request a consultation"
              description="Choose a time within the next 90 days. The request is not confirmed until the scheduling partner says so."
              defaultOpen={rows.length === 0}
            >
              <ActionForm action={requestConsultationAction} submitLabel="Send request">
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
                  <FormField label="Requested date and time" name="requestedAt">
                    <input
                      className="input"
                      id="field-requestedAt"
                      name="requestedAt"
                      type="datetime-local"
                      required
                    />
                  </FormField>
                  <FormField label="Visit type" name="kind">
                    <select className="select" id="field-kind" name="kind" defaultValue="VIDEO">
                      <option value="VIDEO">Video</option>
                      <option value="PHONE">Phone</option>
                      <option value="CHAT">Chat</option>
                    </select>
                  </FormField>
                  <FormField label="Reason for visit" name="notes" optional className="sm:col-span-2">
                    <textarea
                      className="textarea"
                      id="field-notes"
                      name="notes"
                      rows={3}
                      maxLength={1000}
                      placeholder="Briefly describe what you want help with. Do not include information you do not want shared."
                    />
                  </FormField>
                </div>
                <InlineNotice tone="info">
                  Times are interpreted in {user.timezone.replaceAll("_", " ")}. Partner availability,
                  clinician assignment, price, and confirmation are controlled by the partner.
                </InlineNotice>
              </ActionForm>
            </DisclosurePanel>
          )}

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Your consultations"
                description="Every status is exactly what the partner or this app recorded. Requested is not confirmed."
              />
              {rows.length === 0 ? (
                <InlineEmpty
                  title="No consultations"
                  description={
                    configured
                      ? "No request has been sent. Use the form above to ask the configured partner about availability."
                      : "No consultation partner is configured, so booking is unavailable."
                  }
                />
              ) : (
                <div>
                  {rows.map((appointment) => {
                    const member = memberById.get(appointment.memberId);
                    return (
                      <article key={appointment.id} className="care-row items-start">
                        <span className="icon-tile icon-tile-sm">
                          <Stethoscope size={13} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link className="text-[0.84rem] font-medium text-ink hover:text-aqua-700" href={`/app/consultations/${appointment.id}`}>
                              {member?.member.name ?? "Family member"}
                            </Link>
                            <StatusBadge status={appointment.status} />
                            <span className="badge badge-neutral">{appointment.kind.toLowerCase()}</span>
                          </div>
                          <p className="mt-0.5 text-[0.7rem] text-muted">
                            {formatDateTime(appointment.scheduledAt, user.timezone)}
                            {appointment.provider ? ` · provider ${appointment.provider}` : ""}
                          </p>
                          {appointment.notes ? (
                            <p className="mt-1 line-clamp-2 text-[0.72rem] leading-5 text-[#52666e]">
                              {appointment.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <Link className="btn btn-secondary btn-sm" href={`/app/consultations/${appointment.id}`}>
                            Open
                          </Link>
                          {appointment.providerAppointmentId &&
                          appointment.status !== "CANCELLED" &&
                          appointment.status !== "COMPLETED" ? (
                            <InlineAction
                              action={cancelConsultationAction}
                              fields={{ appointmentId: appointment.id }}
                              label="Cancel"
                              variant="quiet"
                              confirmMessage="Ask the scheduling partner to cancel this consultation?"
                            />
                          ) : null}
                        </div>
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
              <SectionHeading title="Integration status" />
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">Clinician scheduling</span>
                {configured ? <StatusBadge status="active" label="Configured" /> : <UnavailableBadge />}
              </div>
              <p className="mt-3 text-[0.76rem] leading-5 text-[#52666e]">
                This app has adapter code for a scheduling provider, but no provider account is included.
                That means no clinician roster, availability, price, or confirmation can be displayed.
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="What to expect" />
              <ul className="space-y-2.5 text-[0.78rem] leading-5 text-[#52666e]">
                <li className="flex gap-2">
                  <CalendarPlus size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  A request is sent to the partner. It is not a booking until confirmed.
                </li>
                <li className="flex gap-2">
                  <Video size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Join links and clinician details come only from the partner.
                </li>
                <li className="flex gap-2">
                  <Clock size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Cancellations are sent to the partner. If the partner cannot be reached, the app says so.
                </li>
              </ul>
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <SectionHeading title="Emergencies" />
              <p className="text-[0.78rem] leading-5 text-[#6b3b42]">
                Do not request a consultation for an emergency. Call your local emergency number now.
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
