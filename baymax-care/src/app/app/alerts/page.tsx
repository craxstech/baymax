import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, isNull, inArray } from "drizzle-orm";
import {
  PhoneCall,
  ShieldCheck,
  Siren,
  Trash2,
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
import { SosLocationFields } from "@/components/app-controls";
import { getDb } from "@/db";
import {
  emergencyContacts,
  sosAlerts,
  alertDeliveries,
  familyMembers,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  permissionMessage,
  requireMemberAccess,
  getAccessibleMembers,
} from "@/lib/authorization";
import { brand, emailConfigured, smsConfigured } from "@/lib/config";
import {
  addEmergencyContactAction,
  deleteEmergencyContactAction,
  sendSosAction,
  requestAmbulanceAction,
} from "@/app/actions/alerts";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Emergency & SOS" };

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; sos?: string }>;
}) {
  const user = await requireUser("/app/alerts");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId =
    params.member && accessible.some((row) => row.member.id === params.member)
      ? params.member
      : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-000000000000"];
  const db = await getDb();

  const [contacts, alerts] = await Promise.all([
    db
      .select()
      .from(emergencyContacts)
      .where(
        selectedMemberId
          ? eq(emergencyContacts.memberId, selectedMemberId)
          : inArray(emergencyContacts.memberId, scopeIds),
      )
      .orderBy(desc(emergencyContacts.isPrimary), asc(emergencyContacts.createdAt)),
    db
      .select()
      .from(sosAlerts)
      .where(
        selectedMemberId
          ? eq(sosAlerts.memberId, selectedMemberId)
          : inArray(sosAlerts.memberId, scopeIds),
      )
      .orderBy(desc(sosAlerts.createdAt))
      .limit(40),
  ]);

  const deliveries = await db
    .select()
    .from(alertDeliveries)
    .where(
      inArray(
        alertDeliveries.alertId,
        alerts.map((a) => a.id),
      ),
    )
    .orderBy(desc(alertDeliveries.attemptedAt));

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

  const deliveriesByAlert = new Map<string, typeof deliveries>();
  for (const d of deliveries) {
    const list = deliveriesByAlert.get(d.alertId) ?? [];
    list.push(d);
    deliveriesByAlert.set(d.alertId, list);
  }

  const hasContacts = contacts.length > 0;
  const smsReady = smsConfigured();
  const emailReady = emailConfigured();

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs items={[
            { label: "Care", href: "/app" },
            { label: "Emergency & SOS" },
          ]} />
        }
        title="Emergency contacts & SOS"
        description={
          "Store emergency contacts for a family member and record SOS alerts. " +
          "Alerts are sent through configured email and SMS channels. This app never dispatches an ambulance."
        }
        action={
          <>
            <Link className="btn btn-secondary" href="/emergency">
              <ShieldCheck size={15} aria-hidden="true" /> Emergency info
            </Link>
            <a
              className="btn btn-danger"
              href={`tel:${brand.emergencyNumber}`}
              aria-label={`Call emergency number ${brand.emergencyNumber}`}
            >
              <PhoneCall size={15} aria-hidden="true" /> Call {brand.emergencyNumber}
            </a>
          </>
        }
      />

      <InlineNotice tone="warning" className="mb-5" title="This is not an emergency-services dispatch">
        Baymax Care can notify the emergency contacts you choose. It cannot call an ambulance, contact
        emergency services, or guarantee that a contact is reached. For immediate danger, call{" "}
        <a className="font-semibold underline underline-offset-2" href={`tel:${brand.emergencyNumber}`}>
          {brand.emergencyNumber}
        </a>{" "}
        or your local emergency number first.
      </InlineNotice>

      <TwoColumn>
        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Emergency contacts" />
              {managed.length > 0 ? (
                <>
                  <ActionForm action={addEmergencyContactAction} submitLabel="Add emergency contact">
                    <FormField label="Family member" name="memberId">
                      <select
                        className="select"
                        id="field-alerts-memberId"
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
                    <FormField label="Contact name" name="name">
                      <input
                        className="input"
                        id="field-contact-name"
                        name="name"
                        placeholder="e.g. Ramesh Sharma"
                        required
                      />
                    </FormField>
                    <FormField label="Relationship" name="relationship">
                      <input
                        className="input"
                        id="field-contact-relationship"
                        name="relationship"
                        placeholder="e.g. Spouse, Parent, Friend"
                        required
                      />
                    </FormField>
                    <FormField label="Phone" name="phone">
                      <input
                        className="input"
                        id="field-contact-phone"
                        name="phone"
                        placeholder="+91 98765 43210"
                        required
                      />
                    </FormField>
                    <FormField label="Email" name="email" optional>
                      <input
                        className="input"
                        id="field-contact-email"
                        name="email"
                        type="email"
                        placeholder="contact@example.com"
                      />
                    </FormField>
                    <label className="check-row mb-2">
                      <input type="checkbox" name="isPrimary" defaultChecked={!hasContacts} />
                      <span className="check-copy">
                        Make this the primary contact
                      </span>
                    </label>
                    <label className="check-row mb-2">
                      <input type="checkbox" name="consentToContact" defaultChecked />
                      <span className="check-copy">
                        This contact agrees to be contacted in an emergency
                      </span>
                    </label>
                    <label className="check-row">
                      <input type="checkbox" name="consentToShareHealth" />
                      <span className="check-copy">
                        This contact may receive a health summary with the alert
                      </span>
                    </label>
                    <p className="text-[0.68rem] leading-4 text-muted">
                      Health information is only shared when you check the box above and choose to
                      share it when sending an SOS.
                    </p>
                  </ActionForm>
                </>
              ) : (
                <InlineNotice tone="info" title="Manage permission required">
                  You need manage permission for a family member to add emergency contacts. Add a
                  family member first, or ask the account owner to grant you access.
                </InlineNotice>
              )}

              {contacts.length > 0 && (
                <PanelBody className="mt-5">
                  <SectionHeading title="Saved contacts" />
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <Link
                        key={contact.id}
                        href="#"
                        className="flex items-start justify-between gap-2.5 rounded-md border border-line p-2.5 hover:border-aqua-300 hover:bg-aqua-50/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="text-[0.78rem] font-medium text-ink truncate">
                              {contact.name}
                            </p>
                            {contact.isPrimary && (
                              <span className="badge badge-info text-[0.62rem]">Primary</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[0.68rem] text-muted">
                            {contact.relationship}{" · "}
                            {contact.phone}{" · "}
                            {contact.email ?? "No email"}
                          </p>
                          <p className="mt-1 text-[0.64rem] text-muted">
                            {contact.consentToShareHealth
                              ? "May receive health summary in alerts"
                              : "Contact only — no health summary"}
                          </p>
                        </div>
                        <ActionForm
                          action={deleteEmergencyContactAction}
                          submitLabel="Remove"
                          submitClassName="btn-danger-outline btn-sm"
                          secondarySubmit={null}
                          hideSubmit
                          footer={
                            <button
                              type="submit"
                              className="btn btn-danger-outline btn-sm"
                              aria-label={`Remove ${contact.name} as emergency contact`}
                              onClick={(e) => {
                                if (!window.confirm("Remove this emergency contact?")) e.preventDefault();
                              }}
                            >
                              <Trash2 size={12} aria-hidden="true" />
                            </button>
                          }
                        >
                          <input type="hidden" name="contactId" value={contact.id} />
                          <input type="hidden" name="memberId" value={contact.memberId} />
                        </ActionForm>
                      </Link>
                    ))}
                  </div>
                </PanelBody>
              )}
            </PanelBody>
          </Panel>

          {!smsReady && !emailReady && (
            <Panel className="border-[#e7b9be] bg-[#fffafa]">
              <PanelBody>
                <SectionHeading title="No alert delivery channels configured" />
                <p className="text-[0.78rem] leading-5 text-[#6b3b42]">
                  Neither SMS nor email is configured on this server. You can still save emergency
                  contacts and record SOS alerts, but no external message will be sent. Configure
                  TWILIO_* and/or SMTP_* variables to enable delivery.
                </p>
              </PanelBody>
            </Panel>
          )}
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Send an SOS alert" />
              <p className="mb-3 text-[0.78rem] leading-5 text-muted">
                Choose a family member, optionally attach your location, and record an SOS. The alert
                is delivered to that member&apos;s emergency contacts through the configured channels.
              </p>
              {managed.length > 0 ? (
                <ActionForm action={sendSosAction} submitLabel="Send SOS alert">
                  <FormField label="Family member" name="memberId">
                    <select
                      className="select"
                      id="field-sos-memberId"
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
                  <FormField label="Message" name="message" optional hint="A short message to your contacts, e.g. I need help, please call me">
                    <textarea
                      className="textarea"
                      id="field-sos-message"
                      name="message"
                      rows={2}
                      maxLength={500}
                    />
                  </FormField>
                  <SosLocationFields />
                  <label className="check-row mb-2">
                    <input type="checkbox" name="shareHealthSummary" />
                    <span className="check-copy">
                      Include a private health summary (allergies, conditions, current medicines)
                    </span>
                  </label>
                  <p className="text-[0.68rem] leading-4 text-muted">
                    Health summaries are only sent to contacts who have agreed to receive them. This
                    alert does not dispatch emergency services.
                  </p>
                  {!smsReady && !emailReady && (
                    <InlineNotice tone="warning" className="mt-3" title="No delivery channel available">
                      No SMS or email provider is configured, so this SOS will not reach any external
                      contact. Call {brand.emergencyNumber} directly.
                    </InlineNotice>
                  )}
                </ActionForm>
              ) : (
                <InlineNotice tone="info" title="Manage permission required">
                  You need manage permission for a family member to send an SOS for them.
                </InlineNotice>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Request ambulance through partner" />
              <p className="mb-3 text-[0.78rem] leading-5 text-muted">
                If an ambulance partner is configured for this deployment, a request can be sent with
                the member&apos;s name and location. Otherwise, use the phone number above.
              </p>
              {managed.length > 0 ? (
                <ActionForm action={requestAmbulanceAction} submitLabel="Request ambulance">
                  <FormField label="Family member" name="memberId">
                    <select
                      className="select"
                      id="field-ambulance-memberId"
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
                  <FormField label="Note" name="note" optional hint="Additional information for the ambulance partner">
                    <input
                      className="input"
                      id="field-ambulance-note"
                      name="note"
                      placeholder="e.g. Chest pain, conscious, breathing"
                      maxLength={500}
                    />
                  </FormField>
                  <SosLocationFields />
                  <p className="text-[0.68rem] leading-4 text-muted">
                    A precise location is required. Without a configured partner, no request is sent
                    and you are advised to call {brand.emergencyNumber} directly.
                  </p>
                </ActionForm>
              ) : (
                <InlineNotice tone="info" title="Manage permission required">
                  You need manage permission for a family member to request an ambulance.
                </InlineNotice>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Recent SOS alerts" />
              {alerts.length === 0 ? (
                <EmptyState
                  icon={Siren}
                  title="No SOS alerts yet"
                  description="Sent alerts and their delivery status appear here."
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => {
                    const alertDeliveries = deliveriesByAlert.get(alert.id) ?? [];
                    const sent = alertDeliveries.filter((d) => d.status === "SENT").length;
                    const failed = alertDeliveries.filter((d) => d.status === "FAILED").length;
                    const unavailable = alertDeliveries.filter(
                      (d) => d.status === "UNAVAILABLE",
                    ).length;
                    return (
                      <Link
                        key={alert.id}
                        href="#"
                        className="flex items-start gap-2.5 rounded-md border border-line p-2.5 hover:border-aqua-300 hover:bg-aqua-50/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.78rem] font-medium text-ink truncate">
                            SOS for {memberById.get(alert.memberId)?.name ?? "Family member"}
                          </p>
                          <p className="mt-0.5 text-[0.68rem] text-muted">
                            {formatDateTime(alert.createdAt, user.timezone)} ·{" "}
                            {alert.status.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-[0.64rem] text-muted">
                            {sent} delivered{failed > 0 ? ` · ${failed} failed` : ""}{unavailable > 0 ? ` · ${unavailable} unavailable` : ""}
                          </p>
                        </div>
                        <StatusBadge status={alert.status} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
