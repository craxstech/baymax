import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Brain,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
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
  InlineNotice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  UnavailableBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { InlineAction } from "@/components/app-controls";
import { getDb } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth";
import { getAccessibleMembers } from "@/lib/authorization";
import { hasActiveConsent } from "@/lib/consents";
import { aiConfigured, brand } from "@/lib/config";
import { AI_DISCLAIMER } from "@/lib/ai";
import { formatDateTime, relativeTime } from "@/lib/utils";
import {
  createAiConversationAction,
  deleteAiConversationAction,
  rateAiMessageAction,
  sendAiMessageAction,
} from "@/app/actions/ai";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "AI family doctor" };

export default async function AiDoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await requireVerifiedUser("/app/ai-doctor");
  const params = await searchParams;
  const db = await getDb();

  const [conversations, accessible, aiConsent] = await Promise.all([
    db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, user.id))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(40),
    getAccessibleMembers(user.id),
    hasActiveConsent(user.id, "AI_PROCESSING"),
  ]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === params.c) ??
    conversations[0] ??
    null;

  const messages = activeConversation
    ? await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, activeConversation.id))
        .orderBy(asc(aiMessages.createdAt))
        .limit(120)
    : [];

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const configured = aiConfigured();
  const activeMember = activeConversation?.memberId
    ? accessible.find((row) => row.member.id === activeConversation.memberId)
    : null;

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumbs items={[{ label: "Care", href: "/app" }, { label: "AI family doctor" }]} />}
        title="AI family doctor"
        description="Ask general health questions in plain language. The assistant can explain concepts and help you prepare for a clinician visit. It cannot diagnose, prescribe, or replace care."
        action={
          <>
            <Link className="btn btn-secondary" href="/app/settings/privacy">
              <ShieldCheck size={15} aria-hidden="true" /> Privacy
            </Link>
            <a className="btn btn-danger-outline" href="/app/alerts">
              <AlertTriangle size={15} aria-hidden="true" /> Emergency
            </a>
          </>
        }
      />

      <InlineNotice tone="danger" className="mb-5" title={`If this is an emergency, call ${brand.emergencyNumber} or your local emergency number now`}>
        This chat is not monitored by a clinician. It does not dispatch emergency help. Emergency
        language is intercepted before any AI model is called and replaced with urgent guidance.
      </InlineNotice>

      <TwoColumn>
        <Stack>
          <Panel>
            <PanelBody className="!p-0">
              <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {activeConversation ? activeConversation.title : "New conversation"}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] text-muted">
                    {activeConversation
                      ? `Updated ${relativeTime(activeConversation.updatedAt)}${activeMember ? ` · context: ${activeMember.member.name}` : " · no health context"}`
                      : "No conversation selected."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {configured ? <StatusBadge status="active" label="AI configured" /> : <UnavailableBadge />}
                  {activeConversation ? (
                    <Link className="btn btn-secondary btn-sm" href="/app/ai-doctor">
                      <MessageSquarePlus size={13} aria-hidden="true" /> New
                    </Link>
                  ) : null}
                </div>
              </div>

              {!activeConversation ? (
                <div className="p-4">
                  <InlineEmpty
                    title="Start with a question"
                    description="Create a conversation below. You can choose a family member and decide whether their recorded health context may be included. Nothing is sent until you write and send a message."
                    action={
                      <Link className="btn btn-primary btn-sm" href="#new-conversation">
                        <MessageSquarePlus size={13} aria-hidden="true" /> New conversation
                      </Link>
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="chat-scroll space-y-4 px-4 py-5">
                    {messages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-line-strong bg-[#fbfdfd] p-4 text-center">
                        <Brain className="mx-auto mb-2 h-5 w-5 text-aqua-700" aria-hidden="true" />
                        <p className="text-sm font-medium text-ink">This conversation is empty</p>
                        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted">
                          Ask about a symptom, a medicine, a test result, or how to prepare for an
                          appointment. Be as specific as you are comfortable being.
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isUser = message.role === "user";
                        const isEmergency = message.safetyLevel === "EMERGENCY";
                        return (
                          <div key={message.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                            <div
                              className={
                                isUser
                                  ? "chat-bubble-user max-w-[92%] sm:max-w-[82%]"
                                  : isEmergency
                                    ? "chat-bubble-emergency max-w-[92%] sm:max-w-[86%]"
                                    : "chat-bubble-assistant max-w-[92%] sm:max-w-[86%]"
                              }
                            >
                              {!isUser && (
                                <p className="mb-1 flex items-center gap-1 text-[0.62rem] font-semibold uppercase tracking-[0.06em] opacity-70">
                                  <Sparkles size={10} aria-hidden="true" />
                                  {isEmergency ? "Safety response" : "AI assistant"}
                                  {message.provider === "safety-rules" ? " · rules" : ""}
                                </p>
                              )}
                              {isUser ? (
                                <p className="whitespace-pre-line">{message.content}</p>
                              ) : (
                                <div className="chat-markdown">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                              {!isUser && (
                                <div className="mt-2 border-t border-black/5 pt-2">
                                  {message.feedback ? (
                                    <p className="text-[0.64rem] opacity-70">
                                      Feedback: {message.feedback === "helpful" ? "helpful" : "not helpful"}
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[0.62rem] opacity-70">Was this useful?</span>
                                      <InlineAction
                                        action={rateAiMessageAction}
                                        fields={{ messageId: message.id, rating: "helpful" }}
                                        label="Helpful"
                                        variant="quiet"
                                      />
                                      <InlineAction
                                        action={rateAiMessageAction}
                                        fields={{ messageId: message.id, rating: "not_helpful" }}
                                        label="Not helpful"
                                        variant="quiet"
                                      />
                                    </div>
                                  )}
                                  <p className="mt-1 text-[0.6rem] opacity-60">
                                    {message.model ? `${message.provider}/${message.model}` : "Generated locally"} ·{" "}
                                    {formatDateTime(message.createdAt, user.timezone)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-line px-4 py-4">
                    {!configured ? (
                      <InlineNotice tone="warning" title="AI provider not configured" className="mb-3">
                        Your messages are stored in this conversation, but no AI response can be
                        generated. Set AI_PROVIDER=nvidia and NVIDIA_NIM_API_KEY on the server to
                        enable replies. No fake response is produced.
                      </InlineNotice>
                    ) : null}
                    <ActionForm action={sendAiMessageAction} submitLabel="Send message">
                      <input type="hidden" name="conversationId" value={activeConversation.id} />
                      <FormField label="Your message" name="message">
                        <textarea
                          className="textarea"
                          id="field-message"
                          name="message"
                          rows={3}
                          maxLength={4000}
                          required
                          placeholder="Describe the question. Do not include information you do not want processed."
                        />
                      </FormField>
                      <p className="text-[0.68rem] leading-4 text-muted">
                        {AI_DISCLAIMER}
                      </p>
                    </ActionForm>
                  </div>
                </>
              )}
            </PanelBody>
          </Panel>

          <DisclosurePanel
            summary="New conversation"
            description="Choose whether a family member's recorded context may be included. Context is never included silently."
            defaultOpen={!activeConversation}
          >
            <div id="new-conversation">
              <ActionForm action={createAiConversationAction} submitLabel="Create conversation">
                <FormField label="Title" name="title" optional hint="A short label helps you find this conversation later.">
                  <input className="input" id="field-title" name="title" maxLength={120} placeholder="e.g. Questions before my appointment" />
                </FormField>
                <FormField label="Family member context" name="memberId" optional>
                  <select className="select" id="field-memberId" name="memberId" defaultValue="">
                    <option value="">No family member context</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                        {member.isSelf ? " (you)" : ` · ${member.relationship}`}
                      </option>
                    ))}
                  </select>
                </FormField>
                <label className="check-row">
                  <input type="checkbox" name="includeHealthContext" />
                  <span className="check-copy">
                    Allow recorded health context for the selected member to be included. AI processing
                    consent is required. The context is user-recorded and may be incomplete.
                  </span>
                </label>
                {!aiConsent ? (
                  <InlineNotice tone="warning" title="AI processing consent is not active">
                    You can still create a conversation without health context. Grant consent in{" "}
                    <Link className="font-semibold underline underline-offset-2" href="/app/settings/privacy">
                      privacy settings
                    </Link>{" "}
                    before including records.
                  </InlineNotice>
                ) : null}
              </ActionForm>
            </div>
          </DisclosurePanel>
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Conversations" description="Only you can see these conversations." />
              {conversations.length === 0 ? (
                <InlineEmpty title="No conversations yet" description="Your first conversation will appear here." />
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/app/ai-doctor?c=${conversation.id}`}
                      className={`block rounded-md border px-2.5 py-2 ${
                        activeConversation?.id === conversation.id
                          ? "border-aqua-200 bg-aqua-50"
                          : "border-transparent hover:border-line hover:bg-[#fbfdfd]"
                      }`}
                    >
                      <p className="truncate text-[0.78rem] font-medium text-ink">{conversation.title}</p>
                      <p className="mt-0.5 text-[0.64rem] text-muted">
                        {formatDateTime(conversation.updatedAt, user.timezone)}
                        {conversation.includeHealthContext ? " · health context" : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          {activeConversation ? (
            <DisclosurePanel
              summary="Delete this conversation"
              tone="danger"
              description="Messages are deleted with the conversation. This cannot be undone."
            >
              <ActionForm action={deleteAiConversationAction} submitLabel="Delete conversation" submitClassName="btn-danger">
                <input type="hidden" name="conversationId" value={activeConversation.id} />
                <FormField label='Type "DELETE" to confirm' name="confirmation">
                  <input className="input" id="field-confirmation" name="confirmation" autoComplete="off" />
                </FormField>
              </ActionForm>
            </DisclosurePanel>
          ) : null}

          <Panel>
            <PanelBody>
              <SectionHeading title="What this assistant does" />
              <ul className="space-y-2.5 text-[0.78rem] leading-5 text-[#52666e]">
                <li className="flex gap-2">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Explains health concepts, tests, and medicine instructions in plain language.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  Health context is included only when you explicitly enable it and consent is active.
                </li>
                <li className="flex gap-2">
                  <Trash2 size={14} className="mt-0.5 shrink-0 text-aqua-700" aria-hidden="true" />
                  You can delete conversations. Audit logs retain only metadata, not message content.
                </li>
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[0.7rem]">
                <span className="text-muted">AI provider</span>
                {configured ? <StatusBadge status="active" label="Configured" /> : <UnavailableBadge />}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[0.7rem]">
                <span className="text-muted">AI consent</span>
                {aiConsent ? <StatusBadge status="active" label="Active" /> : <StatusBadge status="unverified" label="Not granted" />}
              </div>
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <div className="flex items-center gap-2 text-[0.74rem] font-semibold text-[#a82f3d]">
                <AlertTriangle size={14} aria-hidden="true" /> Not for emergencies or prescriptions
              </div>
              <p className="mt-2 text-[0.78rem] leading-5 text-[#6b3b42]">
                The assistant cannot prescribe medicines or issue a diagnosis. Do not change or stop a
                prescribed medicine based on its output. For urgent symptoms, call {brand.emergencyNumber}{" "}
                or your local emergency number.
              </p>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
