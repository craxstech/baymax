import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Lock,
  Plus,
  Sparkles,
  Trash2,
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
  PageHeader,
  SectionHeading,
  Stat,
  StatusBadge,
  UnavailableBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { InlineAction } from "@/components/app-controls";
import { getDb } from "@/db";
import { files, medicalReports, reportFindings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getMemberAccess } from "@/lib/authorization";
import { hasActiveConsent } from "@/lib/consents";
import { aiConfigured } from "@/lib/config";
import { createSignedFilePath } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  addReportFindingAction,
  analyzeReportAction,
  deleteReportAction,
  deleteReportFindingAction,
} from "@/app/actions/reports";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reportId: string }>;
}): Promise<Metadata> {
  const user = await requireUser("/app/reports");
  const { reportId } = await params;
  const db = await getDb();
  const [report] = await db
    .select({ title: medicalReports.title, memberId: medicalReports.memberId })
    .from(medicalReports)
    .where(eq(medicalReports.id, reportId))
    .limit(1);
  if (!report) return { title: "Report" };
  const access = await getMemberAccess(user.id, report.memberId);
  return { title: access ? report.title : "Report" };
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const user = await requireUser("/app/reports");
  const { reportId } = await params;
  const db = await getDb();

  const [report] = await db
    .select({
      report: medicalReports,
      file: files,
    })
    .from(medicalReports)
    .leftJoin(files, eq(medicalReports.fileId, files.id))
    .where(eq(medicalReports.id, reportId))
    .limit(1);

  if (!report) notFound();
  const access = await getMemberAccess(user.id, report.report.memberId);
  if (!access) notFound();

  const [findings, aiConsent] = await Promise.all([
    db
      .select()
      .from(reportFindings)
      .where(eq(reportFindings.reportId, reportId))
      .orderBy(asc(reportFindings.sortOrder), asc(reportFindings.createdAt)),
    hasActiveConsent(user.id, "AI_PROCESSING"),
  ]);

  const canManage = access.access.canManage;
  const file = report.file;
  const downloadPath = file ? createSignedFilePath(file.id, user.id) : null;
  const abnormal = findings.filter((finding) => finding.flag !== "NORMAL" && finding.flag !== "UNKNOWN").length;
  const canAnalyze =
    canManage &&
    Boolean(report.report.extractedText && report.report.extractedText.trim().length >= 20) &&
    aiConfigured() &&
    aiConsent;

  return (
    <div>
      <div className="mb-3">
        <Link className="inline-flex items-center gap-1 text-xs font-medium text-[#52666e] hover:text-aqua-700" href="/app/reports">
          <ArrowLeft size={14} aria-hidden="true" /> All reports
        </Link>
      </div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Reports", href: "/app/reports" },
              { label: report.report.title },
            ]}
          />
        }
        title={report.report.title}
        description={`${access.member.name} · ${formatDate(report.report.reportDate)} · ${report.report.category.replaceAll("_", " ")}. The original file stays private.`}
        action={
          <>
            <StatusBadge status={report.report.status} />
            {downloadPath ? (
              <a className="btn btn-secondary" href={downloadPath}>
                <Download size={15} aria-hidden="true" /> Download file
              </a>
            ) : null}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Findings" value={findings.length} icon={FileText} />
        <Stat
          label="Flagged values"
          value={abnormal}
          detail="As recorded in the report or added by you."
          icon={AlertTriangle}
          accent={abnormal > 0 ? "warn" : "aqua"}
        />
        <Stat
          label="Text extraction"
          value={report.report.extractedText ? "Available" : "Not available"}
          detail={report.report.limitations ?? "No extraction note."}
          icon={Lock}
          accent="info"
        />
        <Stat
          label="AI explanation"
          value={report.report.aiSummary ? "Saved" : aiConfigured() ? "Not requested" : "Unavailable"}
          detail={report.report.analysisModel ?? "No model output stored."}
          icon={Sparkles}
        />
      </div>

      <TwoColumn>
        <Stack>
          {report.report.errorMessage ? (
            <InlineNotice tone="warning" title="Extraction or analysis note">
              {report.report.errorMessage}
            </InlineNotice>
          ) : null}

          {report.report.aiSummary ? (
            <Panel>
              <PanelBody>
                <SectionHeading
                  title="AI explanation"
                  description={
                    report.report.analyzedAt
                      ? `Saved ${formatDateTime(report.report.analyzedAt, user.timezone)} · ${report.report.analysisModel ?? "model not recorded"}`
                      : "Saved AI explanation"
                  }
                  action={<StatusBadge status={report.report.status} />}
                />
                <div className="chat-markdown text-[0.86rem] leading-6 text-[#3e515a]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                    {report.report.aiSummary}
                  </ReactMarkdown>
                </div>
                {report.report.limitations ? (
                  <InlineNotice tone="warning" className="mt-4" title="Limitations">
                    <span className="whitespace-pre-line">{report.report.limitations}</span>
                  </InlineNotice>
                ) : null}
                <p className="mt-3 text-[0.7rem] leading-5 text-muted">
                  AI explanations can be wrong, incomplete, or out of date. They do not diagnose or rule
                  out any condition. A qualified clinician must interpret the original report.
                </p>
              </PanelBody>
            </Panel>
          ) : null}

          <Panel>
            <PanelBody>
              <SectionHeading
                title="Recorded findings"
                description="Values shown here are extracted from AI output or entered by you. The original report remains the source of truth."
                action={
                  canManage ? (
                    <DisclosurePanel summary="Add finding" className="border-0 shadow-none">
                      <div className="w-[min(82vw,460px)]">
                        <ActionForm action={addReportFindingAction} submitLabel="Add finding">
                          <input type="hidden" name="reportId" value={report.report.id} />
                          <input type="hidden" name="memberId" value={report.report.memberId} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="Test or finding" name="name" className="sm:col-span-2">
                              <input className="input" id="field-name" name="name" maxLength={200} required />
                            </FormField>
                            <FormField label="Value" name="value">
                              <input className="input" id="field-value" name="value" maxLength={200} required />
                            </FormField>
                            <FormField label="Unit" name="unit" optional>
                              <input className="input" id="field-unit" name="unit" maxLength={60} />
                            </FormField>
                            <FormField label="Reference range" name="referenceRange" optional>
                              <input className="input" id="field-referenceRange" name="referenceRange" maxLength={160} />
                            </FormField>
                            <FormField label="Flag" name="flag">
                              <select className="select" id="field-flag" name="flag" defaultValue="UNKNOWN">
                                <option value="UNKNOWN">Unknown</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="LOW">Low</option>
                                <option value="ABNORMAL">Abnormal</option>
                              </select>
                            </FormField>
                            <FormField label="Your explanation" name="explanation" optional className="sm:col-span-2">
                              <textarea className="textarea" id="field-explanation" name="explanation" rows={2} maxLength={1200} />
                            </FormField>
                          </div>
                        </ActionForm>
                      </div>
                    </DisclosurePanel>
                  ) : undefined
                }
              />
              {findings.length === 0 ? (
                <InlineEmpty
                  title="No findings recorded"
                  description="Run an available AI explanation or add values manually. A blank list does not mean the report is normal."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Finding</th>
                        <th>Value</th>
                        <th>Reference</th>
                        <th>Flag</th>
                        <th><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {findings.map((finding) => (
                        <tr key={finding.id}>
                          <td>
                            <p className="font-medium text-ink">{finding.name}</p>
                            {finding.explanation ? (
                              <p className="mt-0.5 max-w-sm text-[0.7rem] leading-4 text-muted">{finding.explanation}</p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap">
                            {finding.value}
                            {finding.unit ? ` ${finding.unit}` : ""}
                          </td>
                          <td className="text-muted">{finding.referenceRange ?? "—"}</td>
                          <td><StatusBadge status={finding.flag} /></td>
                          <td>
                            {canManage ? (
                              <InlineAction
                                action={deleteReportFindingAction}
                                fields={{ findingId: finding.id, reportId: report.report.id, memberId: report.report.memberId }}
                                label="Remove"
                                variant="quiet"
                                confirmMessage={`Remove the finding "${finding.name}"?`}
                              />
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Extracted report text" description="Extracted text can be incomplete or misordered. Always compare it with the original file." />
              {report.report.extractedText ? (
                <DisclosurePanel summary="Show extracted text" description={`${report.report.extractedText.length.toLocaleString("en-IN")} characters stored privately in this record.`}>
                  <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-[#fbfdfd] p-3 font-mono text-[0.7rem] leading-5 text-[#52666e]">
                    {report.report.extractedText}
                  </pre>
                </DisclosurePanel>
              ) : (
                <InlineEmpty
                  title="No readable text was extracted"
                  description="The original file is still stored privately. Text-based PDFs work best; image reports require a configured OCR provider."
                />
              )}
            </PanelBody>
          </Panel>

          {canManage ? (
            <DisclosurePanel
              summary="Delete this report"
              tone="danger"
              description="Deletes the database record, extracted text, findings, and the private stored file."
            >
              <ActionForm action={deleteReportAction} submitLabel="Delete report" submitClassName="btn-danger">
                <input type="hidden" name="reportId" value={report.report.id} />
                <input type="hidden" name="memberId" value={report.report.memberId} />
                <InlineNotice tone="danger" title="Deletion is permanent">
                  Type DELETE to confirm. There is no restore from the app.
                </InlineNotice>
                <FormField label='Type "DELETE" to confirm' name="confirmation">
                  <input className="input" id="field-confirmation" name="confirmation" autoComplete="off" />
                </FormField>
              </ActionForm>
            </DisclosurePanel>
          ) : null}
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Report details" />
              <dl className="space-y-3">
                <KeyValue label="Family member">{access.member.name}</KeyValue>
                <KeyValue label="Report date">{formatDate(report.report.reportDate)}</KeyValue>
                <KeyValue label="Category">{report.report.category.replaceAll("_", " ")}</KeyValue>
                <KeyValue label="Uploaded">{formatDateTime(report.report.createdAt, user.timezone)}</KeyValue>
                <KeyValue label="Status"><StatusBadge status={report.report.status} /></KeyValue>
                <KeyValue label="File">
                  {file ? (
                    <span>
                      {file.originalName}
                      <span className="block text-[0.7rem] text-muted">
                        {file.mimeType} · {(file.sizeBytes / 1024).toFixed(0)} KB · checksum verified at upload
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted">No file attached</span>
                  )}
                </KeyValue>
                {downloadPath ? (
                  <a className="btn btn-secondary btn-sm justify-start" href={downloadPath}>
                    <Download size={13} aria-hidden="true" /> Download private copy
                  </a>
                ) : null}
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading
                title="AI explanation"
                action={aiConfigured() ? <StatusBadge status="active" label="Provider ready" /> : <UnavailableBadge />}
              />
              {!aiConfigured() ? (
                <p className="text-[0.78rem] leading-5 text-[#52666e]">
                  No AI provider is configured on this server, so no explanation can be generated. The
                  upload, extraction, findings, and private download still work.
                </p>
              ) : !aiConsent ? (
                <div>
                  <p className="text-[0.78rem] leading-5 text-[#52666e]">
                    AI processing consent is not active. Review what would be sent in privacy settings
                    before enabling analysis.
                  </p>
                  <Link className="btn btn-secondary btn-sm mt-3" href="/app/settings/privacy">
                    Review consent
                  </Link>
                </div>
              ) : !report.report.extractedText ? (
                <p className="text-[0.78rem] leading-5 text-[#52666e]">
                  There is no extracted text to analyze. Text-based PDF uploads work without OCR; image
                  reports need an OCR provider.
                </p>
              ) : !canManage ? (
                <p className="text-[0.78rem] leading-5 text-[#52666e]">
                  You have view-only access. Ask the profile owner to run analysis.
                </p>
              ) : (
                <div>
                  <p className="text-[0.78rem] leading-5 text-[#52666e]">
                    Analysis sends up to 60,000 characters of extracted report text to the configured AI
                    provider. It does not send the original file. Results can be wrong and must be
                    reviewed by a clinician.
                  </p>
                  <ActionForm
                    action={analyzeReportAction}
                    submitLabel={report.report.aiSummary ? "Re-run AI explanation" : "Analyze with AI"}
                    className="mt-3"
                  >
                    <input type="hidden" name="reportId" value={report.report.id} />
                    <input type="hidden" name="memberId" value={report.report.memberId} />
                    <InlineNotice tone="warning">
                      Do not use AI analysis for an urgent result. Contact the ordering clinician or
                      emergency services instead.
                    </InlineNotice>
                    {canAnalyze ? null : (
                      <p className="text-[0.7rem] text-muted">
                        Analysis will run only when all requirements above are met.
                      </p>
                    )}
                  </ActionForm>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Who can see this" />
              <p className="text-[0.78rem] leading-5 text-[#52666e]">
                This report is scoped to {access.member.name}&apos;s care profile. People with active
                caregiver access can view it according to their permissions. Download links are signed
                for your account and expire after ten minutes.
              </p>
              <Link className="btn btn-secondary btn-sm mt-3" href={`/app/family/${access.member.id}`}>
                Manage access
              </Link>
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <div className="flex items-center gap-2 text-[0.74rem] font-semibold text-[#a82f3d]">
                <AlertTriangle size={14} aria-hidden="true" /> Safety reminder
              </div>
              <p className="mt-2 text-[0.78rem] leading-5 text-[#6b3b42]">
                A normal-looking AI summary cannot rule out a problem. If you feel unwell or a result
                looks urgent, seek clinical care now.
              </p>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
