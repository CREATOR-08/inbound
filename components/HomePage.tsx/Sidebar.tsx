"use client";

import {
  Archive,
  CalendarDays,
  Inbox,
  Layers3,
  LogOut,
  ShieldAlert,
  Sparkles,
  Star,
} from "lucide-react";

export type EmailFilter =
  | "ALL"
  | "TRIAGED"
  | "URGENT"
  | "HIGH_PRIORITY"
  | "SCHEDULED"
  | "ARCHIVE";

interface SidebarProps {
  user: { name?: string; email: string };
  currentFilter: EmailFilter;
  counts: Record<EmailFilter, number>;
  onSelectFilter: (filter: EmailFilter) => void;
  onSignOut: () => void;
  signOutError?: string;
}

const navItems: {
  id: EmailFilter;
  label: string;
  icon: typeof Inbox;
}[] = [
  { id: "ALL", label: "All", icon: Inbox },
  { id: "TRIAGED", label: "Triaged", icon: Layers3 },
  { id: "URGENT", label: "Urgent", icon: ShieldAlert },
  { id: "HIGH_PRIORITY", label: "High Priority", icon: Star },
  { id: "SCHEDULED", label: "Scheduled", icon: CalendarDays },
  { id: "ARCHIVE", label: "Archive", icon: Archive },
];

export default function Sidebar({
  user,
  currentFilter,
  counts,
  onSelectFilter,
  onSignOut,
  signOutError,
}: SidebarProps) {
  const initials = (user.name || user.email || "U")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="group relative z-20 flex h-full w-16 shrink-0 flex-col overflow-hidden border-r border-white/[0.07] bg-[#090a10] transition-[width] duration-300 ease-in-out hover:w-64 focus-within:w-64">
      <div className="flex min-h-16 items-center gap-3 overflow-hidden border-b border-white/[0.07] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/30">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="whitespace-nowrap text-sm font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          Inbound<span className="text-violet-400">.ai</span>
        </span>
      </div>

      <nav aria-label="Email folders" className="mt-5 flex-1 space-y-1 px-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const selected = currentFilter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectFilter(id)}
              aria-current={selected ? "page" : undefined}
              title={label}
              className={`flex h-10 w-full items-center gap-3 overflow-hidden rounded-xl px-3 transition ${
                selected
                  ? "bg-violet-500/15 text-violet-200"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="min-w-0 flex-1 whitespace-nowrap text-left text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {label}
              </span>
              <span className="min-w-4 text-right text-[10px] tabular-nums text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {counts[id] > 0 ? counts[id] : ""}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="overflow-hidden border-t border-white/[0.07] p-2">
        {signOutError && (
          <p role="alert" className="mb-2 whitespace-normal px-2 text-[11px] text-rose-300">
            {signOutError}
          </p>
        )}
        <div className="flex h-11 items-center gap-3 overflow-hidden rounded-xl px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10 text-[11px] font-semibold text-violet-200">
            {initials}
          </div>
          <div className="min-w-0 flex-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <p className="truncate text-xs font-medium text-slate-200">{user.name || "Account"}</p>
            <p className="truncate text-[10px] text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
