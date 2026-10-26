import "server-only";

import path from "node:path";
import { serverConfig } from "./config";
import { extractImageText } from "./ocr";

export const ALLOWED_REPORT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedReportMime = (typeof ALLOWED_REPORT_MIME_TYPES)[number];

const MIME_LABELS: Record<AllowedReportMime, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "image/webp": "WebP image",
};

export function uploadSizeLimitBytes() {
  return serverConfig.uploadMaxBytes;
}

export function uploadSizeLimitLabel() {
  return `${Math.round(serverConfig.uploadMaxBytes / (1024 * 1024))} MB`;
}

function detectMime(buffer: Buffer): AllowedReportMime | null {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type ValidatedUpload =
  | {
      ok: true;
      buffer: Buffer;
      mimeType: AllowedReportMime;
      originalName: string;
      sizeBytes: number;
    }
  | { ok: false; error: string };

export async function validateReportFile(file: unknown): Promise<ValidatedUpload> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a PDF or image of the report." };
  }
  if (file.size > serverConfig.uploadMaxBytes) {
    return {
      ok: false,
      error: `This file is larger than the ${uploadSizeLimitLabel()} upload limit.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectMime(buffer);
  if (!detected) {
    return {
      ok: false,
      error: "Only PDF, JPEG, PNG, or WebP files are accepted. The file contents did not match a supported format.",
    };
  }

  if (file.type && file.type !== detected && !(file.type === "image/jpg" && detected === "image/jpeg")) {
    return {
      ok: false,
      error: "The file's declared type did not match its contents. Choose the original report file.",
    };
  }

  const base = path.basename(file.name || "report").replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_");
  const originalName = base.slice(0, 180) || `report.${detected === "application/pdf" ? "pdf" : "img"}`;

  return { ok: true, buffer, mimeType: detected, originalName, sizeBytes: file.size };
}

export type ExtractionResult =
  | {
      status: "text";
      text: string;
      limitations: string | null;
      pageCount: number | null;
    }
  | {
      status: "ocr_unavailable";
      text: null;
      limitations: string;
      pageCount: number | null;
    }
  | {
      status: "failed";
      text: null;
      limitations: string;
      pageCount: number | null;
    };

const MAX_EXTRACTED_CHARS = 400_000;

export async function extractReportText({
  buffer,
  mimeType,
  originalName,
}: {
  buffer: Buffer;
  mimeType: AllowedReportMime;
  originalName: string;
}): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const result = await extractText(pdf, { mergePages: true });
      const text = String(result.text ?? "").replace(/\u0000/g, "").trim().slice(0, MAX_EXTRACTED_CHARS);
      if (text.length < 20) {
        return {
          status: "ocr_unavailable",
          text: null,
          limitations:
            "This PDF has little or no selectable text, which usually means it is a scanned document. PDF page OCR is not configured. Upload clear images of each page to use image OCR, or add a text-based PDF.",
          pageCount: result.totalPages ?? null,
        };
      }
      return {
        status: "text",
        text,
        limitations:
          text.length >= MAX_EXTRACTED_CHARS
            ? "Extracted text was truncated to the first 400,000 characters."
            : null,
        pageCount: result.totalPages ?? null,
      };
    } catch {
      return {
        status: "failed",
        text: null,
        limitations: "The PDF could not be read. It may be encrypted, damaged, or unsupported.",
        pageCount: null,
      };
    }
  }

  const ocr = await extractImageText(buffer, mimeType, originalName);
  if (ocr.status === "ok") {
    return {
      status: "text",
      text: ocr.text.slice(0, MAX_EXTRACTED_CHARS),
      limitations: null,
      pageCount: 1,
    };
  }

  return {
    status: ocr.status === "unavailable" ? "ocr_unavailable" : "failed",
    text: null,
    limitations: ocr.reason,
    pageCount: 1,
  };
}

export function mimeLabel(mimeType: string) {
  return MIME_LABELS[mimeType as AllowedReportMime] ?? mimeType;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
