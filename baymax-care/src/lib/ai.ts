import "server-only";

import { z } from "zod";
import { aiConfigured, integrations } from "./config";
import { logger } from "./logger";

export const AI_DISCLAIMER =
  "This is general health information, not a diagnosis or a prescription. A qualified clinician should review symptoms, medicines, and results in context. For an emergency, call your local emergency number.";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiResult =
  | {
      status: "ok";
      content: string;
      provider: string;
      model: string;
    }
  | {
      status: "unavailable";
      reason: string;
    }
  | {
      status: "error";
      reason: string;
    };

type AiRequest = {
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
};

/**
 * NVIDIA NIM exposes an OpenAI-compatible chat-completions endpoint. All calls
 * happen on the server; the browser never receives the API key.
 */
export async function chatWithAi({
  messages,
  temperature = 0.2,
  maxTokens = 1200,
  model,
}: AiRequest): Promise<AiResult> {
  if (!aiConfigured()) {
    return {
      status: "unavailable",
      reason:
        "No AI provider is configured. Set AI_PROVIDER=nvidia and NVIDIA_NIM_API_KEY on the server to enable AI features.",
    };
  }

  const selectedModel = model || integrations.ai.nvidiaModel;
  const baseUrl = integrations.ai.nvidiaBaseUrl.replace(/\/$/, "");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integrations.ai.nvidiaApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: AbortSignal.timeout(integrations.ai.timeoutMs),
      cache: "no-store",
    });

    if (!response.ok) {
      const status = response.status;
      logger.warn("ai_provider_rejected", { status });
      return {
        status: "error",
        reason:
          status === 401 || status === 403
            ? "The AI provider rejected the server credentials. Check NVIDIA_NIM_API_KEY and model access."
            : status === 429
              ? "The AI provider is rate-limiting requests. Please try again shortly."
              : `The AI provider returned an error (HTTP ${status}). Please try again later.`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return { status: "error", reason: "The AI provider returned an empty response." };
    }

    return {
      status: "ok",
      content,
      provider: "nvidia",
      model: data.model || selectedModel,
    };
  } catch (error) {
    logger.error("ai_request_failed", error);
    return {
      status: "error",
      reason:
        error instanceof Error && error.name === "TimeoutError"
          ? "The AI provider took too long to respond. Please try again."
          : "The AI provider could not be reached. Check the server network and provider status.",
    };
  }
}

export const AI_DOCTOR_SYSTEM_PROMPT = `You are the informational health assistant inside Baymax Care, a family health record product.

Your role:
- Explain health concepts and uploaded reports in plain language.
- Help the user prepare useful questions for a clinician.
- Be clear about uncertainty and missing information.
- Encourage appropriate in-person or emergency care when symptoms could be serious.
- Use the health context supplied only when it is relevant and explicitly available.

Hard boundaries:
- Do not diagnose, prescribe, change a dose, or claim to replace a clinician.
- Do not tell the user to stop or start a medicine.
- Do not invent test results, clinician names, appointments, or emergency dispatches.
- Do not provide certainty about a condition from limited data.
- If the user describes an emergency (for example severe chest pain, difficulty breathing, stroke signs, heavy bleeding, loss of consciousness, seizure, severe allergic reaction, overdose, or self-harm), tell them to contact emergency services immediately and keep the response short.
- Never ask for passwords, payment card numbers, or government identifiers.
- Use British/Indian English where natural, short paragraphs, and practical next steps.

End substantive clinical answers with a brief reminder that this is general information and that a qualified clinician should review their situation.`;

export const REPORT_ANALYSIS_SYSTEM_PROMPT = `You are a careful medical-report explainer inside Baymax Care. You explain extracted laboratory or imaging text in plain language. You are not the treating clinician and must not diagnose.

Rules:
- Work only from the supplied extracted text. Never invent values, dates, units, reference ranges, or findings.
- Preserve values exactly as written. If a reference range is absent, say so rather than inventing one.
- A flag of HIGH, LOW, or ABNORMAL must be supported by the report's own reference range or wording. Otherwise use UNKNOWN.
- Do not recommend starting, stopping, or changing any medicine and do not give doses.
- Summarise in calm, plain language. Mention important limitations and what a clinician may want to review.
- If the text looks incomplete, illegible, or lacks enough detail, say that clearly.
- Do not claim the report is normal or that the person is healthy.

Return ONLY valid JSON with this shape:
{
  "summary": "string, at most 1200 words",
  "findings": [
    {
      "name": "string",
      "value": "string",
      "unit": "string or null",
      "referenceRange": "string or null",
      "flag": "NORMAL" | "HIGH" | "LOW" | "ABNORMAL" | "UNKNOWN",
      "explanation": "short plain-language explanation"
    }
  ],
  "limitations": "string",
  "redFlags": ["short strings for values or statements that need prompt clinical review"]
}
No markdown fences. No text outside the JSON object.`;

export const reportAnalysisSchema = z.object({
  summary: z.string().trim().min(1).max(12_000),
  findings: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        value: z.string().trim().min(1).max(200),
        unit: z.string().trim().max(60).nullable().optional(),
        referenceRange: z.string().trim().max(160).nullable().optional(),
        flag: z.enum(["NORMAL", "HIGH", "LOW", "ABNORMAL", "UNKNOWN"]).default("UNKNOWN"),
        explanation: z.string().trim().max(1200).nullable().optional(),
      }),
    )
    .max(120),
  limitations: z.string().trim().max(6000).default(""),
  redFlags: z.array(z.string().trim().max(300)).max(30).default([]),
});

export type ReportAnalysis = z.infer<typeof reportAnalysisSchema>;

export function parseReportAnalysis(content: string) {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = reportAnalysisSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) {
      return { ok: false as const, error: "The AI response did not match the expected report format." };
    }
    return { ok: true as const, data: parsed.data };
  } catch {
    return { ok: false as const, error: "The AI response was not valid structured data." };
  }
}

const emergencyPatterns: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern:
      /\b(chest pain|crushing chest|pain (?:in|radiating to) (?:the )?(?:left )?arm|heart attack)\b/i,
    label: "possible cardiac emergency",
  },
  {
    pattern:
      /\b(can(?:'|no)t breathe|difficulty breathing|severe shortness of breath|choking|blue lips)\b/i,
    label: "breathing emergency",
  },
  {
    pattern:
      /\b(face droop|slurred speech|sudden weakness|stroke|one side (?:of (?:the )?body )?(?:is )?numb)\b/i,
    label: "possible stroke",
  },
  {
    pattern:
      /\b(unconscious|passed out|unresponsive|not waking|seizure|convulsion|heavy bleeding|bleeding (?:that )?(?:won'?t|will not) stop)\b/i,
    label: "urgent medical emergency",
  },
  {
    pattern:
      /\b(anaphylaxis|throat (?:is )?swelling|severe allergic reaction|overdose|poisoning)\b/i,
    label: "possible poisoning or severe reaction",
  },
  {
    pattern:
      /\b(suicid(?:e|al)|kill myself|end my life|self[- ]harm|want to die)\b/i,
    label: "mental-health crisis",
  },
];

export function detectEmergencyIntent(text: string): string | null {
  const match = emergencyPatterns.find((item) => item.pattern.test(text));
  return match?.label ?? null;
}

export function emergencySafetyReply(label: string) {
  const selfHarm = label === "mental-health crisis";
  return selfHarm
    ? `I'm really sorry you're going through this. Please don't stay alone with these thoughts. If you might act on them, call your local emergency number now. In India, you can also call Tele-MANAS on **14416** for mental-health support. Reach out to someone you trust and stay with them while you get help.\n\nI can stay with you here, but I can't provide crisis care or contact services for you. If you are in immediate danger, call emergency services.`
    : `This sounds like it could be an emergency. Please call your local emergency number now and follow the dispatcher's instructions. Do not wait for an AI response.\n\nIf you are in India, call **112**. If you can, stay with the person and keep your phone nearby. This assistant cannot dispatch an ambulance or contact emergency services.`;
}
