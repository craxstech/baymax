import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { FileText, FolderLock, ShieldCheck, Sparkles, Upload } from "lucide-react";
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
  Stat,
  StatusBadge,
  UnavailableBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { MemberFilter } from "@/components/app-controls";
import { getDb } from "@/db";
import { medicalReports } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccessibleMembers } from "@/lib/authorization";
import { aiConfigured, ocrConfigured, serverConfig } from "@/lib/config";
import { storageDescription } from "@/lib/storage";
import { hasActiveConsent } from "@/lib/consents";
import { formatDate, todayInZone } from "@/lib/utils";
import { uploadReportAction } from "@/app/actions/reports";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; uploaded?: string }>;
}) {
  const user = await requireUser("/app/reports");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId =
    params.member && accessible.some((row) => row.member.id === params.member) ? params.member : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const db = await getDb();

  const [reports, totals, aiConsent] = await Promise.all([
    db
      .select()
      .from(medicalReports)
      .where(inArray(medicalReports.memberId, selectedMemberId ? [selectedMemberId] : scopeIds))
      .orderBy(desc(medicalReports.reportDate), desc(medicalReports.createdAt))
      .limit(120),
    db
      .select({
        total: count(),
        analyzed: sql<number>`count(*) filter (where ${medicalReports.status} = 'AI_ANALYSIS_READY')::int`,
        extractionIssues: sql<number>`count(*) filter (where ${medicalReports.status} in ('OCR_UNAVAILABLE', 'FAILED'))::int`,
      })
      .from(medicalReports)
      .where(and(inArray(medicalReports.memberId, scopeIds))),
    hasActiveConsent(user.id, "AI_PROCESSING"),
  ]);

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const memberById = new Map(accessible.map((row) => [row.member.id, row]));
  const managed = accessible.filter((row) => row.access.canManage);
  const defaultMemberId = selectedMemberId && managed.some((row) => row.member.id === selectedMemberId)
    ? selectedMemberId
    : managed[0]?.member.id ?? "";
  const today = todayInZone(user.timezone);

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumbs items={[{ label: "Care", href: "/app" }, { label: "Reports" }]} />}
        title="Reports"
        description="Keep the original report private, review extracted text, and ask for a cautious AI explanation only when you choose to."
        action={
          <Link className="btn btn-secondary" href="/app/settings/privacy">
            <ShieldCheck size={15} aria-hidden="true" /> AI privacy
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Reports stored" value={Number(totals[0]?.total ?? 0)} icon={FileText} />
        <Stat
          label="AI explanations"
          value={Number(totals[0]?.analyzed ?? 0)}
          detail={aiConfigured() ? "Provider configured" : "Provider not configured"}
          icon={Sparkles}
          accent="info"
        />
        <Stat
          label="Extraction issues"
          value={Number(totals[0]?.extractionIssues ?? 0)}
          detail="Image OCR may require a provider."
          icon={FolderLock}
          accent="warn"
        />
        <Stat
          label="Storage"
          value={storageDescription()}
          detail={`Maximum upload ${Math.round(serverConfig.uploadMaxBytes / (1024 * 1024))} MB`}
          icon={ShieldCheck}
        />
      </div>

      <div className="mb-5">
        <MemberFilter
          members={members}
          current={selectedMemberId}
          basePath="/app/reports"
          label="Filter by profile"
        />
      </div>

      <TwoColumn>
        <Stack>
          {managed.length > 0 ? (
            <DisclosurePanel
              summary="Upload a report"
              description="Add a PDF or image of a lab, imaging, discharge, or consultation report. It is stored privately and is never shared automatically."
              defaultOpen={params.uploaded === "1"}
            >
              <ActionForm action={uploadReportAction} submitLabel="Upload report">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Family member" name="memberId">
                    <select className="select" id="field-memberId" name="memberId" defaultValue={defaultMemberId} required>
                      {managed.map((row) => (
                        <option key={row.member.id} value={row.member.id}>
                          {row.member.name}
                          {row.member.isSelf ? " (you)" : ` · ${row.member.relationship}`}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Report date" name="reportDate">
                    <input
                      className="input"
                      id="field-reportDate"
                      name="reportDate"
                      type="date"
                      defaultValue={today}
                      max={today}
                      required
                    />
                  </FormField>
                  <FormField label="Title" name="title" className="sm:col-span-2">
                    <input
                      className="input"
                      id="field-title"
                      name="title"
                      maxLength={160}
                      placeholder="e.g. Complete blood count — October"
                      required
                    />
                  </FormField>
                  <FormField label="Category" name="category">
                    <select className="select" id="field-category" name="category" defaultValue="lab">
                      <option value="lab">Laboratory</option>
                      <option value="imaging">Imaging</option>
                      <option value="discharge">Discharge summary</option>
                      <option value="consultation">Consultation note</option>
                      <option value="other">Other</option>
                    </select>
                  </FormField>
                  <FormField
                    label="Report file"
                    name="file"
                    hint="PDF, JPG, PNG, or WebP. Text extraction works best with text-based PDFs."
                  >
                    <input
                      className="input py-2"
                      id="field-file"
                      name="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      required
                    />
                  </FormField>
                </div>
                <InlineNotice tone="info" title="AI is not automatic">
                  Uploading stores the file and extracts text. AI analysis only runs when you press the
                  analyze button on the report, and only if AI processing consent is active.
                </InlineNotice>
              </ActionForm>
            </DisclosurePanel>
          ) : (
            <InlineNotice tone="info" title="View-only report access">
              You can read reports for profiles you can access. Uploading and deleting reports requires
              manage permission.
            </InlineNotice>
          )}

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Stored reports"
                description={`${reports.length} ${reports.length === 1 ? "report" : "reports"} shown. Files are private and each download link expires.`}
                action={
                  <div className="flex items-center gap-2">
                    {!aiConfigured() && <UnavailableBadge />}
                  </div>
                }
              />
              {reports.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No reports stored yet"
                  description="Upload a report to keep the original file private and review extracted text in one place."
                  action={
                    managed.length > 0 ? (
                      <Link className="btn btn-secondary btn-sm" href={`/app/reports?uploaded=1${selectedMemberId ? `&member=${selectedMemberId}` : ""}`}>
                        Upload a report
                      </Link>
                    ) : undefined
                  }
                  compact
                />
              ) : (
                <div>
                  {reports.map((report) => {
                    const member = memberById.get(report.memberId);
                    return (
                      <Link
                        key={report.id}
                        href={`/app/reports/${report.id}`}
                        className="care-row items-center"
                      >
                        <span className="icon-tile icon-tile-sm">
                          <FileText size={13} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.82rem] font-medium text-ink">{report.title}</p>
                          <p className="text-[0.68rem] text-muted">
                            {member?.member.name ?? "Family member"} · {formatDate(report.reportDate)} ·{" "}
                            {report.category.replaceAll("_", " ")}
                          </p>
                        </div>
                        <StatusBadge status={report.status} />
                      </Link>
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
              <SectionHeading title="How report analysis works" />
              <ol className="space-y-3 text-[0.78rem] leading-5 text-[#52666e]">
                <li>
                  <span className="font-semibold text-ink">1. Private upload.</span> The original file
                  enters private storage. Download links are signed and expire after ten minutes.
                </li>
                <li>
                  <span className="font-semibold text-ink">2. Text extraction.</span> Text-based PDFs
                  are read on the server. Images need a separately configured OCR provider.
                </li>
                <li>
                  <span className="font-semibold text-ink">3. Optional AI explanation.</span> A request
                  is sent only after you choose it and have AI processing consent. The response is
                  validated before anything is saved.
                </li>
                <li>
                  <span className="font-semibold text-ink">4. Clinician review.</span> AI text is
                  informational. It does not diagnose, rule out, or replace a clinician&apos;s review.
                </li>
              </ol>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Integration status" />
              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Private file storage</dt>
                  <dd><StatusBadge status="active" label="Ready" /></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Image OCR</dt>
                  <dd>{ocrConfigured() ? <StatusBadge status="active" label="Configured" /> : <UnavailableBadge />}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">AI provider</dt>
                  <dd>{aiConfigured() ? <StatusBadge status="active" label="Configured" /> : <UnavailableBadge />}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">AI consent</dt>
                  <dd>{aiConsent ? <StatusBadge status="active" label="Granted" /> : <StatusBadge status="unverified" label="Not granted" />}</dd>
                </div>
              </dl>
              {!aiConfigured() ? (
                <InlineNotice tone="warning" className="mt-3">
                  Reports can still be uploaded, retained, and read. AI explanation stays unavailable
                  until the server has an AI provider configured. No sample analysis is shown.
                </InlineNotice>
              ) : null}
              <Link className="btn btn-secondary btn-sm mt-3" href="/app/settings/privacy">
                Review privacy settings
              </Link>
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <SectionHeading title="If a result looks urgent" />
              <p className="text-[0.78rem] leading-5 text-[#6b3b42]">
                Do not wait for an AI explanation. Contact the clinician or hospital that ordered the
                test, or call your local emergency number if someone is in immediate danger.
              </p>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
