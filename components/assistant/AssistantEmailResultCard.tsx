"use client";

import type { AssistantEmailSummary } from "@/Types/assistant";

interface AssistantEmailResultCardProps {
  email: AssistantEmailSummary;
  onOpen: (email: AssistantEmailSummary) => void;
}

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

export default function AssistantEmailResultCard({
  email,
  onOpen,
}: AssistantEmailResultCardProps) {
  const date = formatDate(email.received_at);
  return (
    <button
      type="button"
      onClick={() => onOpen(email)}
      className="block w-full rounded-xl border border-white/[0.08] bg-[#141620] p-3 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      aria-label={`Open email: ${email.subject || "No subject"} from ${email.sender || "Unknown sender"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 truncate text-[11px] font-medium text-slate-200">
          {email.sender || "Unknown sender"}
        </span>
        {date && (
          <time
            dateTime={email.received_at ?? undefined}
            className="shrink-0 text-[10px] text-slate-500"
          >
            {date}
          </time>
        )}
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-slate-100">
        {email.subject || "(no subject)"}
      </p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-400">
        {email.preview || "No preview available."}
      </p>
      {(email.priority || email.category) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {email.priority && (
            <span className="rounded-md border border-white/[0.08] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">
              {email.priority}
            </span>
          )}
          {email.category && (
            <span className="rounded-md border border-violet-400/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-violet-300">
              {email.category.replaceAll("_", " ")}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
