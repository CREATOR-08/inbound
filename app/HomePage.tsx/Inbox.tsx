"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CalendarEventConfirmationPayload,
  CalendarEventConfirmationResponse,
  EmailThread,
  ReplyDraft,
  ScheduleExtractionResponse,
  ScheduleProposal,
} from "@/Types/email";
import EmailDetailView from "@/components/HomePage.tsx/EmailDetailView";
import EmailListView from "@/components/HomePage.tsx/EmailListView";
import ScheduleModal from "@/components/HomePage.tsx/ScheduleModal";
import Sidebar, { type EmailFilter } from "@/components/HomePage.tsx/Sidebar";
import {
  ApiError,
  draftReply,
  extractSchedule,
  fetchEmailBody,
  getApiBaseUrl,
  sendReply,
} from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useGmailSync } from "@/lib/useGmailSync";

type ToastMessage = { type: "success" | "error"; message: string };

type DraftStreamEvent =
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

const isDraftStreamEvent = (value: unknown): value is DraftStreamEvent => {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  if (value.type === "token") return "content" in value && typeof value.content === "string";
  if (value.type === "error") return "message" in value && typeof value.message === "string";
  return value.type === "done";
};

const isScheduleExtractionResponse = (value: unknown): value is ScheduleExtractionResponse => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("confirmation_required" in value) ||
    typeof value.confirmation_required !== "boolean" ||
    !("calendar_event" in value) ||
    typeof value.calendar_event !== "object" ||
    value.calendar_event === null
  ) {
    return false;
  }

  const event = value.calendar_event;
  return (
    "draft_id" in event &&
    typeof event.draft_id === "string" &&
    "title" in event &&
    typeof event.title === "string" &&
    "start_time" in event &&
    typeof event.start_time === "string" &&
    "end_time" in event &&
    typeof event.end_time === "string" &&
    "confidence" in event &&
    typeof event.confidence === "number" &&
    Number.isFinite(event.confidence) &&
    event.confidence >= 0 &&
    event.confidence <= 1 &&
    "attendees" in event &&
    Array.isArray(event.attendees) &&
    event.attendees.every((attendee) => typeof attendee === "string") &&
    "status" in event &&
    typeof event.status === "string" &&
    ["PENDING", "APPROVED", "CANCELLED"].includes(event.status)
  );
};

interface InboxProps {
  user: { name: string; email: string };
  onSignOut: () => void;
  signOutError: string;
}

export default function Inbox({ user, onSignOut, signOutError }: InboxProps) {
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [currentFilter, setCurrentFilter] = useState<EmailFilter>("ALL");
  const [replyDraft, setReplyDraft] = useState<ReplyDraft | null>(null);
  const [draftingEmailId, setDraftingEmailId] = useState<string | null>(null);
  const [bodyLoadingId, setBodyLoadingId] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<{ emailId: string; message: string } | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [scheduleProposal, setScheduleProposal] = useState<ScheduleProposal | null>(null);
  const [schedulingEmailId, setSchedulingEmailId] = useState<string | null>(null);
  const [scheduledEmailIds, setScheduledEmailIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleAccountId = useRef<string | null>(null);
  const googleAccountRequest = useRef<Promise<string> | null>(null);
  const accessTokenCache = useRef<{ token: string; expiresAt: number } | null>(null);
  const accessTokenRequest = useRef<Promise<string> | null>(null);
  const bodyCache = useRef(new Map<string, Awaited<ReturnType<typeof fetchEmailBody>>>());
  const bodyRequests = useRef(new Map<string, Promise<Awaited<ReturnType<typeof fetchEmailBody>>>>());

  const apiBaseUrl = getApiBaseUrl();

  const notify = useCallback((message: string, type: ToastMessage["type"]) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    },
    [],
  );

  const getCaughtErrorMessage = useCallback(
    (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback),
    [],
  );

  const getGoogleToken = useCallback(async (forceRefresh = false): Promise<string> => {
    if (forceRefresh) accessTokenCache.current = null;
    const cachedToken = accessTokenCache.current;
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
      return cachedToken.token;
    }
    if (accessTokenRequest.current) return accessTokenRequest.current;

    const request = (async () => {
      let accountId = googleAccountId.current;
      if (!accountId) {
        if (!googleAccountRequest.current) {
          googleAccountRequest.current = (async () => {
            const { data: accounts } = await authClient.listAccounts();
            const googleAccount = accounts?.find((account) => account.providerId === "google");
            if (!googleAccount) {
              throw new Error("Google account link missing. Please log in again.");
            }
            googleAccountId.current = googleAccount.id;
            return googleAccount.id;
          })();
        }
        try {
          accountId = await googleAccountRequest.current;
        } finally {
          googleAccountRequest.current = null;
        }
      }

      const { data: tokenData } = await authClient.getAccessToken({ accountId });
      if (typeof tokenData?.accessToken !== "string" || !tokenData.accessToken.trim()) {
        throw new Error("Could not fetch an active Google access token.");
      }
      const expiresAt =
        tokenData.accessTokenExpiresAt instanceof Date
          ? tokenData.accessTokenExpiresAt.getTime()
          : typeof tokenData.accessTokenExpiresAt === "string"
            ? Date.parse(tokenData.accessTokenExpiresAt)
            : Number.NaN;
      if (Number.isFinite(expiresAt)) {
        accessTokenCache.current = { token: tokenData.accessToken, expiresAt };
      }
      return tokenData.accessToken;
    })();

    accessTokenRequest.current = request;
    try {
      return await request;
    } finally {
      if (accessTokenRequest.current === request) accessTokenRequest.current = null;
    }
  }, []);

  const {
    emails: threads,
    setEmails: setThreads,
    isLoading,
    isRefreshing,
    error: apiError,
    emailError,
    watchError,
    refresh: refreshEmails,
  } = useGmailSync({ apiBaseUrl, enabled: true, getAccessToken: getGoogleToken });

  const loadEmailBody = useCallback(
    async (emailId: string) => {
      const cachedBody = bodyCache.current.get(emailId);
      if (cachedBody) {
        setThreads((current) =>
          current.map((thread) => (thread.id === emailId ? { ...thread, ...cachedBody } : thread)),
        );
        return cachedBody;
      }

      const existingRequest = bodyRequests.current.get(emailId);
      if (existingRequest) return existingRequest;

      const request = (async () => {
        const token = await getGoogleToken();
        const body = await fetchEmailBody(apiBaseUrl, emailId, token);
        bodyCache.current.set(emailId, body);
        setThreads((current) =>
          current.map((thread) => (thread.id === emailId ? { ...thread, ...body } : thread)),
        );
        return body;
      })();
      bodyRequests.current.set(emailId, request);
      try {
        return await request;
      } catch (error: unknown) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          accessTokenCache.current = null;
        }
        throw error;
      } finally {
        if (bodyRequests.current.get(emailId) === request) bodyRequests.current.delete(emailId);
      }
    },
    [apiBaseUrl, getGoogleToken, setThreads],
  );

  const activeThread = threads.find((thread) => thread.id === selectedThreadId) || null;

  useEffect(() => {
    if (!activeThread || activeThread.body !== undefined || activeThread.body_html !== undefined) return;
    let cancelled = false;
    const emailId = activeThread.id;
    const timer = window.setTimeout(() => {
      setBodyLoadingId(emailId);
      setBodyError(null);
      loadEmailBody(emailId)
        .catch((error: unknown) => {
          if (!cancelled) {
            setBodyError({
              emailId,
              message: getCaughtErrorMessage(error, "Unable to load email body."),
            });
          }
        })
        .finally(() => {
          if (!cancelled) setBodyLoadingId((current) => (current === emailId ? null : current));
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeThread, getCaughtErrorMessage, loadEmailBody]);

  const handleRetryEmailBody = () => {
    if (!activeThread) return;
    const emailId = activeThread.id;
    setBodyLoadingId(emailId);
    setBodyError(null);
    loadEmailBody(emailId)
      .catch((error: unknown) => {
        setBodyError({
          emailId,
          message: getCaughtErrorMessage(error, "Unable to load email body."),
        });
      })
      .finally(() => setBodyLoadingId((current) => (current === emailId ? null : current)));
  };

  const handleDraftReply = async (thread: EmailThread) => {
    if (!replyDraft || replyDraft.email_id !== thread.id) {
      setReplyDraft({
        email_id: thread.id,
        sender: thread.sender,
        subject: thread.subject,
        reply_text: "",
      });
    }
    setDraftingEmailId(thread.id);
    try {
      if (thread.body === undefined && thread.body_html === undefined) await loadEmailBody(thread.id);
      const response = await draftReply(apiBaseUrl, thread.id);
      if (!response.body) throw new Error("The draft response did not include a stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      const handleFrame = (frame: string) => {
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (!data) return;
        let event: unknown;
        try {
          event = JSON.parse(data) as unknown;
        } catch {
          throw new Error("The draft stream contained invalid data.");
        }
        if (!isDraftStreamEvent(event)) throw new Error("The draft stream contained an invalid event.");
        if (event.type === "token") {
          setReplyDraft((current) =>
            current?.email_id === thread.id
              ? { ...current, reply_text: current.reply_text + event.content }
              : current,
          );
        } else if (event.type === "done") {
          completed = true;
        } else {
          throw new Error(event.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || "";
        frames.forEach(handleFrame);
        if (done) break;
      }
      if (buffer.trim()) handleFrame(buffer);
      if (!completed) throw new Error("Reply generation ended before completion.");
    } catch (error: unknown) {
      notify(getCaughtErrorMessage(error, "Unable to draft a reply."), "error");
    } finally {
      setDraftingEmailId(null);
    }
  };

  const handleSendReply = async () => {
    if (!replyDraft) return;
    setSendingEmailId(replyDraft.email_id);
    try {
      const token = await getGoogleToken();
      await sendReply(apiBaseUrl, token, replyDraft.email_id, replyDraft.reply_text);
      setReplyDraft(null);
      notify("Reply sent.", "success");
    } catch (error: unknown) {
      notify(getCaughtErrorMessage(error, "Unable to send reply."), "error");
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleCopyReply = async () => {
    if (!replyDraft) return;
    try {
      await navigator.clipboard.writeText(replyDraft.reply_text);
      notify("Reply copied to clipboard.", "success");
    } catch {
      notify("Unable to copy the reply. Please select and copy the text manually.", "error");
    }
  };

  const handleExtractMeeting = async (thread: EmailThread) => {
    setSchedulingEmailId(thread.id);
    try {
      const response = await extractSchedule(apiBaseUrl, thread.id);

      const result: unknown = await response.json();
      if (!isScheduleExtractionResponse(result)) {
        throw new Error("The schedule response did not include a calendar proposal.");
      }
      const event = result.calendar_event;
      if (!Number.isFinite(new Date(event.start_time).getTime()) || !Number.isFinite(new Date(event.end_time).getTime())) {
        throw new Error("The calendar proposal contained an invalid date or time.");
      }

      setScheduleProposal({ ...event, email_id: thread.id });
    } catch (error: unknown) {
      notify(getCaughtErrorMessage(error, "Unable to extract a meeting."), "error");
    } finally {
      setSchedulingEmailId(null);
    }
  };

  const archived = (thread: EmailThread) => thread.is_archived === true;
  const isScheduled = (thread: EmailThread) =>
    scheduledEmailIds.has(thread.id) || Boolean(thread.calendar_event);
  const matchesFilter = (thread: EmailThread) => {
    switch (currentFilter) {
      case "ALL":
        return !archived(thread);
      case "TRIAGED":
        return !archived(thread) && Boolean(thread.category);
      case "URGENT":
        return (
          !archived(thread) &&
          (thread.priority?.toUpperCase() === "URGENT" ||
            thread.category?.toUpperCase() === "URGENT")
        );
      case "HIGH_PRIORITY":
        return !archived(thread) && thread.priority?.toUpperCase() === "HIGH";
      case "SCHEDULED":
        return !archived(thread) && isScheduled(thread);
      case "ARCHIVE":
        return archived(thread);
    }
  };
  const visibleThreads = threads.filter(matchesFilter);
  const activeRead = activeThread?.is_read === true;

  const counts: Record<EmailFilter, number> = {
    ALL: threads.filter((thread) => !archived(thread)).length,
    TRIAGED: threads.filter((thread) => !archived(thread) && Boolean(thread.category)).length,
    URGENT: threads.filter(
      (thread) =>
        !archived(thread) &&
        (thread.priority?.toUpperCase() === "URGENT" || thread.category?.toUpperCase() === "URGENT"),
    ).length,
    HIGH_PRIORITY: threads.filter(
      (thread) => !archived(thread) && thread.priority?.toUpperCase() === "HIGH",
    ).length,
    SCHEDULED: threads.filter((thread) => !archived(thread) && isScheduled(thread)).length,
    ARCHIVE: threads.filter(archived).length,
  };

  const handleArchive = () => {
    if (!activeThread) return;
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id ? { ...thread, is_archived: true } : thread,
      ),
    );
    setSelectedThreadId("");
    notify("Email archived.", "success");
  };

  const handleDelete = () => {
    if (!activeThread) return;
    setThreads((current) => current.filter((thread) => thread.id !== activeThread.id));
    setSelectedThreadId("");
    notify("Email deleted from this inbox.", "success");
  };

  const handleMarkRead = () => {
    if (!activeThread) return;
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id ? { ...thread, is_read: !thread.is_read } : thread,
      ),
    );
  };

  const handleScheduleSuccess = (
    result: CalendarEventConfirmationResponse,
    payload: CalendarEventConfirmationPayload,
  ) => {
    if (!scheduleProposal) return;
    setScheduledEmailIds((previous) => new Set(previous).add(scheduleProposal.email_id));
    setThreads((current) =>
      current.map((thread) =>
        thread.id === scheduleProposal.email_id
          ? {
            ...thread,
            calendar_event: {
              draft_id: scheduleProposal.draft_id,
              title: payload.title,
              start_time: payload.start_time,
              end_time: payload.end_time,
              attendees: payload.attendees,
              status: "APPROVED",
              confidence: scheduleProposal.confidence,
            },
          }
          : thread,
      ),
    );
    notify(`Meeting added to Google Calendar (${result.google_event_id}).`, "success");
  };

  return (
    <>
      <main className="relative flex h-screen w-screen overflow-hidden bg-[#0b0c12] font-sans text-slate-100">
        {activeThread && watchError && (
          <div
            role="alert"
            className="absolute right-4 top-3 z-50 max-w-lg rounded-xl border border-rose-500/20 bg-[#1c1014] px-4 py-3 text-sm text-rose-200 shadow-xl"
          >
            {watchError}
          </div>
        )}
        <Sidebar
          user={user}
          currentFilter={currentFilter}
          counts={counts}
          onSelectFilter={(filter) => {
            setCurrentFilter(filter);
            setSelectedThreadId("");
          }}
          onSignOut={onSignOut}
          signOutError={signOutError}
        />
        {activeThread ? (
          <EmailDetailView
            thread={activeThread}
            isRead={activeRead}
            isLoadingBody={bodyLoadingId === activeThread.id}
            bodyError={bodyError?.emailId === activeThread.id ? bodyError.message : ""}
            onRetryBody={handleRetryEmailBody}
            onBack={() => setSelectedThreadId("")}
            onArchive={handleArchive}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onSchedule={() => void handleExtractMeeting(activeThread)}
            isScheduling={schedulingEmailId === activeThread.id}
            isScheduled={isScheduled(activeThread)}
            replyDraft={replyDraft}
            isDraftingReply={draftingEmailId === activeThread.id}
            isSendingReply={sendingEmailId === activeThread.id}
            onOpenReply={(thread) =>
              setReplyDraft((current) =>
                current?.email_id === thread.id
                  ? current
                  : { email_id: thread.id, sender: thread.sender, subject: thread.subject, reply_text: "" },
              )
            }
            onDraftReply={(thread) => void handleDraftReply(thread)}
            onReplyDraftChange={(reply_text) =>
              setReplyDraft((draft) => (draft ? { ...draft, reply_text } : draft))
            }
            onCloseReply={() => setReplyDraft(null)}
            onCopyReply={() => void handleCopyReply()}
            onSendReply={() => void handleSendReply()}
          />
        ) : (
          <EmailListView
            threads={visibleThreads}
            selectedEmailId={selectedThreadId}
            currentFilter={currentFilter}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            error={apiError}
            hasLoadError={Boolean(emailError)}
            onSelectEmail={setSelectedThreadId}
            onRefresh={() => void refreshEmails()}
          />
        )}
      </main>

      {scheduleProposal && (
        <ScheduleModal
          proposal={scheduleProposal}
          apiBaseUrl={apiBaseUrl}
          getAccessToken={getGoogleToken}
          onClose={() => setScheduleProposal(null)}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={`fixed bottom-5 right-5 z-[120] max-w-[calc(100vw-2.5rem)] rounded-xl border px-4 py-3 text-sm shadow-2xl ${toast.type === "success"
            ? "border-emerald-500/30 bg-[#0d1b16] text-emerald-200"
            : "border-rose-500/30 bg-[#1c1014] text-rose-200"
            }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
