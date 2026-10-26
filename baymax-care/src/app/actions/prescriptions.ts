"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { files, prescriptionEvents, prescriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { permissionMessage, requireMemberAccess } from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { checkDateOrder, prescriptionSchema } from "@/lib/validation";
import { validateReportFile } from "@/lib/uploads";
import { deletePrivateFile, savePrivateFile, StorageUnavailableError } from "@/lib/storage";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { todayInZone } from "@/lib/utils";

export async function createPrescriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/prescriptions");
  const parsed = prescriptionSchema.safeParse({
    memberId: formData.get("memberId"),
    prescriberName: formData.get("prescriberName"),
    clinicName: formData.get("clinicName")?.toString() || undefined,
    issuedAt: formData.get("issuedAt"),
    validUntil: formData.get("validUntil")?.toString() ?? "",
  });
  if (!parsed.success) {
    return errorState("Check the prescription details.", zodFieldErrors(parsed.error));
  }

  if (!checkDateOrder(parsed.data.issuedAt, parsed.data.validUntil)) {
    return errorState("The valid-until date must be on or after the issue date.", {
      validUntil: ["Choose a date on or after the issue date."],
    });
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const limit = await checkRateLimit("prescription-create", user.id, 20, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const fileInput = formData.get("file");
  let storedFile: { storageKey: string; checksum: string; sizeBytes: number } | null = null;
  let uploadData:
    | { mimeType: string; originalName: string; sizeBytes: number; checksum: string }
    | null = null;

  if (fileInput instanceof File && fileInput.size > 0) {
    const upload = await validateReportFile(fileInput);
    if (!upload.ok) return errorState(upload.error, { file: [upload.error] });
    try {
      const stored = await savePrivateFile({ buffer: upload.buffer, ownerUserId: user.id });
      storedFile = stored;
      uploadData = {
        mimeType: upload.mimeType,
        originalName: upload.originalName,
        sizeBytes: stored.sizeBytes,
        checksum: stored.checksum,
      };
    } catch (error) {
      if (error instanceof StorageUnavailableError) return errorState(error.message);
      logger.error("prescription_storage_failed", error);
      return errorState("The prescription copy could not be stored privately. Please try again.");
    }
  }

  const db = await getDb();
  try {
    let prescriptionId = "";
    await db.transaction(async (tx) => {
      let fileId: string | null = null;
      if (storedFile && uploadData) {
        const [fileRow] = await tx
          .insert(files)
          .values({
            ownerUserId: user.id,
            memberId: parsed.data.memberId,
            storageKey: storedFile.storageKey,
            originalName: uploadData.originalName,
            mimeType: uploadData.mimeType,
            sizeBytes: uploadData.sizeBytes,
            checksum: uploadData.checksum,
          })
          .returning({ id: files.id });
        fileId = fileRow.id;
      }

      const expired =
        parsed.data.validUntil !== undefined &&
        parsed.data.validUntil < todayInZone(user.timezone);

      const [prescription] = await tx
        .insert(prescriptions)
        .values({
          memberId: parsed.data.memberId,
          fileId,
          prescriberName: parsed.data.prescriberName,
          clinicName: parsed.data.clinicName || null,
          issuedAt: parsed.data.issuedAt,
          validUntil: parsed.data.validUntil ?? null,
          status: expired ? "EXPIRED" : "UNVERIFIED",
          verificationNote:
            "Recorded by the account holder. Baymax Care has not independently verified this prescription with the prescriber or a pharmacy.",
          createdById: user.id,
        })
        .returning({ id: prescriptions.id });
      prescriptionId = prescription.id;

      await tx.insert(prescriptionEvents).values({
        prescriptionId,
        type: "DETAILS_RECORDED",
        note: "Prescription details and signed copy recorded by the account holder. This is not an external verification.",
        actorUserId: user.id,
      });
    });

    await recordAudit({
      actorUserId: user.id,
      memberId: parsed.data.memberId,
      action: "prescription.created",
      entityType: "prescription",
      entityId: prescriptionId,
      metadata: { hasFile: Boolean(storedFile) },
    });

    revalidatePath("/app/prescriptions");
    revalidatePath("/app/medications");
    revalidatePath(`/app/family/${parsed.data.memberId}`);
    return successState(
      "Prescription recorded as unverified. It remains marked unverified until a configured provider or clinician verifies it.",
    );
  } catch (error) {
    logger.error("prescription_create_failed", error);
    if (storedFile) {
      await deletePrivateFile(storedFile.storageKey).catch((cleanupError) =>
        logger.error("prescription_orphan_cleanup_failed", cleanupError),
      );
    }
    return errorState("We couldn't save this prescription. Please try again.");
  }
}
