'use client'

import React from 'react'
import {
  Inbox,
  AlertCircle,
  Sparkles,
  LogOut,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Newspaper,
} from 'lucide-react'

export type NavFilter = 'ALL' | 'URGENT' | 'ACTION_REQUIRED' | 'CALENDAR' | 'NEWSLETTER'

interface NavigationDrawerProps {
  user: {
    name?: string
    email: string
  }
  onSignOut: () => void
  signOutError?: string
  currentFilter?: NavFilter
  onSelectFilter?: (filter: NavFilter) => void
  counts?: {
    total: number
    urgent: number
    actionRequired: number
    events: number
    newsletters: number
  }
  onRefresh?: () => void
  isRefreshing?: boolean
}

export default function NavigationDrawer({
  user,
  onSignOut,
  signOutError,
  currentFilter = 'ALL',
  onSelectFilter = () => {},
  counts = { total: 0, urgent: 0, actionRequired: 0, events: 0, newsletters: 0 },
  onRefresh,
  isRefreshing = false,
}: NavigationDrawerProps) {
  // Safely extract initials even if name is missing or single character
  const userInitials = (user.name || user.email || 'MF')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const navItems: { id: NavFilter; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: 'ALL',
      label: 'All Triaged',
      icon: <Inbox className="h-4 w-4" />,
      count: counts.total,
    },
    {
      id: 'URGENT',
      label: 'Urgent & High',
      icon: <AlertCircle className="h-4 w-4 text-rose-400" />,
      count: counts.urgent,
    },
    {
      id: 'ACTION_REQUIRED',
      label: 'Action Required',
      icon: <CheckCircle2 className="h-4 w-4 text-amber-400" />,
      count: counts.actionRequired,
    },
    {
      id: 'CALENDAR',
      label: 'Meeting Drafts',
      icon: <Calendar className="h-4 w-4 text-emerald-400" />,
      count: counts.events,
    },
    {
      id: 'NEWSLETTER',
      label: 'Newsletters',
      icon: <Newspaper className="h-4 w-4 text-slate-400" />,
      count: counts.newsletters,
    },
  ]

  return (
    <aside className="w-64 h-full border-r border-white/10 bg-[#080910] flex flex-col justify-between select-none">
      <div className="p-4 flex flex-col gap-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              Inbound AI
            </span>
          </div>
        </div>

        {/* Global Sync Action Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing inbox...' : 'Refresh inbox'}</span>
          </button>
        )}

        {/* Category Navigation */}
        <div className="pt-2">
          <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Triage Views
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentFilter === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectFilter(item.id)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded font-semibold tabular-nums ${
                        isActive
                          ? 'bg-violet-500/20 text-violet-200'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* User Session Footer */}
      <div>
        <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-[#0d0e15]/60">
          <div className="h-8 w-8 shrink-0 rounded-full bg-violet-950/60 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300">
            {userInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate text-slate-200">
              {user.name || 'User'}
            </span>
            <span className="text-[10px] text-slate-500 truncate" title={user.email}>
              {user.email}
            </span>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="ml-auto rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-rose-400"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {signOutError && (
          <p role="alert" className="px-4 py-2 text-[11px] text-rose-400 bg-rose-500/10">
            {signOutError}
          </p>
        )}
      </div>
    </aside>
  )
}