import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  ExternalLink,
  FileText,
  Stethoscope,
  Video,
} from "lucide-react";
import {
  Breadcrumbs,
  InlineEmpty,
  KeyValue,
  Panel,
  PanelBody,
  Stack,
  TwoColumn,
} from "@/components/ui/app-ui";
import {
  InlineNotice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  UnavailableBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { InlineAction } from "@/components/app-controls";
import { getDb } from "@/db";
import { appointments } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth";
import { getMemberAccess } from "@/lib/authorization";
import { consultationConfigured } from "@/lib/config";
import { formatDateTime } from "@/lib/utils";
import { cancelConsultationAction } from "@/app/actions/consultations";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}): Promise<Metadata> {
  const user = await requireVerifiedUser("/app/consultations");
  const { consultationId } = await params;
  const db = await getDb();
  const [row] = await db
    .select({ memberId: appointments.memberId })
    .from(appointments)
    .where(and(eq(appointments.id, consultationId), eq(appointments.userId, user.id)))
    .limit(1);
  return { title: row ? "Consultation" : "Consultation not found" };
}

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
  const user = await requireVerifiedUser("/app/consultations");
  const { consultationId } = await params;
  const db = await getDb();
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, consultationId), eq(appointments.userId, user.id)))
    .limit(1);
  if (!appointment) notFound();
  const access = await getMemberAccess(user.id, appointment.memberId);
  if (!access) notFound();

  const cancelable =
    Boolean(appointment.providerAppointmentId) &&
    appointment.status !== "CANCELLED" &&
    appointment.status !== "COMPLETED";

  return (
    <div>
      <div className="mb-3">
        <Link className="inline-flex items-center gap-1 text-xs font-medium text-[#52666e] hover:text-aqua-700" href="/app/consultations">
          <ArrowLeft size={14} aria-hidden="true" /> All consultations
        </Link>
      </div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Consultations", href: "/app/consultations" },
              { label: access.member.name },
            ]}
          />
        }
        title={`Consultation for ${access.member.name}`}
        description="Details below come from the scheduling partner or from the request recorded in this app. A request is not a confirmation."
        action={<StatusBadge status={appointment.status} />}
      />

      <TwoColumn>
        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Appointment" />
              <dl className="grid gap-4 sm:grid-cols-2">
                <KeyValue label="Family member">{access.member.name}</KeyValue>
                <KeyValue label="Status"><StatusBadge status={appointment.status} /></KeyValue>
                <KeyValue label="Scheduled time">
                  {formatDateTime(appointment.scheduledAt, user.timezone)}
                </KeyValue>
                <KeyValue label="Visit type">{appointment.kind.toLowerCase()}</KeyValue>
                <KeyValue label="Time zone">{appointment.timezone.replaceAll("_", " ")}</KeyValue>
                <KeyValue label="Scheduling provider">{appointment.provider}</KeyValue>
                <KeyValue label="Provider reference">
                  {appointment.providerAppointmentId ?? <span className="text-muted">Not supplied</span>}
                </KeyValue>
                <KeyValue label="Requested">{formatDateTime(appointment.createdAt, user.timezone)}</KeyValue>
              </dl>
              {appointment.notes ? (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.055em] text-[#7c8c92]">
                    Reason for visit
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[0.82rem] leading-6 text-[#3e515a]">
                    {appointment.notes}
                  </p>
                </div>
              ) : null}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Join the consultation" />
              {appointment.joinUrl ? (
                <div>
                  <p className="text-[0.78rem] leading-5 text-[#52666e]">
                    The scheduling partner supplied this join link. Verify it belongs to the expected
                    provider before opening it.
                  </p>
                  <a
                    className="btn btn-primary mt-3"
                    href={appointment.joinUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Video size={15} aria-hidden="true" /> Open partner link
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <InlineEmpty
                  title="No join link available"
                  description="A link appears only when the configured scheduling partner supplies one. The app does not invent a video room."
                />
              )}
            </PanelBody>
          </Panel>

          {cancelable ? (
            <Panel>
              <PanelBody>
                <SectionHeading title="Cancel this consultation" />
                <p className="text-[0.78rem] leading-5 text-[#52666e]">
                  Cancellation is sent to the scheduling partner. If the partner cannot be reached, the
                  consultation stays as it is and an error is shown.
                </p>
                <div className="mt-3">
                  <ActionForm action={cancelConsultationAction} submitLabel="Cancel consultation" submitClassName="btn-danger-outline">
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                  </ActionForm>
                </div>
              </PanelBody>
            </Panel>
          ) : null}
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Provider status" />
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">Scheduling integration</span>
                {consultationConfigured() ? (
                  <StatusBadge status="active" label="Configured" />
                ) : (
                  <UnavailableBadge />
                )}
              </div>
              <p className="mt-3 text-[0.76rem] leading-5 text-[#52666e]">
                {consultationConfigured()
                  ? "Requests and cancellations are sent through the configured partner. Any failure is reported without inventing success."
                  : "No partner is currently configured. This record remains readable, but new requests and cancellations cannot be sent."}
              </p>
              {appointment.followUp ? (
                <p className="mt-2 text-[0.72rem] text-[#52666e]">{appointment.followUp}</p>
              ) : null}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Before the visit" />
              <ul className="space-y-2 text-[0.78rem] leading-5 text-[#52666e]">
                <li className="flex gap-2">
                  <FileText size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Write down your main question and when symptoms started.
                </li>
                <li className="flex gap-2">
                  <Clock size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Join a few minutes early and check your connection, microphone, and privacy.
                </li>
                <li className="flex gap-2">
                  <Stethoscope size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Have current medicines and recent reports available if you choose to share them.
                </li>
              </ul>
              <Link className="btn btn-secondary btn-sm mt-3" href="/app/medical-history">
                <CalendarClock size={13} aria-hidden="true" /> Review health history
              </Link>
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <SectionHeading title="Not for emergencies" />
              <p className="text-[0.78rem] leading-5 text-[#6b3b42]">
                If someone is in immediate danger, call your local emergency number instead of waiting for
                a consultation.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="btn btn-danger-outline btn-sm" href="/emergency">
                  Emergency guidance
                </Link>
                <InlineAction
                  action={cancelConsultationAction}
                  fields={{ appointmentId: appointment.id }}
                  label="Cancel request"
                  variant="quiet"
                  className={cancelable ? "hidden" : ""}
                />
              </div>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
