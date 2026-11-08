"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Sparkles, Square, Trash2, X } from "lucide-react";
import type {
  AssistantCommandRequest,
  AssistantConversationMessage,
  AssistantEmailSummary,
  AssistantPageContext,
  AssistantQuerySpec,
  AssistantUIAction,
  AssistantWorkflowStep,
} from "@/Types/assistant";
import type { ScheduleProposal } from "@/Types/email";
import {
  AssistantApiError,
  isAssistantEmailQueryResult,
  sendAssistantCommandStream,
} from "@/lib/assistant-api";
import { dispatchAssistantAction } from "@/lib/assistant-actions";
import AssistantEmailResultCard from "@/components/assistant/AssistantEmailResultCard";

type Message = AssistantConversationMessage & {
  id: string;
  data?: unknown;
  actions?: AssistantUIAction[];
  status?: string;
  requiresClarification?: boolean;
  workflowApproval?: {
    request: AssistantCommandRequest;
    steps: AssistantWorkflowStep[];
    state: "pending" | "approved" | "rejected";
  };
  actionFeedback?: string;
  streaming?: boolean;
};

type AssistantPanelProps = {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string>;
  pageContext: AssistantPageContext;
  availableEmailIds: ReadonlySet<string>;
  onOpenEmail: (emailId: string) => void;
  onOpenResultEmail: (email: AssistantEmailSummary) => void;
  onOpenCompose: (parameters: Record<string, unknown>) => string;
  onScheduleProposal: (proposal: ScheduleProposal) => void;
  onNavigateToInbox: () => void;
  onSetFilter: (filter: "ALL" | "URGENT") => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

const MAX_HISTORY_MESSAGES = 20;

const isRetryableError = (error: unknown) =>
  error instanceof AssistantApiError &&
  (error.status === undefined || error.status === 429 || error.status >= 500);

const isApplicationError = (status?: string) =>
  status === "error" || status === "invalid_request" || status === "rate_limited" || status === "unsupported";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const workflowTools: AssistantWorkflowStep["tool"][] = [
  "search_emails",
  "read_email",
  "summarize_email",
  "triage_email",
  "draft_email",
  "send_email_reply",
  "mark_email_read",
  "mark_email_unread",
  "archive_emails",
  "schedule_event",
  "unknown",
];

const isAssistantWorkflowStep = (value: unknown): value is AssistantWorkflowStep =>
  isRecord(value) &&
  typeof value.tool === "string" &&
  workflowTools.some((tool) => tool === value.tool) &&
  isRecord(value.parameters) &&
  typeof value.description === "string";

const getWorkflowProposal = (data: unknown): AssistantWorkflowStep[] => {
  if (!data || typeof data !== "object" || Array.isArray(data) || !("approved_workflow" in data)) {
    return [];
  }
  const steps = data.approved_workflow;
  return Array.isArray(steps) && steps.every(isAssistantWorkflowStep)
    ? steps
    : [];
};

type WorkflowResult = {
  tool: string;
  status: string;
  message?: string;
  data?: {
    id?: string;
    email_id?: string;
    sender?: string;
    to?: string;
    subject?: string;
    body?: string;
    received_at?: string;
  } | null;
};

const getCalendarProposal = (
  data: unknown,
  selectedEmailId: string | null,
): ScheduleProposal | null => {
  if (!isRecord(data) || !isRecord(data.calendar_event)) return null;

  const proposalEnvelope =
    data.confirmation_required === true
      ? data
      : data.calendar_event.confirmation_required === true
        ? data.calendar_event
        : null;
  if (!proposalEnvelope || !isRecord(proposalEnvelope.calendar_event)) return null;

  const event = proposalEnvelope.calendar_event;
  const emailId =
    (typeof proposalEnvelope.email_id === "string" && proposalEnvelope.email_id) ||
    (typeof data.email_id === "string" && data.email_id) ||
    selectedEmailId;
  if (
    !emailId ||
    typeof event.draft_id !== "string" ||
    typeof event.title !== "string" ||
    typeof event.start_time !== "string" ||
    typeof event.end_time !== "string" ||
    typeof event.confidence !== "number" ||
    !Number.isFinite(event.confidence) ||
    !Array.isArray(event.attendees) ||
    !event.attendees.every((attendee) => typeof attendee === "string") ||
    !["PENDING", "APPROVED", "CANCELLED"].includes(String(event.status)) ||
    (event.ambiguity !== undefined &&
      event.ambiguity !== null &&
      typeof event.ambiguity !== "string") ||
    (event.extraction_status !== undefined &&
      !["complete", "missing", "ambiguous", "invalid"].includes(
        String(event.extraction_status),
      ))
  ) {
    return null;
  }

  return {
    email_id: emailId,
    draft_id: event.draft_id,
    title: event.title,
    start_time: event.start_time,
    end_time: event.end_time,
    status: event.status as ScheduleProposal["status"],
    attendees: event.attendees,
    confidence: event.confidence,
    ...(event.ambiguity === undefined ? {} : { ambiguity: event.ambiguity }),
    ...(event.extraction_status === undefined
      ? {}
      : { extraction_status: event.extraction_status as ScheduleProposal["extraction_status"] }),
  };
};

const isWorkflowResultData = (
  value: unknown,
): value is NonNullable<WorkflowResult["data"]> => {
  if (!isRecord(value)) return false;
  return ["id", "email_id", "sender", "to", "subject", "body", "received_at"].every(
    (key) => !(key in value) || typeof value[key] === "string",
  );
};

const getWorkflowResults = (data: unknown): WorkflowResult[] => {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !("results" in data) ||
    !Array.isArray(data.results)
  ) {
    return [];
  }

  return data.results.filter(
    (result): result is WorkflowResult =>
      typeof result === "object" &&
      result !== null &&
      "tool" in result &&
      typeof result.tool === "string" &&
      "status" in result &&
      typeof result.status === "string" &&
      (!("message" in result) || typeof result.message === "string") &&
      (!("data" in result) ||
        result.data === null ||
        isWorkflowResultData(result.data)),
  );
};


const newMessage = (
  role: "assistant" | "user",
  content: string,
): Message => ({ id: crypto.randomUUID(), role, content });

const suggestions = [
  {
    icon: "✉",
    label: "Summarize my inbox",
    prompt: "Summarize my inbox",
  },
  {
    icon: "⚡",
    label: "Show urgent emails",
    prompt: "Show my urgent emails",
  },
  {
    icon: "◉",
    label: "Find high-priority emails",
    prompt: "Show high-priority emails",
  },
  {
    icon: "↗",
    label: "Emails needing attention",
    prompt: "Show emails that need my attention",
  },
];

export default function AssistantPanel({
  apiBaseUrl,
  getAccessToken,
  pageContext,
  availableEmailIds,
  onOpenEmail,
  onOpenResultEmail,
  onOpenCompose,
  onScheduleProposal,
  onNavigateToInbox,
  onSetFilter,
  isOpen,
  onOpen,
  onClose,
}: AssistantPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [retryPayload, setRetryPayload] = useState<AssistantCommandRequest | null>(null);
  const conversationId = useRef<string | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const conversationEnd = useRef<HTMLDivElement | null>(null);
  const submittedWorkflowApprovals = useRef(new Set<string>());

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, error, isThinking]);

  useEffect(
    () => () => {
      requestController.current?.abort();
    },
    [],
  );

  const submitRequest = async (
    payload: AssistantCommandRequest,
    addUserMessage: boolean,
  ) => {
    if (requestController.current) return;
    const controller = new AbortController();
    requestController.current = controller;
    const assistantMessage = newMessage("assistant", "");

    if (addUserMessage) setRetryPayload(null);
    setMessages((previous) => [
      ...previous,
      ...(addUserMessage ? [newMessage("user", payload.message)] : []),
      { ...assistantMessage, streaming: true },
    ]);
    if (addUserMessage) setInput("");
    setIsThinking(true);
    setError("");

    try {
      const accessToken = await getAccessToken();
      const result = await sendAssistantCommandStream(
        apiBaseUrl,
        accessToken,
        payload,
        controller.signal,
        (token) => {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: message.content + token }
                : message,
            ),
          );
        },
      );
      if (!controller.signal.aborted) {
        const workflowSteps = getWorkflowProposal(result.data);
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  content: result.message,
                  streaming: false,
                  actions: result.actions,
                  data: result.data,
                  status: result.status,
                  requiresClarification: result.requires_clarification,
                  ...(result.requires_confirmation &&
                  !payload.confirm_workflow &&
                  workflowSteps.length > 0
                    ? {
                        workflowApproval: {
                          request: payload,
                          steps: workflowSteps,
                          state: "pending" as const,
                        },
                      }
                    : {}),
                }
              : message,
          ),
        );
        const calendarProposal = getCalendarProposal(
          result.data,
          payload.page_context.selected_email_id,
        );
        if (calendarProposal) onScheduleProposal(calendarProposal);
        if (result.status === "error" || result.status === "rate_limited") {
          setRetryPayload(payload);
        } else {
          setRetryPayload(null);
        }
      }
    } catch (requestError) {
      setMessages((previous) =>
        previous.flatMap((message) => {
          if (message.id !== assistantMessage.id) return [message];
          return message.content
            ? [{ ...message, streaming: false, ...(controller.signal.aborted ? {} : { status: "error" }) }]
            : [];
        }),
      );
      if (!controller.signal.aborted) {
        setError(
          requestError instanceof AssistantApiError
            ? requestError.message
            : "Could not authenticate with the assistant service. Please reconnect your Google account and try again.",
        );
        setRetryPayload(isRetryableError(requestError) ? payload : null);
      }
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setIsThinking(false);
      }
    }
  };

  const handleSend = (text?: string, queryContext?: AssistantQuerySpec) => {
    const command = (text ?? input).trim();
    if (!command || requestController.current) return;

    const payload: AssistantCommandRequest = {
      message: command,
      session_id: conversationId.current ?? (conversationId.current = crypto.randomUUID()),
      page_context: { ...pageContext },
      conversation_history: messages
        .slice(-MAX_HISTORY_MESSAGES)
        .map(({ role, content }) => ({ role, content })),
      ...(queryContext ? { query_context: queryContext } : {}),
    };
    void submitRequest(payload, true);
  };

  const handleRetry = () => {
    if (!retryPayload || requestController.current) return;
    const payload = retryPayload;
    setRetryPayload(null);
    void submitRequest(payload, false);
  };

  const approveWorkflow = (messageId: string) => {
    if (requestController.current || submittedWorkflowApprovals.current.has(messageId)) return;
    const message = messages.find((item) => item.id === messageId);
    const approval = message?.workflowApproval;
    if (!approval || approval.state !== "pending") return;

    submittedWorkflowApprovals.current.add(messageId);
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId && item.workflowApproval
          ? {
              ...item,
              workflowApproval: { ...item.workflowApproval, state: "approved" },
            }
          : item,
      ),
    );
    void submitRequest(
      {
        ...approval.request,
        approved_workflow: approval.steps,
        confirm_workflow: true,
      },
      false,
    );
  };

  const rejectWorkflow = (messageId: string) => {
    if (requestController.current) return;
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId &&
        item.workflowApproval?.state === "pending"
          ? {
              ...item,
              workflowApproval: { ...item.workflowApproval, state: "rejected" },
            }
          : item,
      ),
    );
  };

  const stopGeneration = () => requestController.current?.abort();

  const openResultEmail = (email: AssistantEmailSummary) => {
    onOpenResultEmail(email);
    onClose();
  };

  const runAction = (messageId: string, action: AssistantUIAction) => {
    const feedback = dispatchAssistantAction(action, {
      availableEmailIds,
      openEmail: (emailId) => {
        onOpenEmail(emailId);
        onClose();
      },
      navigateToInbox: onNavigateToInbox,
      openCompose: onOpenCompose,
      setFilter: onSetFilter,
    });
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, actionFeedback: feedback } : message,
      ),
    );
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open AI assistant"
          aria-expanded={false}
          className="fixed bottom-4 right-4 z-30 flex h-11 items-center gap-2 rounded-full border border-violet-300/20 bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-black/30 transition-colors hover:bg-violet-500 sm:bottom-5 sm:right-5"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          AI Assistant
        </button>
      )}
      <aside
        aria-label="AI Assistant"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-40 flex h-dvh w-[min(380px,100vw)] flex-col border-l border-white/[0.08] bg-[#0d0e14] text-slate-100 shadow-2xl shadow-black/40 ${isOpen ? "" : "hidden"
          }`}
      >
        {/* Header */}
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/[0.08] px-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-500/[0.08]">
              <Sparkles className="h-4 w-4 text-violet-300" aria-hidden="true" />
            </div>

            <div>
              <h2 className="text-sm font-semibold tracking-wide">AI Assistant</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Your inbox, in context
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimize AI assistant"
              title="Minimize assistant"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (requestController.current) return;
                  setMessages([]);
                  setError("");
                  conversationId.current = null;
                  setRetryPayload(null);
                }}
                disabled={isThinking}
                aria-label="Clear conversation"
                title="Clear conversation"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI assistant"
              title="Close assistant"
              aria-expanded={isOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Conversation */}
        <div
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-5"
          aria-live="polite"
          aria-busy={isThinking}
        >
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col">
              <div className="mb-7 mt-5">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/[0.08]">
                  <Sparkles className="h-5 w-5 text-violet-300" />
                </div>

                <h3 className="text-[24px] font-semibold leading-tight tracking-[-0.025em]">
                  Your inbox,
                  <br />
                  <span className="text-violet-300">
                    under control.
                  </span>
                </h3>

                <p className="mt-3 max-w-[280px] text-sm leading-6 text-slate-400">
                  Ask me to find emails, surface important messages,
                  or help you decide what needs attention.
                </p>
              </div>

              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Try asking
              </div>

              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    onClick={() => void handleSend(suggestion.prompt)}
                    disabled={isThinking}
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.015] p-3 text-left transition-colors hover:border-violet-400/25 hover:bg-violet-500/[0.04]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-sm text-violet-300 transition group-hover:bg-violet-500/10">
                      {suggestion.icon}
                    </span>

                    <span className="flex-1 text-[12px] font-medium text-slate-300">
                      {suggestion.label}
                    </span>

                    <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300">
                      →
                    </span>
                  </button>
                ))}
              </div>

            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message, messageIndex) => {
                const emailResults = isAssistantEmailQueryResult(message.data)
                  ? message.data
                  : null;
                const workflowResults = getWorkflowResults(message.data);
                const queryIdentity = emailResults
                  ? JSON.stringify([
                    emailResults.query_spec.filters,
                    emailResults.query_spec.sort_by,
                    emailResults.query_spec.sort_order,
                    emailResults.query_spec.limit,
                  ])
                  : "";
                const displayedEmailIds = new Set<string>();
                if (emailResults && emailResults.offset > 0) {
                  messages.slice(0, messageIndex).forEach((previousMessage) => {
                    if (
                      isAssistantEmailQueryResult(previousMessage.data) &&
                      JSON.stringify([
                        previousMessage.data.query_spec.filters,
                        previousMessage.data.query_spec.sort_by,
                        previousMessage.data.query_spec.sort_order,
                        previousMessage.data.query_spec.limit,
                      ]) === queryIdentity
                    ) {
                      previousMessage.data.items.forEach((email) =>
                        displayedEmailIds.add(email.id),
                      );
                    }
                  });
                }
                const uniqueEmails =
                  emailResults?.items.filter((email) => {
                    if (displayedEmailIds.has(email.id)) return false;
                    displayedEmailIds.add(email.id);
                    return true;
                  }) ?? [];
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                      }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-500/[0.08] text-violet-300">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}

                    <div className="min-w-0 max-w-[85%] flex-1">
                      <div
                        className={`rounded-2xl px-3.5 py-3 text-[12px] leading-6 ${message.role === "user"
                            ? "rounded-br-md border border-violet-400/15 bg-violet-500/[0.12] text-violet-100"
                            : isApplicationError(message.status)
                              ? "rounded-tl-md border border-rose-500/20 bg-rose-500/[0.06] text-rose-200"
                              : "rounded-tl-md border border-white/[0.07] bg-[#13151d] text-slate-300"
                          }`}
                        role={message.role === "assistant" && isApplicationError(message.status) ? "alert" : undefined}
                      >
                        {message.content || (message.streaming ? "Thinking…" : "")}
                        {message.streaming && (
                          <span
                            aria-label="Assistant is typing"
                            className="ml-1 inline-block animate-pulse text-violet-300"
                          >
                            ▍
                          </span>
                        )}
                      </div>
                      {message.role === "assistant" && message.requiresClarification && (
                        <p className="mt-2 text-[10px] font-medium text-amber-200">
                          The assistant needs more information.
                        </p>
                      )}
                      {message.role === "assistant" &&
                        (message.status === "error" || message.status === "rate_limited") &&
                        retryPayload && (
                          <button
                            type="button"
                            onClick={handleRetry}
                            className="mt-2 rounded-md border border-rose-300/20 px-2.5 py-1 text-[10px] font-medium text-rose-100 hover:bg-rose-400/10"
                          >
                            Retry
                          </button>
                        )}
                      {message.role === "assistant" && emailResults && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] text-slate-400">
                            {emailResults.total} matching {emailResults.total === 1 ? "email" : "emails"}
                          </p>
                          {emailResults.items.length === 0 ? (
                            <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-[11px] text-slate-400">
                              No emails matched this search.
                            </p>
                          ) : (
                            uniqueEmails.length > 0 ? uniqueEmails.map((email) => (
                              <AssistantEmailResultCard
                                key={email.id}
                                email={email}
                                onOpen={openResultEmail}
                              />
                            )) : (
                              <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-[11px] text-slate-400">
                                No additional emails in this page.
                              </p>
                            )
                          )}
                          {emailResults.next_offset !== null && (
                            <button
                              type="button"
                              disabled={isThinking}
                              onClick={() => handleSend("Show more emails", emailResults.query_spec)}
                              className="w-full rounded-lg border border-violet-400/20 px-3 py-2 text-[11px] font-medium text-violet-200 transition hover:bg-violet-500/10 disabled:opacity-50"
                            >
                              Show more
                            </button>
                          )}
                        </div>
                      )}
                      {message.role === "assistant" && message.workflowApproval && (
                        <div className="mt-3 space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                            Proposed workflow — not executed
                          </p>
                          {message.workflowApproval.steps.map((step, index) => (
                            <p key={`${step.tool}-${index}`} className="text-[11px] text-slate-300">
                              {index + 1}. {step.description}
                            </p>
                          ))}
                          {message.workflowApproval.state === "pending" ? (
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isThinking}
                                onClick={() => approveWorkflow(message.id)}
                                className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isThinking}
                                onClick={() => rejectWorkflow(message.id)}
                                className="rounded-lg border border-white/[0.12] px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-rose-400/25 hover:bg-rose-400/[0.06] hover:text-rose-200 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <p role="status" className="text-[10px] leading-4 text-slate-400">
                              {message.workflowApproval.state === "rejected"
                                ? "Rejected. No operation was executed."
                                : "Approval submitted. The workflow request is being processed."}
                            </p>
                          )}
                        </div>
                      )}
                      {message.role === "assistant" && workflowResults.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                          {workflowResults.map((result, index) => (
                            <div
                              key={`${result.tool}-${index}`}
                              className="space-y-1.5 text-[11px] text-slate-400"
                            >
                              <p className="font-medium text-slate-300">
                                {result.tool.replaceAll("_", " ")}: {result.status}
                                {result.message ? ` — ${result.message}` : ""}
                              </p>
                              {result.data && (
                                <div className="space-y-1.5 border-l border-white/[0.08] pl-2.5">
                                  {result.data.sender && (
                                    <p>
                                      <span className="text-slate-500">From: </span>
                                      {result.data.sender}
                                    </p>
                                  )}
                                  {result.data.to && (
                                    <p>
                                      <span className="text-slate-500">To: </span>
                                      {result.data.to}
                                    </p>
                                  )}
                                  {result.data.subject !== undefined && (
                                    <p>
                                      <span className="text-slate-500">Subject: </span>
                                      {result.data.subject || "(no subject)"}
                                    </p>
                                  )}
                                  {result.data.received_at && (
                                    <p>
                                      <span className="text-slate-500">Received: </span>
                                      {result.data.received_at}
                                    </p>
                                  )}
                                  {result.data.body && (
                                    <p className="whitespace-pre-wrap break-words leading-5 text-slate-300">
                                      <span className="text-slate-500">
                                        {result.tool === "draft_email" ? "Draft reply: " : "Message: "}
                                      </span>
                                      {result.data.body}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {message.role === "assistant" && message.actions?.length ? (
                        <div className="mt-3 space-y-2">
                          {message.actions.map((action, index) => (
                            <button
                              key={`${action.type}-${index}`}
                              type="button"
                              onClick={() => runAction(message.id, action)}
                              className="block w-full rounded-lg border border-violet-400/20 px-3 py-2 text-left text-[11px] text-violet-200 transition hover:bg-violet-500/10"
                            >
                              {action.description}
                            </button>
                          ))}
                          {message.actionFeedback && (
                            <p role="status" className="text-[10px] text-slate-400">
                              {message.actionFeedback}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {error && (
                <div role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-3 text-xs leading-5 text-rose-200">
                  <p>{error}</p>
                  {retryPayload && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="mt-2 rounded-md border border-rose-300/20 px-2.5 py-1 text-[10px] font-medium text-rose-100 hover:bg-rose-400/10"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
              <div ref={conversationEnd} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-white/[0.08] bg-[#0b0c12] p-3 sm:p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
            className="rounded-xl border border-white/[0.10] bg-[#13151d] p-2 transition-colors focus-within:border-violet-400/40 focus-within:ring-2 focus-within:ring-violet-400/10"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isThinking}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask anything about your inbox..."
              rows={2}
              maxLength={2000}
              className="w-full resize-none bg-transparent px-2 py-2 text-[13px] leading-5 text-slate-200 outline-none placeholder:text-slate-600"
            />

            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[10px] text-slate-600">
                Enter to send · Shift + Enter for a new line
              </span>

              {isThinking ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  aria-label="Stop generating"
                  title="Stop generating"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/80 text-white transition-colors hover:bg-rose-400"
                >
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 19V5M6 11L12 5L18 11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </form>

          <p className="mt-3 text-center text-[10px] text-slate-600">
            AI-generated responses may be inaccurate.
          </p>
        </div>
      </aside>
    </>
  );
}