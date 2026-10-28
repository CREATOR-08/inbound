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

const getSenderDetails = (sender: string) => {
  const markdownAddress = sender.match(/^(.*?)\s*\[([^\]]+)\]\(mailto:[^)]+\)\s*$/i);
  if (markdownAddress) {
    return { name: markdownAddress[1].trim(), email: markdownAddress[2].trim() };
  }
  const address = sender.match(/^(.*?)\s*<([^<>]+)>\s*$/);
  if (address) return { name: address[1].trim(), email: address[2].trim() };
  return { name: sender.trim(), email: "" };
};

const getInitials = (value: string) =>
  value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

const replaceUnavailableImage = (image: HTMLImageElement) => {
  const fallback = image.ownerDocument.createElement("span");
  fallback.className = "email-image-fallback";
  fallback.textContent = image.getAttribute("alt")?.trim() || "Image unavailable";
  image.replaceWith(fallback);
};

const sanitizeEmailHtml = (html: string) => {
  const document = new DOMParser().parseFromString(html, "text/html");
  document
    .querySelectorAll(
      "script,style,iframe,frame,object,embed,form,input,button,select,option,textarea,link,meta,base,video,audio,source,svg,math",
    )
    .forEach((element) => element.remove());

  const allowedStyles = new Set([
    "background-color",
    "border",
    "border-color",
    "border-style",
    "border-width",
    "color",
    "display",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "height",
    "line-height",
    "margin",
    "padding",
    "text-align",
    "text-decoration",
    "vertical-align",
    "white-space",
    "width",
  ]);

  document.body.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || name === "srcset" || name === "background") {
        element.removeAttribute(attribute.name);
      } else if (name === "style") {
        const parsedStyle = document.createElement("span");
        parsedStyle.setAttribute("style", value);
        const safeDeclarations: string[] = [];
        for (const property of Array.from(parsedStyle.style)) {
          const propertyValue = parsedStyle.style.getPropertyValue(property);
          if (
            allowedStyles.has(property) &&
            !/url\s*\(|expression\s*\(|javascript\s*:/i.test(propertyValue)
          ) {
            safeDeclarations.push(`${property}: ${propertyValue}`);
          }
        }
        if (safeDeclarations.length > 0) {
          element.setAttribute("style", safeDeclarations.join("; "));
        } else {
          element.removeAttribute("style");
        }
      } else if (name !== "href" && name.endsWith("href")) {
        element.removeAttribute(attribute.name);
      } else if (name === "href" && !/^(https?:|mailto:|#)/i.test(value)) {
        element.removeAttribute(attribute.name);
      } else if (name === "src" && !/^data:image\/(?:png|gif|jpeg|webp);base64,/i.test(value)) {
        if (element.tagName.toLowerCase() === "img") {
          if (element instanceof HTMLImageElement) replaceUnavailableImage(element);
        } else {
          element.removeAttribute(attribute.name);
        }
      }
    }
  });

  document.body.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (/^https?:/i.test(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
  document.body.querySelectorAll("img").forEach((image) => {
    image.removeAttribute("width");
    image.removeAttribute("height");
    if (!image.hasAttribute("src")) replaceUnavailableImage(image);
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
  const sender = getSenderDetails(thread.sender || "");
  const senderLabel = sender.name || sender.email || "Unknown sender";
  const bodyText = thread.body?.trim() || "";
  const categoryLabel = thread.category?.replaceAll("_", " ");
  const priorityLabel = thread.priority?.replaceAll("_", " ");
  const highPriority = ["HIGH", "URGENT"].includes(thread.priority?.toUpperCase() || "");

  const resizeEmailFrame = (frame: HTMLIFrameElement) => {
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return;
    frameDocument.querySelectorAll("img").forEach((image) => {
      image.addEventListener(
        "error",
        () => {
          replaceUnavailableImage(image);
          window.requestAnimationFrame(() => resizeEmailFrame(frame));
        },
        { once: true },
      );
      if (image.complete && image.naturalWidth === 0) replaceUnavailableImage(image);
    });
    const contentHeight = Math.max(
      frameDocument.documentElement.scrollHeight,
      frameDocument.body.scrollHeight,
    );
    frame.style.height = `${contentHeight}px`;
  };

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
      <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-[#101117] px-3 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to inbox</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
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
              title="Schedule meeting"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
            >
              {isScheduling ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{isScheduling ? "Extracting…" : "Schedule meeting"}</span>
              <span className="sm:hidden">{isScheduling ? "…" : "Schedule"}</span>
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-9">
          <section className="mb-7 border-b border-white/[0.07] pb-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                highPriority
                  ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-300"
                  : "border-white/[0.09] bg-white/[0.035] text-slate-400"
              }`}>
                {priorityLabel ? `${priorityLabel} priority` : "Priority unavailable"}
              </span>
              <span className="rounded-full border border-white/[0.09] bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                {categoryLabel || "Uncategorized"}
              </span>
            </div>

            <h1 className="break-words text-2xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-[30px]">
              {thread.subject || "(no subject)"}
            </h1>

            <div className="mt-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400/10 text-xs font-semibold text-violet-200 ring-1 ring-violet-300/15"
                >
                  {getInitials(sender.name || sender.email || thread.sender || "")}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-100">{senderLabel}</p>
                  {sender.email && <p className="break-all text-xs text-slate-500">{sender.email}</p>}
                </div>
              </div>
              <time
                dateTime={thread.received_at || thread.date || undefined}
                className="pt-1 text-xs text-slate-400"
              >
                {displayDate(thread.received_at || thread.date)}
              </time>
            </div>

            <details className="mt-4 text-xs text-slate-400">
              <summary className="w-fit cursor-pointer select-none rounded-md py-1 text-slate-500 outline-none transition hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-violet-400">
                Message details
              </summary>
              <dl className="mt-3 grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:max-w-2xl">
                <dt className="text-slate-500">From</dt>
                <dd className="break-all text-slate-300">{thread.sender || "Sender unavailable"}</dd>
                <dt className="text-slate-500">To</dt>
                <dd className="break-all text-slate-300">{thread.recipient || thread.to || "Recipient unavailable"}</dd>
                <dt className="text-slate-500">Date</dt>
                <dd className="text-slate-300">{displayDate(thread.received_at || thread.date)}</dd>
              </dl>
            </details>
          </section>

          <section aria-label="Email message" className="min-w-0">
            {isLoadingBody ? (
              <div role="status" aria-label="Loading email message" className="space-y-4 py-4">
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.07]" />
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-white/[0.05]" />
                <div className="pt-4">
                  <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
                  <div className="mt-3 h-3 w-5/6 animate-pulse rounded bg-white/[0.05]" />
                </div>
                <span className="sr-only">Loading email message</span>
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
                sandbox="allow-same-origin allow-popups"
                referrerPolicy="no-referrer"
                onLoad={(event) => resizeEmailFrame(event.currentTarget)}
                srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;max-width:100%}html,body{width:100%;min-height:100%;margin:0}body{padding:24px clamp(16px,4vw,40px);font:15px/1.75 ui-sans-serif,system-ui,sans-serif;color:#1f2937;background:#f8fafc;overflow-wrap:anywhere;word-break:normal}a{color:#4f46e5;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}img{display:inline-block;max-width:100%;height:auto;object-fit:contain}table{display:block;width:100%;overflow-x:auto;border-collapse:collapse}pre{max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere}blockquote{margin-left:0;padding-left:16px;border-left:3px solid #cbd5e1;color:#475569}.email-image-fallback{display:inline-block;max-width:100%;padding:8px 12px;border:1px dashed #94a3b8;border-radius:8px;background:#f1f5f9;color:#64748b;font:13px/1.5 ui-sans-serif,system-ui,sans-serif;overflow-wrap:anywhere}</style></head><body>${safeHtml}</body></html>`}
                className="block w-full border-0 bg-slate-50"
                style={{ height: "1px" }}
              />
            ) : (
              bodyText ? (
                <div className="rounded-xl border border-white/[0.07] bg-[#101117] px-5 py-6 text-sm leading-7 text-slate-200 sm:px-8">
                  <pre className="whitespace-pre-wrap break-words font-sans">{bodyText}</pre>
                </div>
              ) : (
                <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-8 text-center text-sm text-slate-500">
                  This email has no displayable body.
                </p>
              )
            )}
          </section>

          <div className="mt-8 border-t border-white/[0.07] pt-6">
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
