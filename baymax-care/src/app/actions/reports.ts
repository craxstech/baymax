"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  files,
  medicalReports,
  reportFindings,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  permissionMessage,
  requireMemberAccess,
} from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import {
  reportFindingSchema,
  reportSchema,
} from "@/lib/validation";
import { validateReportFile, extractReportText } from "@/lib/uploads";
import { savePrivateFile, deletePrivateFile, StorageUnavailableError } from "@/lib/storage";
import { hasActiveConsent } from "@/lib/consents";
import {
  REPORT_ANALYSIS_SYSTEM_PROMPT,
  chatWithAi,
  parseReportAnalysis,
  AI_DISCLAIMER,
} from "@/lib/ai";
import { aiConfigured } from "@/lib/config";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function uploadReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/reports");
  const parsed = reportSchema.safeParse({
    memberId: formData.get("memberId"),
    title: formData.get("title"),
    category: formData.get("category"),
    reportDate: formData.get("reportDate"),
  });
  if (!parsed.success) {
    return errorState("Check the report details.", zodFieldErrors(parsed.error));
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const limit = await checkRateLimit("report-upload", user.id, 12, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const upload = await validateReportFile(formData.get("file"));
  if (!upload.ok) return errorState(upload.error, { file: [upload.error] });

  let stored: Awaited<ReturnType<typeof savePrivateFile>>;
  try {
    stored = await savePrivateFile({
      buffer: upload.buffer,
      ownerUserId: user.id,
    });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      return errorState(error.message);
    }
    logger.error("report_storage_failed", error);
    return errorState("The file could not be stored privately. Please try again.");
  }

  const extraction = await extractReportText({
    buffer: upload.buffer,
    mimeType: upload.mimeType,
    originalName: upload.originalName,
  });

  const db = await getDb();
  try {
    const [{ reportId }] = await db.transaction(async (tx) => {
      const [fileRow] = await tx
        .insert(files)
        .values({
          ownerUserId: user.id,
          memberId: parsed.data.memberId,
          storageKey: stored.storageKey,
          originalName: upload.originalName,
          mimeType: upload.mimeType,
          sizeBytes: stored.sizeBytes,
          checksum: stored.checksum,
        })
        .returning({ id: files.id });

      const status =
        extraction.status === "text"
          ? "READY"
          : extraction.status === "ocr_unavailable"
            ? "OCR_UNAVAILABLE"
            : "FAILED";

      const [report] = await tx
        .insert(medicalReports)
        .values({
          memberId: parsed.data.memberId,
          fileId: fileRow.id,
          title: parsed.data.title,
          category: parsed.data.category,
          reportDate: parsed.data.reportDate,
          status,
          extractedText: extraction.text,
          limitations: extraction.limitations,
          errorMessage:
            extraction.status === "failed" ? extraction.limitations : null,
          createdById: user.id,
        })
        .returning({ id: medicalReports.id });
      return [{ reportId: report.id }];
    });

    await recordAudit({
      actorUserId: user.id,
      memberId: parsed.data.memberId,
      action: "report.uploaded",
      entityType: "medical_report",
      entityId: reportId,
      metadata: {
        category: parsed.data.category,
        extraction: extraction.status,
        storageDriver: stored.driver,
      },
    });

    revalidatePath("/app/reports");
    revalidatePath("/app");
    revalidatePath(`/app/family/${parsed.data.memberId}`);

    return successState(
      extraction.status === "text"
        ? "Report uploaded and text extracted privately. Review it, then choose whether to analyze it with AI."
        : "Report uploaded. The file is stored privately, but readable text was not extracted. See the report for details and next steps.",
      { link: `/app/reports/${reportId}`, linkLabel: "Open report" },
    );
  } catch (error) {
    logger.error("report_record_failed", error);
    await deletePrivateFile(stored.storageKey).catch((storageError) =>
      logger.error("report_orphan_cleanup_failed", storageError),
    );
    return errorState("The report could not be recorded. The uploaded file was removed.");
  }
}

export async function analyzeReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/reports");
  const reportId = String(formData.get("reportId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  if (!(await hasActiveConsent(user.id, "AI_PROCESSING"))) {
    return errorState(
      "AI processing consent is not active. Review and grant it in Settings → Privacy before sending report text to an AI provider.",
    );
  }

  const limit = await checkRateLimit("report-analysis", user.id, 10, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [report] = await db
    .select()
    .from(medicalReports)
    .where(
      and(
        eq(medicalReports.id, reportId),
        eq(medicalReports.memberId, memberId),
      ),
    )
    .limit(1);

  if (!report) return errorState("That report could not be found.");
  if (!report.extractedText || report.extractedText.trim().length < 20) {
    return errorState(
      "There is not enough extracted text to analyze. Upload a text-based PDF or configure image OCR and re-upload.",
    );
  }

  if (!aiConfigured()) {
    const reason =
      "AI analysis is unavailable because no provider is configured. Set AI_PROVIDER=nvidia and NVIDIA_NIM_API_KEY on the server.";
    await db
      .update(medicalReports)
      .set({
        status: report.aiSummary ? report.status : "AI_UNAVAILABLE",
        errorMessage: reason,
        updatedAt: new Date(),
      })
      .where(eq(medicalReports.id, reportId));
    await recordIntegrationEvent({
      type: "AI",
      status: "UNAVAILABLE",
      summary: "Report analysis requested without an AI provider.",
    });
    revalidatePath(`/app/reports/${reportId}`);
    return errorState(reason);
  }

  const truncated = report.extractedText.slice(0, 60_000);
  const result = await chatWithAi({
    messages: [
      { role: "system", content: REPORT_ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Explain the following extracted report text. Remember: do not invent values or reference ranges, and return only the required JSON.\n\n--- REPORT TEXT START ---\n${truncated}\n--- REPORT TEXT END ---`,
      },
    ],
    temperature: 0.1,
    maxTokens: 3000,
    model: process.env.AI_REPORT_MODEL || undefined,
  });

  if (result.status !== "ok") {
    await db
      .update(medicalReports)
      .set({
        status: report.aiSummary ? report.status : "AI_UNAVAILABLE",
        errorMessage: result.reason,
        updatedAt: new Date(),
      })
      .where(eq(medicalReports.id, reportId));
    await recordIntegrationEvent({
      type: "AI",
      status: result.status === "unavailable" ? "UNAVAILABLE" : "FAILED",
      summary: "Report analysis did not complete.",
      detail: result.reason,
    });
    revalidatePath(`/app/reports/${reportId}`);
    return errorState(result.reason);
  }

  const parsed = parseReportAnalysis(result.content);
  if (!parsed.ok) {
    await db
      .update(medicalReports)
      .set({ errorMessage: parsed.error, updatedAt: new Date() })
      .where(eq(medicalReports.id, reportId));
    await recordIntegrationEvent({
      type: "AI",
      status: "FAILED",
      summary: "AI report response could not be validated.",
    });
    revalidatePath(`/app/reports/${reportId}`);
    return errorState(
      "The AI response could not be verified as structured medical information, so nothing was saved. Please try again.",
    );
  }

  const { data } = parsed;
  const limitations = [
    data.redFlags.length > 0
      ? `Items the AI suggested discussing promptly with a clinician: ${data.redFlags.join("; ")}`
      : null,
    data.limitations || null,
    AI_DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n\n");

  await db.transaction(async (tx) => {
    await tx.delete(reportFindings).where(eq(reportFindings.reportId, reportId));
    if (data.findings.length > 0) {
      await tx.insert(reportFindings).values(
        data.findings.map((finding, index) => ({
          reportId,
          name: finding.name,
          value: finding.value,
          unit: finding.unit || null,
          referenceRange: finding.referenceRange || null,
          flag: finding.flag,
          explanation: finding.explanation || null,
          sortOrder: index,
        })),
      );
    }
    await tx
      .update(medicalReports)
      .set({
        status: "AI_ANALYSIS_READY",
        aiSummary: data.summary,
        limitations,
        analysisModel: `${result.provider}/${result.model}`,
        analyzedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(medicalReports.id, reportId));
  });

  await recordIntegrationEvent({
    type: "AI",
    status: "SUCCESS",
    summary: "Report analysis completed.",
  });
  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "report.ai_analysis_completed",
    entityType: "medical_report",
    entityId: reportId,
    metadata: { findings: data.findings.length },
  });

  revalidatePath(`/app/reports/${reportId}`);
  revalidatePath("/app/reports");
  return successState("AI explanation saved. It is informational and must be reviewed by a clinician.");
}

export async function addReportFindingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/reports");
  const parsed = reportFindingSchema.safeParse({
    reportId: formData.get("reportId"),
    memberId: formData.get("memberId"),
    name: formData.get("name"),
    value: formData.get("value"),
    unit: formData.get("unit")?.toString() || undefined,
    referenceRange: formData.get("referenceRange")?.toString() || undefined,
    flag: formData.get("flag")?.toString() || "UNKNOWN",
    explanation: formData.get("explanation")?.toString() || undefined,
  });
  if (!parsed.success) {
    return errorState("Check the finding details.", zodFieldErrors(parsed.error));
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const [report] = await db
    .select({ id: medicalReports.id })
    .from(medicalReports)
    .where(
      and(
        eq(medicalReports.id, parsed.data.reportId),
        eq(medicalReports.memberId, parsed.data.memberId),
      ),
    )
    .limit(1);
  if (!report) return errorState("That report could not be found.");

  await db.insert(reportFindings).values({
    reportId: parsed.data.reportId,
    name: parsed.data.name,
    value: parsed.data.value,
    unit: parsed.data.unit || null,
    referenceRange: parsed.data.referenceRange || null,
    flag: parsed.data.flag,
    explanation: parsed.data.explanation || null,
    sortOrder: 999,
  });

  await recordAudit({
    actorUserId: user.id,
    memberId: parsed.data.memberId,
    action: "report.finding_added",
    entityType: "medical_report",
    entityId: parsed.data.reportId,
    metadata: { flag: parsed.data.flag },
  });

  revalidatePath(`/app/reports/${parsed.data.reportId}`);
  return successState("Finding added. It is your recorded entry, not an AI result.");
}

export async function deleteReportFindingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/reports");
  const findingId = String(formData.get("findingId") ?? "");
  const reportId = String(formData.get("reportId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const [report] = await db
    .select({ id: medicalReports.id })
    .from(medicalReports)
    .where(
      and(eq(medicalReports.id, reportId), eq(medicalReports.memberId, memberId)),
    )
    .limit(1);
  if (!report) return errorState("That report could not be found.");

  await db
    .delete(reportFindings)
    .where(and(eq(reportFindings.id, findingId), eq(reportFindings.reportId, reportId)));

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "report.finding_deleted",
    entityType: "report_finding",
    entityId: findingId,
    metadata: {},
  });

  revalidatePath(`/app/reports/${reportId}`);
  return successState("Finding removed.");
}

export async function deleteReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/reports");
  const reportId = String(formData.get("reportId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "DELETE") {
    return errorState('Type "DELETE" to confirm removing this report and its file.');
  }

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const [report] = await db
    .select({
      id: medicalReports.id,
      fileId: medicalReports.fileId,
      storageKey: files.storageKey,
    })
    .from(medicalReports)
    .leftJoin(files, eq(medicalReports.fileId, files.id))
    .where(
      and(eq(medicalReports.id, reportId), eq(medicalReports.memberId, memberId)),
    )
    .limit(1);

  if (!report) return errorState("That report could not be found.");

  if (report.storageKey) {
    try {
      await deletePrivateFile(report.storageKey);
    } catch (error) {
      logger.error("report_file_delete_failed", error);
      return errorState(
        "The private file could not be removed from storage, so the report was not deleted. Please try again.",
      );
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(medicalReports).where(eq(medicalReports.id, reportId));
    if (report.fileId) {
      await tx.delete(files).where(eq(files.id, report.fileId));
    }
  });

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "report.deleted",
    entityType: "medical_report",
    entityId: reportId,
    metadata: {},
  });

  revalidatePath("/app/reports");
  revalidatePath("/app");
  return successState("Report and its private file were deleted.", {
    link: "/app/reports",
    linkLabel: "Back to reports",
  });
}
