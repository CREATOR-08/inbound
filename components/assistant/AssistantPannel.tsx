"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Trash2, X } from "lucide-react";
import type {
  AssistantCommandRequest,
  AssistantConversationMessage,
  AssistantEmailSummary,
  AssistantPageContext,
  AssistantQuerySpec,
  AssistantUIAction,
} from "@/Types/assistant";
import {
  AssistantApiError,
  isAssistantEmailQueryResult,
  sendAssistantCommand,
} from "@/lib/assistant-api";
import { dispatchAssistantAction } from "@/lib/assistant-actions";
import AssistantEmailResultCard from "@/components/assistant/AssistantEmailResultCard";

type Message = AssistantConversationMessage & {
  id: string;
  data?: unknown;
  actions?: AssistantUIAction[];
  status?: string;
  requiresClarification?: boolean;
  requiresConfirmation?: boolean;
  actionFeedback?: string;
};

type AssistantPanelProps = {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string>;
  pageContext: AssistantPageContext;
  availableEmailIds: ReadonlySet<string>;
  onOpenEmail: (emailId: string) => void;
  onOpenResultEmail: (email: AssistantEmailSummary) => void;
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

const getWorkflowProposal = (data: unknown) => {
  if (!data || typeof data !== "object" || Array.isArray(data) || !("approved_workflow" in data)) {
    return [];
  }
  const steps = data.approved_workflow;
  if (!Array.isArray(steps)) return [];
  return steps.filter(
    (step): step is { tool: string; description: string } =>
      typeof step === "object" &&
      step !== null &&
      "tool" in step &&
      typeof step.tool === "string" &&
      "description" in step &&
      typeof step.description === "string",
  );
};

const getWorkflowResults = (data: unknown) => {
  if (!data || typeof data !== "object" || Array.isArray(data) || !("results" in data)) {
    return [];
  }
  const results = data.results;
  if (!Array.isArray(results)) return [];
  return results.filter(
    (result): result is { tool: string; status: string; message?: string } =>
      typeof result === "object" &&
      result !== null &&
      "tool" in result &&
      typeof result.tool === "string" &&
      "status" in result &&
      typeof result.status === "string",
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

    if (addUserMessage) {
      setRetryPayload(null);
      setMessages((previous) => [
        ...previous,
        newMessage("user", payload.message),
      ]);
      setInput("");
    }
    setIsThinking(true);
    setError("");

    try {
      const accessToken = await getAccessToken();
      const result = await sendAssistantCommand(
        apiBaseUrl,
        accessToken,
        payload,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setMessages((previous) => [
          ...previous,
          {
            ...newMessage("assistant", result.message),
            actions: result.actions,
            data: result.data,
            status: result.status,
            requiresClarification: result.requires_clarification,
            requiresConfirmation: result.requires_confirmation,
          },
        ]);
        if (result.status === "error" || result.status === "rate_limited") {
          setRetryPayload(payload);
        } else {
          setRetryPayload(null);
        }
      }
    } catch (requestError) {
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
          className="fixed bottom-5 right-5 z-30 flex h-12 items-center gap-2 rounded-full border border-violet-300/20 bg-violet-600 px-4 text-sm font-medium text-white shadow-xl shadow-violet-950/40 transition hover:bg-violet-500"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          AI Assistant
        </button>
      )}
      <aside
        aria-label="AI Assistant"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-40 flex h-dvh w-[min(360px,100vw)] flex-col border-l border-white/[0.08] bg-[#0e1017] text-slate-100 shadow-2xl shadow-black/40 ${
          isOpen ? "" : "hidden"
        }`}
      >
      {/* Header */}
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/[0.08] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 2.5L14.5 9.5L21.5 12L14.5 14.5L12 21.5L9.5 14.5L2.5 12L9.5 9.5L12 2.5Z"
                stroke="#a78bfa"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-sm font-semibold tracking-wide">AI Assistant</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Your personal inbox assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
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
        className="flex-1 overflow-y-auto px-5 py-5"
        aria-live="polite"
        aria-busy={isThinking}
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col">
            <div className="mb-7 mt-5">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-indigo-500/10">
                <span className="text-2xl text-violet-300">✦</span>
              </div>

              <h3 className="text-[25px] font-semibold leading-tight tracking-tight">
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
                  className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.015] p-3.5 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.06]"
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
                className={`flex gap-3 ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-sm text-violet-300">
                    ✦
                  </div>
                )}

                <div className="min-w-0 max-w-[85%] flex-1">
                  <div
                    className={`rounded-2xl px-3.5 py-3 text-[12px] leading-6 ${
                      message.role === "user"
                        ? "rounded-br-md bg-violet-500/15 text-violet-100"
                        : isApplicationError(message.status)
                          ? "rounded-tl-md border border-rose-500/20 bg-rose-500/[0.06] text-rose-200"
                          : "rounded-tl-md border border-white/[0.07] bg-white/[0.025] text-slate-300"
                    }`}
                    role={message.role === "assistant" && isApplicationError(message.status) ? "alert" : undefined}
                  >
                    {message.content}
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
                {message.role === "assistant" && message.requiresConfirmation && (
                  <div className="mt-3 space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                      Proposed workflow — not executed
                    </p>
                    {getWorkflowProposal(message.data).map((step, index) => (
                      <p key={`${step.tool}-${index}`} className="text-[11px] text-slate-300">
                        {index + 1}. {step.description}
                      </p>
                    ))}
                    <p className="text-[10px] leading-4 text-slate-500">
                      Approval is unavailable because the backend does not bind approval to this exact plan.
                    </p>
                  </div>
                )}
                {message.role === "assistant" && getWorkflowResults(message.data).length > 0 && (
                  <div className="mt-3 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    {getWorkflowResults(message.data).map((result, index) => (
                      <p key={`${result.tool}-${index}`} className="text-[11px] text-slate-400">
                        {result.tool}: {result.status}
                        {result.message ? ` — ${result.message}` : ""}
                      </p>
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

            {isThinking && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                  ✦
                </div>

                <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" />
                </div>
              </div>
            )}
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
      <div className="shrink-0 border-t border-white/[0.08] p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
          className="rounded-2xl border border-white/[0.10] bg-[#141620] p-2 transition focus-within:border-violet-400/40"
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
            className="w-full resize-none bg-transparent px-2 py-2 text-[12px] leading-5 text-slate-200 outline-none placeholder:text-slate-600"
          />

          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[10px] text-slate-600">
              Enter to send · Shift + Enter for a new line
            </span>

            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-30"
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