"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth";
import { requireMemberAccess } from "@/lib/authorization";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import { hasActiveConsent } from "@/lib/consents";
import {
  AI_DOCTOR_SYSTEM_PROMPT,
  chatWithAi,
  detectEmergencyIntent,
  emergencySafetyReply,
} from "@/lib/ai";
import { aiConfigured } from "@/lib/config";
import { buildHealthContext } from "@/lib/health-context";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";

export async function createAiConversationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser("/app/ai-doctor");
  const rawMemberId = String(formData.get("memberId") ?? "").trim();
  const includeHealthContext = formData.get("includeHealthContext") === "on";
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || "Health question";

  if (rawMemberId) {
    try {
      await requireMemberAccess(user.id, rawMemberId, "view");
    } catch {
      return errorState("That family member is not available.");
    }
  }

  if (includeHealthContext && !(await hasActiveConsent(user.id, "AI_PROCESSING"))) {
    return errorState(
      "Grant AI processing consent in Settings → Privacy before sharing health context with an AI provider.",
    );
  }

  const db = await getDb();
  const [conversation] = await db
    .insert(aiConversations)
    .values({
      userId: user.id,
      memberId: rawMemberId || null,
      title,
      includeHealthContext,
    })
    .returning({ id: aiConversations.id });

  await recordAudit({
    actorUserId: user.id,
    memberId: rawMemberId || null,
    action: "ai.conversation_created",
    entityType: "ai_conversation",
    entityId: conversation.id,
    metadata: { includeHealthContext },
  });

  redirect(`/app/ai-doctor?c=${conversation.id}`);
}

export async function sendAiMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser("/app/ai-doctor");
  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("message") ?? "").trim();

  if (!conversationId) return errorState("Open a conversation before sending a message.");
  if (content.length < 2) return errorState("Write a question first.");
  if (content.length > 4000) return errorState("Keep your message under 4,000 characters.");

  const limit = await checkRateLimit("ai-message", user.id, 30, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, user.id),
      ),
    )
    .limit(1);
  if (!conversation) return errorState("That conversation could not be found.");

  if (conversation.includeHealthContext) {
    if (!(await hasActiveConsent(user.id, "AI_PROCESSING"))) {
      return errorState(
        "AI processing consent is no longer active, so health context cannot be shared. Turn off health context or grant consent in Privacy settings.",
      );
    }
    if (conversation.memberId) {
      try {
        await requireMemberAccess(user.id, conversation.memberId, "view");
      } catch {
        return errorState(
          "Access to this family member is no longer available, so health context cannot be shared.",
        );
      }
    }
  }

  const previous = await db
    .select({
      role: aiMessages.role,
      content: aiMessages.content,
    })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(desc(aiMessages.createdAt))
    .limit(20);

  await db.insert(aiMessages).values({
    conversationId,
    role: "user",
    content,
  });
  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId));

  if (conversation.title === "Health question" || conversation.title === "New conversation") {
    await db
      .update(aiConversations)
      .set({ title: content.slice(0, 80) })
      .where(eq(aiConversations.id, conversationId));
  }

  const emergency = detectEmergencyIntent(content);
  if (emergency) {
    await db.insert(aiMessages).values({
      conversationId,
      role: "assistant",
      content: emergencySafetyReply(emergency),
      safetyLevel: "EMERGENCY",
      provider: "safety-rules",
      model: null,
    });
    await recordAudit({
      actorUserId: user.id,
      memberId: conversation.memberId,
      action: "ai.emergency_intercepted",
      entityType: "ai_conversation",
      entityId: conversationId,
      metadata: { category: emergency },
    });
    revalidatePath("/app/ai-doctor");
    return successState(
      "This message may describe an emergency. Emergency guidance was shown immediately; no AI model was called.",
    );
  }

  if (!aiConfigured()) {
    revalidatePath("/app/ai-doctor");
    return errorState(
      "AI is not configured on this server, so your message was saved without a reply. Set AI_PROVIDER=nvidia and NVIDIA_NIM_API_KEY to enable responses.",
    );
  }

  let contextMessage: string | null = null;
  if (conversation.includeHealthContext && conversation.memberId) {
    contextMessage = await buildHealthContext(conversation.memberId);
  }

  const history = previous
    .slice()
    .reverse()
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content.slice(0, 6000),
    }));

  const messages = [
    { role: "system" as const, content: AI_DOCTOR_SYSTEM_PROMPT },
    ...(contextMessage
      ? [
          {
            role: "system" as const,
            content: `The user explicitly chose to include this health-record context. Treat it as user-provided and unverified, never as a complete medical record:\n\n${contextMessage}`,
          },
        ]
      : []),
    ...history,
    { role: "user" as const, content },
  ];

  const result = await chatWithAi({
    messages,
    temperature: 0.25,
    maxTokens: 1500,
  });

  if (result.status !== "ok") {
    await recordIntegrationEvent({
      type: "AI",
      status: result.status === "unavailable" ? "UNAVAILABLE" : "FAILED",
      summary: "AI chat response did not complete.",
      detail: result.reason,
    });
    revalidatePath("/app/ai-doctor");
    return errorState(result.reason);
  }

  await db.insert(aiMessages).values({
    conversationId,
    role: "assistant",
    content: result.content,
    safetyLevel: "STANDARD",
    provider: result.provider,
    model: result.model,
  });
  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId));

  await recordIntegrationEvent({
    type: "AI",
    status: "SUCCESS",
    summary: "AI chat response completed.",
  });
  await recordAudit({
    actorUserId: user.id,
    memberId: conversation.memberId,
    action: "ai.message_answered",
    entityType: "ai_conversation",
    entityId: conversationId,
    metadata: { model: result.model },
  });

  revalidatePath("/app/ai-doctor");
  return successState("Response received. It is general information, not a diagnosis.");
}

export async function rateAiMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser("/app/ai-doctor");
  const messageId = String(formData.get("messageId") ?? "");
  const rating = String(formData.get("rating") ?? "");
  if (rating !== "helpful" && rating !== "not_helpful") {
    return errorState("Choose a feedback option.");
  }

  const db = await getDb();
  const [message] = await db
    .select({ id: aiMessages.id })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.id))
    .where(
      and(
        eq(aiMessages.id, messageId),
        eq(aiConversations.userId, user.id),
        eq(aiMessages.role, "assistant"),
      ),
    )
    .limit(1);
  if (!message) return errorState("That response could not be found.");

  await db
    .update(aiMessages)
    .set({ feedback: rating })
    .where(eq(aiMessages.id, messageId));

  revalidatePath("/app/ai-doctor");
  return successState("Thank you. Your feedback was recorded.");
}

export async function deleteAiConversationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser("/app/ai-doctor");
  const conversationId = String(formData.get("conversationId") ?? "");
  if (String(formData.get("confirmation") ?? "").trim().toUpperCase() !== "DELETE") {
    return errorState('Type "DELETE" to confirm removing this conversation.');
  }

  const db = await getDb();
  const result = await db
    .delete(aiConversations)
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, user.id),
      ),
    )
    .returning({ id: aiConversations.id });
  if (result.length === 0) return errorState("That conversation could not be found.");

  await recordAudit({
    actorUserId: user.id,
    action: "ai.conversation_deleted",
    entityType: "ai_conversation",
    entityId: conversationId,
    metadata: {},
  });

  revalidatePath("/app/ai-doctor");
  return successState("Conversation deleted.", {
    link: "/app/ai-doctor",
    linkLabel: "Start another conversation",
  });
}
