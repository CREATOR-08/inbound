'use client'

import React from 'react'
import { EmailThread } from '@/Types/email'
import { Sparkles, X, Mail, Tag, Flag } from 'lucide-react'

interface RightPaneProps {
  setAiSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  activeThread: EmailThread | null
}

export default function RightPane({ setAiSidebarOpen, activeThread }: RightPaneProps) {
  return (
    <div className="flex h-full w-[min(380px,100vw)] flex-col overflow-y-auto border-l border-white/10 bg-[#0d0e15] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-violet-500/30 bg-violet-600/30 text-violet-400">
            <Sparkles size={14} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            AI Assistant Insights
          </span>
        </div>
        <button
          onClick={() => setAiSidebarOpen(false)}
          aria-label="Close AI insights"
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {!activeThread ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-gray-500">
          <Sparkles size={24} className="opacity-30" />
          <span>Select an email thread to inspect its triage details.</span>
        </div>
      ) : (
        <div className="flex-1 space-y-5 p-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-4 flex items-center gap-2 text-violet-300">
              <Mail size={15} />
              <span className="text-xs font-semibold uppercase tracking-wider">Email triage</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Tag size={14} className="mt-0.5 shrink-0 text-gray-500" />
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500">
                    Category
                  </span>
                  <span className="text-xs font-medium text-gray-200">
                    {activeThread.category || 'Uncategorized'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Flag size={14} className="mt-0.5 shrink-0 text-gray-500" />
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500">
                    Priority
                  </span>
                  <span className="text-xs font-medium text-gray-200">
                    {activeThread.priority || 'Normal'}
                  </span>
                </div>
              </div>
              {activeThread.is_archived !== undefined && (
                <div className="flex items-start justify-between border-t border-white/5 pt-3 text-xs">
                  <span className="text-gray-400">Archived</span>
                  <span className="text-gray-200">{activeThread.is_archived ? 'Yes' : 'No'}</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs leading-relaxed text-gray-500">
            Email sync stores message metadata for fast browsing. Draft replies and meeting
            proposals are created only when you request them.
          </p>
        </div>
      )}
    </div>
  )
}
