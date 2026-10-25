"use client";

import { CalendarClock, Mail, RefreshCw, ShieldAlert, Star } from "lucide-react";
import type { EmailThread } from "@/Types/email";
import type { EmailFilter } from "./Sidebar";

interface EmailListViewProps {
  threads: EmailThread[];
  selectedEmailId: string;
  currentFilter: EmailFilter;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string;
  onSelectEmail: (emailId: string) => void;
  onRefresh: () => void;
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
  isRefreshing,
  error,
  onSelectEmail,
  onRefresh,
}: EmailListViewProps) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-[#0b0c12]" aria-label="Email list">
      <header className="flex min-h-[76px] items-center justify-between border-b border-white/[0.07] px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Mailbox
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-white">
            {filterTitles[currentFilter]}
            <span className="ml-2 text-sm font-normal text-slate-500">{threads.length}</span>
          </h1>
        </div>
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

        {isLoading ? (
          <div role="status" className="flex h-48 items-center justify-center text-sm text-slate-500">
            Loading emails…
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
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectEmail(thread.id)}
                aria-current={isSelected ? "true" : undefined}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-white/[0.045] px-5 py-4 text-left transition hover:bg-white/[0.035] md:grid-cols-[minmax(130px,0.8fr)_minmax(160px,1.1fr)_minmax(180px,2fr)_minmax(90px,auto)_minmax(110px,auto)] md:gap-4 md:px-6 ${
                  isSelected ? "bg-violet-500/[0.07]" : ""
                }`}
              >
                <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 md:col-start-auto md:row-start-auto">
                  {!thread.is_read && (
                    <span aria-label="Unread" className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  )}
                  <span className={`truncate text-xs ${thread.is_read ? "text-slate-400" : "font-semibold text-slate-100"}`}>
                    {thread.sender || "Unknown sender"}
                  </span>
                </span>
                <span className="col-span-2 col-start-1 row-start-2 min-w-0 truncate text-xs font-medium text-slate-200 md:col-auto md:row-auto md:col-start-auto md:row-start-auto">
                  {thread.subject || "(no subject)"}
                </span>
                <span className="col-span-2 col-start-1 row-start-3 mt-1 line-clamp-1 text-[11px] leading-relaxed text-slate-500 md:col-auto md:row-auto md:col-start-auto md:row-start-auto md:mt-0">
                  {thread.preview || "No preview available."}
                </span>
                <span className="col-start-2 row-start-1 text-right text-[10px] tabular-nums text-slate-500 md:col-auto md:row-auto md:col-start-auto md:row-start-auto md:text-left">
                  {displayDate(thread.received_at || thread.date)}
                </span>
                <span className="col-span-2 col-start-1 row-start-4 mt-2 flex flex-wrap items-center gap-1.5 md:col-auto md:row-auto md:col-start-auto md:row-start-auto md:mt-0">
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
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
