import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import {
  ClipboardList,
  Download,
  FileLock2,
  FileText,
  Pill,
  Plus,
  ShieldAlert,
  ShieldCheck,
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
import { MemberFilter } from "@/components/app-controls";
import { getDb } from "@/db";
import { files, prescriptionEvents, prescriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccessibleMembers } from "@/lib/authorization";
import { createSignedFilePath } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/utils";
import { createPrescriptionAction } from "@/app/actions/prescriptions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Prescriptions" };

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; added?: string }>;
}) {
  const user = await requireUser("/app/prescriptions");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId =
    params.member && accessible.some((row) => row.member.id === params.member) ? params.member : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const db = await getDb();

  const rows = await db
    .select({
      prescription: prescriptions,
      fileId: files.id,
      fileName: files.originalName,
    })
    .from(prescriptions)
    .leftJoin(files, eq(prescriptions.fileId, files.id))
    .where(inArray(prescriptions.memberId, selectedMemberId ? [selectedMemberId] : scopeIds))
    .orderBy(desc(prescriptions.issuedAt), desc(prescriptions.createdAt))
    .limit(120);

  const prescriptionIds = rows.map((row) => row.prescription.id);
  const events = prescriptionIds.length
    ? await db
        .select()
        .from(prescriptionEvents)
        .where(inArray(prescriptionEvents.prescriptionId, prescriptionIds))
        .orderBy(desc(prescriptionEvents.createdAt))
    : [];
  const eventsByPrescription = new Map<string, typeof events>();
  for (const event of events) {
    const list = eventsByPrescription.get(event.prescriptionId) ?? [];
    list.push(event);
    eventsByPrescription.set(event.prescriptionId, list);
  }

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const memberById = new Map(accessible.map((row) => [row.member.id, row]));
  const managed = accessible.filter((row) => row.access.canManage);
  const addMemberId = selectedMemberId && managed.some((row) => row.member.id === selectedMemberId)
    ? selectedMemberId
    : managed[0]?.member.id ?? "";

  const unverified = rows.filter((row) => row.prescription.status === "UNVERIFIED").length;
  const expired = rows.filter((row) => row.prescription.status === "EXPIRED").length;
  const withFiles = rows.filter((row) => row.fileId).length;

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumbs items={[{ label: "Care", href: "/app" }, { label: "Prescriptions" }]} />}
        title="Prescriptions"
        description="Record prescriptions from your own clinicians, attach a private copy, and build medicine schedules. Baymax Care does not verify a prescription unless a configured provider does."
        action={
          <>
            <Link className="btn btn-secondary" href="/app/medications">
              <Pill size={15} aria-hidden="true" /> Medications
            </Link>
            <Link className="btn btn-secondary" href="/app/orders">
              <ClipboardList size={15} aria-hidden="true" /> Orders
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Prescriptions" value={rows.length} icon={ClipboardList} />
        <Stat label="Unverified" value={unverified} detail="Recorded by you; not independently checked." icon={ShieldAlert} accent="warn" />
        <Stat label="Private copies" value={withFiles} detail={`${expired} expired`} icon={FileLock2} accent="info" />
        <Stat label="Verified" value={rows.filter((row) => row.prescription.status === "VERIFIED").length} detail="Only set by a configured provider or clinician process." icon={ShieldCheck} />
      </div>

      <div className="mb-5">
        <MemberFilter
          members={members}
          current={selectedMemberId}
          basePath="/app/prescriptions"
          label="Filter by profile"
        />
      </div>

      <TwoColumn>
        <Stack>
          {managed.length > 0 ? (
            <DisclosurePanel
              summary="Record a prescription"
              description="Enter the prescription details as written and, optionally, attach a photo or PDF. This does not verify the prescription."
              defaultOpen={params.added === "1" || rows.length === 0}
            >
              <ActionForm action={createPrescriptionAction} submitLabel="Record prescription">
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
                  <FormField label="Prescriber name" name="prescriberName">
                    <input
                      className="input"
                      id="field-prescriberName"
                      name="prescriberName"
                      maxLength={120}
                      placeholder="As written on the prescription"
                      required
                    />
                  </FormField>
                  <FormField label="Clinic or hospital" name="clinicName" optional className="sm:col-span-2">
                    <input className="input" id="field-clinicName" name="clinicName" maxLength={160} />
                  </FormField>
                  <FormField label="Issue date" name="issuedAt">
                    <input className="input" id="field-issuedAt" name="issuedAt" type="date" required />
                  </FormField>
                  <FormField label="Valid until" name="validUntil" optional>
                    <input className="input" id="field-validUntil" name="validUntil" type="date" />
                  </FormField>
                  <FormField
                    label="Private copy"
                    name="file"
                    optional
                    hint="PDF, JPG, PNG, or WebP. The file is stored privately and served through expiring links."
                    className="sm:col-span-2"
                  >
                    <input
                      className="input py-2"
                      id="field-file"
                      name="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    />
                  </FormField>
                </div>
                <InlineNotice tone="info" title="Status starts unverified">
                  The prescription is marked unverified until a configured clinician or pharmacy partner
                  verifies it. No verification is invented.
                </InlineNotice>
              </ActionForm>
            </DisclosurePanel>
          ) : (
            <InlineNotice tone="info" title="View-only prescription access">
              You can view prescriptions and their private file links where available. Recording a new
              prescription requires manage permission.
            </InlineNotice>
          )}

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Recorded prescriptions"
                description="Each private copy link is signed for your account and expires. Verification events are shown honestly."
              />
              {rows.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No prescriptions recorded"
                  description="Record a prescription from a clinician before adding a medicine schedule or ordering from a configured pharmacy."
                  compact
                />
              ) : (
                <div className="space-y-3">
                  {rows.map((row) => {
                    const prescription = row.prescription;
                    const member = memberById.get(prescription.memberId);
                    const canManage = Boolean(member?.access.canManage);
                    const eventsForPrescription = eventsByPrescription.get(prescription.id) ?? [];
                    return (
                      <article key={prescription.id} className="rounded-lg border border-line bg-white p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm font-semibold text-ink">{prescription.prescriberName}</h3>
                              <StatusBadge status={prescription.status} />
                            </div>
                            <p className="mt-1 text-[0.7rem] text-muted">
                              {member?.member.name ?? "Family member"} · issued {formatDate(prescription.issuedAt)}
                              {prescription.validUntil ? ` · valid until ${formatDate(prescription.validUntil)}` : ""}
                              {prescription.clinicName ? ` · ${prescription.clinicName}` : ""}
                            </p>
                          </div>
                          {row.fileId ? (
                            <a className="btn btn-secondary btn-sm" href={createSignedFilePath(row.fileId, user.id)}>
                              <Download size={12} aria-hidden="true" /> {row.fileName ?? "Private copy"}
                            </a>
                          ) : (
                            <span className="text-[0.66rem] text-muted">No file attached</span>
                          )}
                        </div>
                        {prescription.verificationNote ? (
                          <p className="mt-2 text-[0.72rem] leading-5 text-[#52666e]">{prescription.verificationNote}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {canManage ? (
                            <Link className="btn btn-quiet btn-sm" href={`/app/medications?member=${prescription.memberId}`}>
                              <Plus size={12} aria-hidden="true" /> Add a medicine schedule
                            </Link>
                          ) : null}
                          {row.fileId ? (
                            <span className="inline-flex items-center gap-1 text-[0.66rem] text-muted">
                              <FileLock2 size={11} aria-hidden="true" /> Private file
                            </span>
                          ) : null}
                        </div>
                        {eventsForPrescription.length > 0 ? (
                          <DisclosurePanel summary="Verification history" className="mt-3 border-0 shadow-none">
                            <ol className="space-y-2">
                              {eventsForPrescription.map((event) => (
                                <li key={event.id} className="flex gap-2 text-[0.72rem] leading-5 text-[#52666e]">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" aria-hidden="true" />
                                  <div>
                                    <p className="font-medium text-ink">
                                      {event.type.replaceAll("_", " ").toLowerCase()}
                                      <span className="font-normal text-muted"> · {formatDateTime(event.createdAt, user.timezone)}</span>
                                    </p>
                                    <p>{event.note}</p>
                                  </div>
                                </li>
                              ))}
                            </ol>
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
              <SectionHeading title="What verification means" />
              <p className="text-[0.78rem] leading-5 text-[#52666e]">
                A recorded prescription is your copy of clinical instructions. Baymax Care does not contact
                the prescriber unless a configured integration does so, and it does not decide whether a
                prescription is clinically appropriate.
              </p>
              <ul className="mt-3 space-y-2 text-[0.74rem] leading-5 text-[#52666e]">
                <li><span className="font-semibold text-ink">Unverified:</span> recorded by the account holder.</li>
                <li><span className="font-semibold text-ink">Verified:</span> accepted by a configured clinician or pharmacy process.</li>
                <li><span className="font-semibold text-ink">Rejected or expired:</span> not eligible for a new order.</li>
              </ul>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Privacy" />
              <p className="text-[0.78rem] leading-5 text-[#52666e]">
                Prescription files are private. Share them only with the clinician or pharmacy you intend
                to use. Download links expire and are bound to your signed-in account.
              </p>
              {withFiles > 0 ? (
                <p className="mt-2 text-[0.7rem] text-muted">
                  {withFiles} private {withFiles === 1 ? "copy" : "copies"} stored.
                </p>
              ) : null}
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <SectionHeading title="Medicine safety" />
              <p className="text-[0.78rem] leading-5 text-[#6b3b42]">
                Do not use an old prescription to obtain a medicine without checking with the prescriber or
                pharmacist. For an urgent reaction, call your local emergency number.
              </p>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
