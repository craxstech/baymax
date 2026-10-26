import "server-only";

import { integrations, ocrConfigured } from "./config";
import { logger } from "./logger";

export type OcrResult =
  | { status: "ok"; text: string }
  | { status: "unavailable"; reason: string }
  | { status: "error"; reason: string };

/**
 * OCR.space adapter for image-based reports. PDFs are extracted locally with
 * unpdf instead of being sent to a third party.
 */
export async function extractImageText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<OcrResult> {
  if (!ocrConfigured()) {
    return {
      status: "unavailable",
      reason:
        "Image OCR is not configured. Add OCR_SPACE_API_KEY, or upload a text-based PDF.",
    };
  }

  const form = new FormData();
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("scale", "true");
  form.append("OCREngine", "2");
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  try {
    const response = await fetch(integrations.ocr.endpoint, {
      method: "POST",
      headers: { apikey: integrations.ocr.apiKey },
      body: form,
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });

    if (!response.ok) {
      logger.warn("ocr_provider_rejected", { status: response.status });
      return {
        status: "error",
        reason: `The OCR provider returned HTTP ${response.status}. Please try again.`,
      };
    }

    const data = (await response.json()) as {
      IsErroredOnProcessing?: boolean;
      ErrorMessage?: string | string[];
      ParsedResults?: Array<{ ParsedText?: string }>;
    };

    if (data.IsErroredOnProcessing) {
      const detail = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join(" ")
        : data.ErrorMessage;
      return {
        status: "error",
        reason: detail
          ? "The OCR provider could not read this image. Try a sharper, well-lit photo."
          : "The OCR provider could not process this image.",
      };
    }

    const text = (data.ParsedResults ?? [])
      .map((result) => result.ParsedText?.trim() ?? "")
      .filter(Boolean)
      .join("\n\n")
      .trim();

    if (!text) {
      return {
        status: "error",
        reason: "No readable text was found in this image. Try a clearer image or a text PDF.",
      };
    }

    return { status: "ok", text };
  } catch (error) {
    logger.error("ocr_request_failed", error);
    return {
      status: "error",
      reason:
        error instanceof Error && error.name === "TimeoutError"
          ? "The OCR provider took too long to respond."
          : "The OCR provider could not be reached.",
    };
  }
}
