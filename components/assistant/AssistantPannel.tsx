"use client";

import { useState } from "react";

type Message = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

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
    label: "Find unread emails",
    prompt: "Show my unread emails",
  },
  {
    icon: "↗",
    label: "Emails needing attention",
    prompt: "Show emails that need my attention",
  },
];

type AssistantPanelProps = {
  onClose: () => void;
};

export default function AssistantPanel({
  onClose,
}: AssistantPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // Temporary UI-only handler.
  // We will connect this to FastAPI and Gemini later.
  const handleSend = async (text?: string) => {
    const command = (text ?? input).trim();

    if (!command || isThinking) return;

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        role: "user",
        content: command,
      },
    ]);

    setInput("");
    setIsThinking(true);

    // Temporary response to demonstrate the chat UI.
    window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            "I'm ready to help. UI actions and email intelligence will be connected in the next step.",
        },
      ]);

      setIsThinking(false);
    }, 600);
  };

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-white/[0.08] bg-[#0e1017] text-slate-100">
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
            <h2 className="text-sm font-semibold tracking-wide">
              Inbound AI
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Your personal inbox assistant
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close AI assistant"
          title="Close assistant"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
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

            <div className="mt-auto pt-8">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-medium text-slate-300">
                    Preview mode
                  </span>
                </div>

                <p className="text-[11px] leading-5 text-slate-500">
                  The assistant interface is ready. AI-powered
                  actions will be enabled when the backend is connected.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) => (
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

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-3 text-[12px] leading-6 ${
                    message.role === "user"
                      ? "rounded-br-md bg-violet-500/15 text-violet-100"
                      : "rounded-tl-md border border-white/[0.07] bg-white/[0.025] text-slate-300"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

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
  );
}