'use client'

import React from 'react'
import { EmailThread, ReplyDraft, ScheduleProposal } from '@/Types/email'
import {
  Menu,
  Sparkles,
  RefreshCw,
  Mail,
  Calendar,
  AlertCircle,
  Inbox as InboxIcon,
  X,
  LoaderCircle,
  Copy,
  Check,
  ChevronLeft,
  Bold,
  Italic,
  Link,
  List,
  Eraser,
  Send,
  Trash2
} from 'lucide-react'

interface MiddlePaneProps {
  threads: EmailThread[]
  selectedThreadId: string
  setSelectedThreadId: (id: string) => void
  aiSidebarOpen: boolean
  setAiSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  onMobileMenuToggle: () => void
  isLoading?: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
  error?: string
  onDraftReply: (thread: EmailThread) => void
  onOpenReply: (thread: EmailThread) => void
  isDraftingReply: boolean
  isSendingReply: boolean
  isLoadingBody: boolean
  bodyError: string
  onRetryBody: () => void
  replyDraft: ReplyDraft | null
  onReplyDraftChange: (replyText: string) => void
  onCloseReply: () => void
  onCopyReply: () => void
  onSendReply: () => void
  onExtractMeeting: (thread: EmailThread) => void
  isSchedulingMeeting: boolean
  scheduleProposal: ScheduleProposal | null
  onScheduleProposalChange: (proposal: Partial<ScheduleProposal>) => void
  onCancelSchedule: () => void
  onConfirmSchedule: () => void
  isConfirmingSchedule: boolean
  isScheduled: boolean
}

export default function MiddlePane({
  threads,
  selectedThreadId,
  setSelectedThreadId,
  aiSidebarOpen,
  setAiSidebarOpen,
  onMobileMenuToggle,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  error,
  onDraftReply,
  onOpenReply,
  isDraftingReply,
  isSendingReply,
  isLoadingBody,
  bodyError,
  onRetryBody,
  replyDraft,
  onReplyDraftChange,
  onCloseReply,
  onCopyReply,
  onSendReply,
  onExtractMeeting,
  isSchedulingMeeting,
  scheduleProposal,
  onScheduleProposalChange,
  onCancelSchedule,
  onConfirmSchedule,
  isConfirmingSchedule,
  isScheduled
}: MiddlePaneProps) {
  const activeThread = threads.find((t) => t.id === selectedThreadId)
  const replyEditorRef = React.useRef<HTMLTextAreaElement>(null)

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  }

  const getCategoryStyle = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'MEETING_REQUEST':
        return 'border-sky-500/20 bg-sky-500/10 text-sky-300'
      case 'ACTION_REQUIRED':
        return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
      case 'URGENT':
        return 'border-rose-500/20 bg-rose-500/10 text-rose-300'
      case 'NEWSLETTER':
      case 'INFORMATIONAL':
        return 'border-slate-500/20 bg-slate-500/10 text-slate-300'
      default:
        return 'border-violet-500/20 bg-violet-500/10 text-violet-300'
    }
  }

  const getDisplayBody = (body: string) => {
    if (!/<[a-z][\s\S]*>/i.test(body)) return body
    return body
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const applyReplyFormat = (format: 'bold' | 'italic' | 'link' | 'list' | 'clear') => {
    if (!replyDraft) return
    if (format === 'clear') {
      onReplyDraftChange(
        replyDraft.reply_text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/_(.*?)_/g, '$1')
          .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)')
          .replace(/^•\s?/gm, '')
      )
      return
    }
    const editor = replyEditorRef.current
    if (!editor) return

    const value = replyDraft.reply_text
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const selected = value.slice(start, end)
    let replacement = selected
    let selectionStart = start
    let selectionEnd = start + replacement.length

    if (format === 'bold') {
      replacement = `**${selected || 'bold text'}**`
      selectionStart = start + 2
      selectionEnd = start + replacement.length - 2
    } else if (format === 'italic') {
      replacement = `_${selected || 'italic text'}_`
      selectionStart = start + 1
      selectionEnd = start + replacement.length - 1
    } else if (format === 'link') {
      replacement = `[${selected || 'link text'}](https://)`
      selectionStart = start + (selected || 'link text').length + 3
      selectionEnd = start + replacement.length - 1
    } else if (format === 'list') {
      replacement = (selected || 'List item')
        .split('\n')
        .map((line) => `• ${line}`)
        .join('\n')
      selectionStart = start
      selectionEnd = start + replacement.length
    }

    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`
    onReplyDraftChange(nextValue)
    requestAnimationFrame(() => {
      editor.focus()
      editor.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  const displayDate = (value?: string | null) => {
    if (!value) return ''
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#090A10]">
      {/* Thread List Column */}
      <div className={`${activeThread ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-white/10 bg-[#0d0e15] shrink-0`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={onMobileMenuToggle}
              className="p-1.5 text-gray-400 hover:text-white lg:hidden rounded-lg hover:bg-white/5"
            >
              <Menu size={18} />
            </button>
            <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <InboxIcon size={16} className="text-violet-400" />
              Inbox ({threads.length})
            </h2>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition disabled:opacity-50"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>

        {error && (
          <div className="m-3 flex items-center gap-2 rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-400 border border-rose-500/20">
            <AlertCircle size={14} className="shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Scrollable Threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-xs text-gray-500">
              Loading inbox...
            </div>
          ) : threads.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-gray-500">
              <Mail size={24} className="opacity-30" />
              <span>New emails will appear here as Gmail updates are processed.</span>
            </div>
          ) : (
            threads.map((thread) => {
              const isSelected = thread.id === selectedThreadId
              return (
                <button
                  type="button"
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full cursor-pointer p-3.5 text-left transition hover:bg-white/[0.03] ${isSelected ? 'bg-violet-950/20 border-l-2 border-violet-500' : ''
                    }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-200 truncate max-w-[170px]">
                      {thread.sender}
                    </span>
                    <span className="text-[10px] text-gray-500">{displayDate(thread.received_at || thread.date)}</span>
                  </div>

                  <h4 className="text-xs font-medium text-white truncate mb-1">
                    {thread.subject}
                  </h4>

                  <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed">
                    {thread.preview || 'No preview available.'}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-500">
                    <span className={`rounded border px-1.5 py-0.5 uppercase tracking-wider text-[9px] ${getCategoryStyle(thread.category || '')}`}>
                      {thread.category || 'GENERAL'}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 uppercase tracking-wider text-[9px] ${getPriorityStyle(thread.priority)}`}>
                      {thread.priority || 'NORMAL'}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Email Body & Reading View */}
      <div className={`${activeThread ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-y-auto bg-[#080910]`}>
        {activeThread ? (
          <div className="flex flex-col h-full">
            {/* View Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#0d0e15]/50">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  onClick={() => setSelectedThreadId('')}
                  aria-label="Back to inbox"
                  className="mt-1 rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white md:hidden"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] border font-semibold tracking-wider uppercase ${getPriorityStyle(
                        activeThread.priority
                      )}`}
                    >
                      {activeThread.priority}
                    </span>
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-400 border border-white/10">
                      {activeThread.category}
                    </span>
                  </div>
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    {activeThread.subject}
                  </h1>
                  <div className="text-xs text-gray-400">
                    From: <span className="text-gray-200">{activeThread.sender}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {activeThread.category?.toUpperCase() === 'MEETING_REQUEST' &&
                  !isScheduled && (
                    <button
                      onClick={() => onExtractMeeting(activeThread)}
                      disabled={isSchedulingMeeting}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {isSchedulingMeeting ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <Calendar size={14} />
                      )}
                      <span>{isSchedulingMeeting ? 'Extracting...' : 'Extract Meeting'}</span>
                    </button>
                  )}
                {isScheduled && (
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
                    <Check size={14} />
                    Added to Calendar
                  </span>
                )}
                <button
                  onClick={() => onOpenReply(activeThread)}
                  className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
                >
                  <Mail size={14} />
                  <span>Reply</span>
                </button>
                <button
                  onClick={() => setAiSidebarOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${aiSidebarOpen
                      ? 'border-violet-500/50 bg-violet-600/20 text-violet-300'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                >
                  <Sparkles size={14} />
                  <span>{aiSidebarOpen ? 'Close AI' : 'Open AI'}</span>
                </button>
              </div>
            </div>

            {/* Email Message Content */}
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="mx-auto max-w-4xl space-y-4">
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e15] shadow-xl">
                  {isLoadingBody ? (
                    <div role="status" aria-label="Loading email body" className="animate-pulse space-y-4 p-6">
                      <div className="h-4 w-1/3 rounded bg-white/10" />
                      <div className="h-3 w-5/6 rounded bg-white/5" />
                      <div className="h-3 w-2/3 rounded bg-white/5" />
                      <div className="mt-8 h-3 w-full rounded bg-white/5" />
                      <div className="h-3 w-11/12 rounded bg-white/5" />
                      <div className="h-3 w-4/5 rounded bg-white/5" />
                    </div>
                  ) : bodyError ? (
                    <div role="alert" className="flex flex-col items-start gap-3 p-6 text-sm text-rose-300">
                      <span>{bodyError}</span>
                      <button
                        type="button"
                        onClick={onRetryBody}
                        className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-medium hover:bg-rose-500/10"
                      >
                        Retry loading
                      </button>
                    </div>
                  ) : activeThread.body_html ? (
                    <iframe
                      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><style>body{margin:0;padding:20px;font-family:Arial,sans-serif;color:#e5e7eb;background:#0d0e15;word-break:break-word}a{color:#60a5fa}img{max-width:100%;height:auto}table{max-width:100%!important}</style></head><body>${activeThread.body_html}</body></html>`}
                      title="Email content"
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      className="block min-h-[26rem] w-full border-0 bg-[#0d0e15]"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap p-6 font-sans text-sm leading-relaxed text-gray-200">
                      {activeThread.body
                        ? getDisplayBody(activeThread.body)
                        : activeThread.preview || 'No email content found.'}
                    </div>
                  )}
                </article>

                {replyDraft?.email_id === activeThread.id ? (
                  <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e15] shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                      <span className="text-sm font-semibold text-white">Reply</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                        To: {replyDraft.sender}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-3 py-2">
                      <button type="button" title="Bold" aria-label="Bold" onClick={() => applyReplyFormat('bold')} className="rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white"><Bold size={15} /></button>
                      <button type="button" title="Italic" aria-label="Italic" onClick={() => applyReplyFormat('italic')} className="rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white"><Italic size={15} /></button>
                      <button type="button" title="Insert link" aria-label="Insert link" onClick={() => applyReplyFormat('link')} className="rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white"><Link size={15} /></button>
                      <button type="button" title="Bulleted list" aria-label="Bulleted list" onClick={() => applyReplyFormat('list')} className="rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white"><List size={15} /></button>
                      <button type="button" title="Clear formatting" aria-label="Clear formatting" onClick={() => applyReplyFormat('clear')} className="rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white"><Eraser size={15} /></button>
                    </div>
                    <textarea
                      ref={replyEditorRef}
                      aria-label="Reply message"
                      rows={8}
                      value={replyDraft.reply_text}
                      onChange={(event) => onReplyDraftChange(event.target.value)}
                      placeholder="Write your reply..."
                      className="w-full resize-y bg-transparent px-4 py-4 text-sm leading-relaxed text-gray-200 outline-none placeholder:text-gray-600"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onDraftReply(activeThread)}
                          disabled={isDraftingReply}
                          className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
                        >
                          {isDraftingReply ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          {isDraftingReply ? 'Drafting with AI...' : 'Draft with AI'}
                        </button>
                        <button
                          type="button"
                          onClick={onCopyReply}
                          disabled={!replyDraft.reply_text}
                          aria-label="Copy reply"
                          title="Copy reply"
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                        >
                          <Copy size={15} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onCloseReply}
                          disabled={isSendingReply}
                          aria-label="Discard reply"
                          title="Discard reply"
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={onSendReply}
                          disabled={isSendingReply || !replyDraft.reply_text.trim()}
                          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSendingReply ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                          {isSendingReply ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </section>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenReply(activeThread)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0d0e15] px-5 py-4 text-left text-sm text-gray-400 transition hover:border-violet-500/30 hover:text-white"
                  >
                    <Mail size={16} />
                    Reply to {activeThread.sender}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-500 text-xs gap-2">
            <Mail size={32} className="opacity-30" />
            <span>Select an email thread from the left to view.</span>
          </div>
        )}
      </div>
      {scheduleProposal && scheduleProposal.email_id === activeThread?.id && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onConfirmSchedule()
            }}
            className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0e15] p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">Confirm meeting details</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Review and edit the proposed event before adding it to your calendar.
                </p>
              </div>
              <button
                type="button"
                onClick={onCancelSchedule}
                disabled={isConfirmingSchedule}
                aria-label="Close meeting proposal"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-medium text-gray-300">
                Title
                <input
                  required
                  value={scheduleProposal.title}
                  onChange={(event) => onScheduleProposalChange({ title: event.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-gray-300">
                  Start time
                  <input
                    type="datetime-local"
                    required
                    value={scheduleProposal.start_time}
                    onChange={(event) =>
                      onScheduleProposalChange({ start_time: event.target.value })
                    }
                    style={{ colorScheme: 'dark' }}
                    className="mt-1.5 w-full min-w-0 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-300">
                  End time
                  <input
                    type="datetime-local"
                    required
                    value={scheduleProposal.end_time}
                    onChange={(event) =>
                      onScheduleProposalChange({ end_time: event.target.value })
                    }
                    style={{ colorScheme: 'dark' }}
                    className="mt-1.5 w-full min-w-0 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-gray-300">
                Description
                <textarea
                  rows={4}
                  value={scheduleProposal.description}
                  onChange={(event) =>
                    onScheduleProposalChange({ description: event.target.value })
                  }
                  className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm leading-relaxed text-white outline-none focus:border-emerald-500/50"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancelSchedule}
                disabled={isConfirmingSchedule}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-medium text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConfirmingSchedule}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {isConfirmingSchedule && <LoaderCircle size={14} className="animate-spin" />}
                {isConfirmingSchedule ? 'Syncing...' : 'Confirm & Sync'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}