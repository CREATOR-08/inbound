"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  LoaderCircle,
  Mail,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { EmailThread, ReplyDraft } from "@/Types/email";

interface EmailDetailViewProps {
  thread: EmailThread;
  isRead: boolean;
  isLoadingBody: boolean;
  bodyError: string;
  onRetryBody: () => void;
  onBack: () => void;
  onArchive: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onSchedule: () => void;
  isScheduling: boolean;
  isScheduled: boolean;
  replyDraft: ReplyDraft | null;
  isDraftingReply: boolean;
  isSendingReply: boolean;
  onOpenReply: (thread: EmailThread) => void;
  onDraftReply: (thread: EmailThread) => void;
  onReplyDraftChange: (replyText: string) => void;
  onCloseReply: () => void;
  onCopyReply: () => void;
  onSendReply: () => void;
}

const displayDate = (value?: string | null) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};

const sanitizeEmailHtml = (html: string) => {
  const document = new DOMParser().parseFromString(html, "text/html");
  document
    .querySelectorAll("script,style,iframe,frame,object,embed,form,input,button,link,meta,base,video,audio,source")
    .forEach((element) => element.remove());

  document.body.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || name === "style" || name === "srcset" || name === "background") {
        element.removeAttribute(attribute.name);
      } else if (name !== "href" && name.endsWith("href")) {
        element.removeAttribute(attribute.name);
      } else if (name === "href" && !/^(https?:|mailto:|#)/i.test(value)) {
        element.removeAttribute(attribute.name);
      } else if (name === "src" && !/^data:image\/(?:png|gif|jpeg|webp);base64,/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  return document.body.innerHTML;
};

export default function EmailDetailView({
  thread,
  isRead,
  isLoadingBody,
  bodyError,
  onRetryBody,
  onBack,
  onArchive,
  onMarkRead,
  onDelete,
  onSchedule,
  isScheduling,
  isScheduled,
  replyDraft,
  isDraftingReply,
  isSendingReply,
  onOpenReply,
  onDraftReply,
  onReplyDraftChange,
  onCloseReply,
  onCopyReply,
  onSendReply,
}: EmailDetailViewProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState<{ emailId: string; html: string } | null>(null);
  const [replyOpenForId, setReplyOpenForId] = useState<string | null>(null);
  const safeHtml = sanitizedHtml?.emailId === thread.id ? sanitizedHtml.html : "";
  const showReply = replyOpenForId === thread.id;
  const activeReply = replyDraft?.email_id === thread.id ? replyDraft : null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSanitizedHtml({
        emailId: thread.id,
        html: thread.body_html ? sanitizeEmailHtml(thread.body_html) : "",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [thread.id, thread.body_html]);

  const handleReply = () => {
    onOpenReply(thread);
    setReplyOpenForId(thread.id);
  };

  return (
    <article className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#0b0c12]">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3 sm:px-7">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to list</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onArchive}
            title="Archive"
            aria-label="Archive email"
            className="rounded-lg p-2.5 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMarkRead}
            title={isRead ? "Mark as unread" : "Mark as read"}
            aria-label={isRead ? "Mark as unread" : "Mark as read"}
            className="rounded-lg p-2.5 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            aria-label="Delete email"
            className="rounded-lg p-2.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <span className="mx-1 h-6 w-px bg-white/[0.08]" />
          {isScheduled ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-2 text-xs font-medium text-emerald-300">
              <Check className="h-4 w-4" />
              Scheduled
            </span>
          ) : (
            <button
              type="button"
              onClick={onSchedule}
              disabled={isScheduling}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
            >
              {isScheduling ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              {isScheduling ? "Extracting…" : "Schedule Meeting"}
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-10 sm:py-10">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              thread.priority?.toUpperCase() === "HIGH" || thread.priority?.toUpperCase() === "URGENT"
                ? "border-rose-400/20 bg-rose-400/[0.07] text-rose-300"
                : "border-white/[0.08] bg-white/[0.03] text-slate-400"
            }`}>
              {thread.priority || "Normal"} priority
            </span>
            {thread.category && (
              <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {thread.category.replaceAll("_", " ")}
              </span>
            )}
          </div>

          <h1 className="break-words text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            {thread.subject || "(no subject)"}
          </h1>

          <dl className="mt-8 grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-3 border-y border-white/[0.07] py-5 text-xs">
            <dt className="text-slate-500">From</dt>
            <dd className="break-all text-slate-200">{thread.sender || "Unknown sender"}</dd>
            <dt className="text-slate-500">To</dt>
            <dd className="break-all text-slate-300">{thread.recipient || thread.to || "You"}</dd>
            <dt className="text-slate-500">Date</dt>
            <dd className="text-slate-400">{displayDate(thread.received_at || thread.date)}</dd>
            <dt className="text-slate-500">Subject</dt>
            <dd className="break-words text-slate-200">{thread.subject || "(no subject)"}</dd>
          </dl>

          <div className="mt-8">
            {isLoadingBody ? (
              <div role="status" className="flex items-center gap-2 py-8 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading message…
              </div>
            ) : bodyError ? (
              <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
                <p className="text-sm text-rose-200">{bodyError}</p>
                <button
                  type="button"
                  onClick={onRetryBody}
                  className="mt-3 text-xs font-semibold text-rose-200 underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
            ) : safeHtml ? (
              <iframe
                title="Email message"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px/1.75 ui-sans-serif,system-ui,sans-serif;color:#d1d5db;background:#0b0c12;margin:0;overflow-wrap:anywhere}a{color:#a78bfa}img{max-width:100%;height:auto}</style></head><body>${safeHtml}</body></html>`}
                className="min-h-[320px] w-full border-0 bg-[#0b0c12]"
                style={{ height: "min(62vh, 760px)" }}
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-300">
                {thread.body || thread.preview || "This email has no readable message body."}
              </pre>
            )}
          </div>

          <div className="mt-10 border-t border-white/[0.07] pt-6">
            {!showReply ? (
              <button
                type="button"
                onClick={handleReply}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-sm text-slate-400 transition hover:border-violet-400/20 hover:text-white"
              >
                <Mail className="h-4 w-4" />
                Reply to {thread.sender}
              </button>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101117]">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                  <span className="text-xs font-medium text-slate-300">Reply to {thread.sender}</span>
                  <button
                    type="button"
                    onClick={() => { onCloseReply(); setReplyOpenForId(null); }}
                    disabled={isSendingReply}
                    aria-label="Discard reply"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  aria-label="Reply message"
                  rows={7}
                  value={activeReply?.reply_text || ""}
                  onChange={(event) => onReplyDraftChange(event.target.value)}
                  placeholder="Write your reply…"
                  className="w-full resize-y bg-transparent px-4 py-4 text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDraftReply(thread)}
                      disabled={isDraftingReply}
                      className="rounded-lg border border-violet-400/20 bg-violet-400/[0.07] px-3 py-2 text-xs font-semibold text-violet-200 disabled:opacity-50"
                    >
                      {isDraftingReply ? "Drafting…" : "Draft with AI"}
                    </button>
                    <button
                      type="button"
                      onClick={onCopyReply}
                      disabled={!activeReply?.reply_text}
                      aria-label="Copy reply"
                      className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-40"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onSendReply}
                    disabled={isSendingReply || !activeReply?.reply_text.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSendingReply ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isSendingReply ? "Sending…" : "Send"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
