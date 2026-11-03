"use client";

import { CalendarClock, Mail, RefreshCw, ShieldAlert, Star } from "lucide-react";
import type { EmailFilter, EmailThread } from "@/Types/email";

interface EmailListViewProps {
  threads: EmailThread[];
  selectedEmailId: string;
  currentFilter: EmailFilter;
  isLoading: boolean;
  isInitialSyncing: boolean;
  initialSyncFailed: boolean;
  isRefreshing: boolean;
  error: string;
  syncError: string;
  hasLoadError: boolean;
  onSelectEmail: (emailId: string) => void;
  onRefresh: () => void;
  onSelectFilter?: (filter: EmailFilter) => void;
  onToggleRead?: (emailId: string) => void;
}

const displayDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const filterTitles: Record<EmailFilter, string> = {
  ALL: "All email",
  UNREAD: "Unread",
  READ: "Read",
  TRIAGED: "Triaged",
  URGENT: "Urgent",
  HIGH_PRIORITY: "High priority",
  SCHEDULED: "Scheduled",
  ARCHIVE: "Archive",
};

export default function EmailListView({
  threads,
  selectedEmailId,
  currentFilter,
  isLoading,
  isInitialSyncing,
  initialSyncFailed,
  isRefreshing,
  error,
  syncError,
  hasLoadError,
  onSelectEmail,
  onRefresh,
  onSelectFilter,
  onToggleRead,
}: EmailListViewProps) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-[#0b0c12]" aria-label="Email list">
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-6 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Mailbox
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-white">
            {filterTitles[currentFilter]}
            <span className="ml-2 text-sm font-normal text-slate-500">{threads.length}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {onSelectFilter && (
            <div
              role="group"
              aria-label="Read status filter"
              className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5"
            >
              <button
                type="button"
                onClick={() => onSelectFilter("ALL")}
                aria-pressed={currentFilter === "ALL"}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  currentFilter === "ALL"
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-900/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onSelectFilter("UNREAD")}
                aria-pressed={currentFilter === "UNREAD"}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  currentFilter === "UNREAD"
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-900/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Unread
              </button>
              <button
                type="button"
                onClick={() => onSelectFilter("READ")}
                aria-pressed={currentFilter === "READ"}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  currentFilter === "READ"
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-900/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Read
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-slate-400 transition hover:border-white/[0.16] hover:text-slate-200 disabled:opacity-50"
            aria-label={isRefreshing ? "Refreshing inbox" : "Refresh inbox"}
            title={isRefreshing ? "Refreshing inbox" : "Refresh inbox"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="mx-5 mt-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[minmax(130px,0.8fr)_minmax(160px,1.1fr)_minmax(180px,2fr)_minmax(90px,auto)_minmax(110px,auto)] items-center gap-4 border-b border-white/[0.06] px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600 max-md:hidden">
          <span>Sender</span>
          <span>Subject</span>
          <span>Preview</span>
          <span>Date</span>
          <span>Priority</span>
        </div>

        {threads.length === 0 && isInitialSyncing ? (
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"
          >
            <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/[0.07]">
              <span className="absolute inset-0 rounded-2xl border border-violet-300/15 animate-pulse" />
              <Mail className="h-6 w-6 text-violet-300 animate-[inbox-mail-float_2.8s_ease-in-out_infinite] motion-reduce:animate-none" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">
              Preparing your inbox
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
              Your initial setup may take a little time. We&apos;re syncing your
              emails from the last 3 days.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Fetching and organizing your emails...
            </p>
            <div
              aria-hidden="true"
              className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/[0.06]"
            >
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 animate-[inbox-sync-progress_1.6s_ease-in-out_infinite]" />
            </div>
          </div>
        ) : threads.length === 0 && initialSyncFailed ? (
          <div
            role="status"
            className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <Mail className="h-8 w-8 text-rose-300/70" />
            <p className="text-sm font-medium text-slate-200">
              Initial sync couldn&apos;t be completed
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Check your connection and try synchronizing your inbox again.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-1 rounded-lg border border-violet-300/20 px-3 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/[0.08]"
            >
              Retry sync
            </button>
          </div>
        ) : isLoading ? (
          <div role="status" className="flex h-48 items-center justify-center text-sm text-slate-500">
            Loading emails…
          </div>
        ) : threads.length === 0 && hasLoadError ? (
          <div role="status" className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <Mail className="h-8 w-8 text-slate-700" />
            <p className="text-sm font-medium text-slate-300">Inbox could not be loaded</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Resolve the error above, then refresh to try again.
            </p>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <Mail className="h-8 w-8 text-slate-700" />
            <p className="text-sm font-medium text-slate-300">Nothing in this view</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              New emails will appear here as Gmail updates are processed.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const isSelected = selectedEmailId === thread.id;
            const priority = (thread.priority || "LOW").toUpperCase();
            const highPriority = priority === "HIGH" || priority === "URGENT";
            return (
              <div
                key={thread.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectEmail(thread.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectEmail(thread.id);
                  }
                }}
                aria-current={isSelected ? "true" : undefined}
                className={`group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-white/[0.045] px-5 py-4 text-left transition hover:bg-white/[0.035] md:grid-cols-[minmax(130px,0.8fr)_minmax(160px,1.1fr)_minmax(180px,2fr)_minmax(90px,auto)_minmax(110px,auto)] md:gap-4 md:px-6 ${
                  isSelected
                    ? "bg-violet-500/[0.07]"
                    : !thread.is_read
                    ? "bg-white/[0.015]"
                    : ""
                }`}
              >
                <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 md:col-start-auto md:row-start-auto">
                  {!thread.is_read && (
                    <span
                      aria-label="Unread"
                      className="h-2 w-2 shrink-0 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"
                    />
                  )}
                  <span
                    className={`truncate text-xs ${
                      thread.is_read ? "font-normal text-slate-400" : "font-semibold text-slate-100"
                    }`}
                  >
                    {thread.sender || "Unknown sender"}
                  </span>
                </span>
                <span
                  className={`col-span-2 col-start-1 row-start-2 min-w-0 truncate text-xs md:col-auto md:row-auto md:col-start-auto md:row-start-auto ${
                    thread.is_read ? "font-normal text-slate-400" : "font-semibold text-slate-100"
                  }`}
                >
                  {thread.subject || "(no subject)"}
                </span>
                <span
                  className={`col-span-2 col-start-1 row-start-3 mt-1 line-clamp-1 text-[11px] leading-relaxed md:col-auto md:row-auto md:col-start-auto md:row-start-auto md:mt-0 ${
                    thread.is_read ? "text-slate-500" : "text-slate-300"
                  }`}
                >
                  {thread.preview || "No preview available."}
                </span>
                <span
                  className={`col-start-2 row-start-1 text-right text-[10px] tabular-nums md:col-auto md:row-auto md:col-start-auto md:row-start-auto md:text-left ${
                    thread.is_read ? "font-normal text-slate-500" : "font-medium text-slate-300"
                  }`}
                >
                  {displayDate(thread.received_at || thread.date)}
                </span>
                <span className="col-span-2 col-start-1 row-start-4 mt-2 flex flex-wrap items-center justify-between gap-1.5 md:col-auto md:row-auto md:col-start-auto md:row-start-auto md:mt-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${
                      highPriority
                        ? "border-rose-400/15 bg-rose-400/[0.07] text-rose-300"
                        : "border-white/[0.08] bg-white/[0.025] text-slate-500"
                    }`}>
                      {highPriority ? <ShieldAlert className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                      {priority}
                    </span>
                    {thread.category?.toUpperCase() === "MEETING_REQUEST" && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-sky-400/15 bg-sky-400/[0.06] px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-sky-300">
                        <CalendarClock className="h-3 w-3" />
                        Meeting
                      </span>
                    )}
                  </div>
                  {onToggleRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRead(thread.id);
                      }}
                      title={thread.is_read ? "Mark as unread" : "Mark as read"}
                      aria-label={thread.is_read ? "Mark as unread" : "Mark as read"}
                      className="rounded p-1 text-slate-500 opacity-0 transition hover:bg-white/[0.08] hover:text-slate-200 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
