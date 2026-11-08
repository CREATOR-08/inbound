"use client";
import AssistantPanel from "@/components/assistant/AssistantPannel";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EmailFilter } from "@/Types/email";
import EmailDetailView from "@/components/HomePage.tsx/EmailDetailView";
import EmailListView from "@/components/HomePage.tsx/EmailListView";
import ScheduleModal from "@/components/HomePage.tsx/ScheduleModal";
import Sidebar from "@/components/HomePage.tsx/Sidebar";
import Toast from "@/components/HomePage.tsx/Toast";
import { getApiBaseUrl } from "@/lib/api";
import { collectAssistantPageContext } from "@/lib/assistant-context";
import type { AssistantEmailSummary } from "@/Types/assistant";
import { useGmailSync } from "@/lib/useGmailSync";
import { useEmailBody } from "@/hooks/useEmailBody";
import { useEmailActions } from "@/hooks/useEmailActions";
import { useEmailFilters } from "@/hooks/useEmailFilters";
import { useGoogleAccessToken } from "@/hooks/useGoogleAccessToken";
import { useToast } from "@/hooks/useToast";
import { authClient } from "@/lib/auth-client";

interface InboxProps {
  user: { name: string; email: string };
  onSignOut: () => void;
  signOutError: string;
}

export default function Inbox({ user, onSignOut, signOutError }: InboxProps) {
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [currentFilter, setCurrentFilter] = useState<EmailFilter>("ALL");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [reconnectError, setReconnectError] = useState("");

  const apiBaseUrl = getApiBaseUrl();
  const { getAccessToken: getGoogleToken, invalidateAccessToken } = useGoogleAccessToken();
  const { toast, notify } = useToast();

  const reconnectGoogle = useCallback(async () => {
    setReconnectError("");
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/",
      });
      if (error) {
        setReconnectError(
          error.message ?? "Unable to reconnect Google. Please try again.",
        );
      }
    } catch (error) {
      setReconnectError(
        error instanceof Error
          ? error.message
          : "Unable to reconnect Google. Please try again.",
      );
    }
  }, []);

  const {
    emails: threads,
    setEmails: setThreads,
    isLoading,
    isInitialSyncing,
    initialSyncFailed,
    isRefreshing,
    error: apiError,
    emailError,
    syncError,
    refresh: refreshEmails,
  } = useGmailSync({
    apiBaseUrl,
    accountKey: user.email,
    enabled: true,
    getAccessToken: getGoogleToken,
    currentFilter,
  });

  const activeThread = threads.find((thread) => thread.id === selectedThreadId) || null;
  const {
    loadEmailBody,
    isLoadingBody,
    bodyErrorFor,
    retryEmailBody,
  } = useEmailBody({
    apiBaseUrl,
    cacheScope: user.email,
    selectedEmail: activeThread,
    setEmails: setThreads,
    getAccessToken: getGoogleToken,
    invalidateAccessToken,
  });
  const emailActions = useEmailActions({
    apiBaseUrl,
    getAccessToken: getGoogleToken,
    loadEmailBody,
    setEmails: setThreads,
    notify,
  });
  const { visibleEmails, counts, isScheduled } = useEmailFilters({
    emails: threads,
    currentFilter,
    scheduledEmailIds: emailActions.scheduledEmailIds,
  });
  const activeRead = activeThread?.is_read === true;

  const lastAutoReadId = useRef<string | null>(null);

  const openEmail = useCallback(
    (emailId: string) => {
      setSelectedThreadId(emailId);
      const target = threads.find((t) => t.id === emailId);
      if (target && !target.is_read) {
        lastAutoReadId.current = emailId;
        void emailActions.markEmailAsRead(emailId);
      }
    },
    [threads, emailActions],
  );

  useEffect(() => {
    if (!selectedThreadId) {
      lastAutoReadId.current = null;
      return;
    }
    if (lastAutoReadId.current === selectedThreadId) {
      return;
    }
    lastAutoReadId.current = selectedThreadId;
    const thread = threads.find((t) => t.id === selectedThreadId);
    if (thread && !thread.is_read) {
      void emailActions.markEmailAsRead(selectedThreadId);
    }
  }, [selectedThreadId, threads, emailActions]);

  const archiveSelectedEmail = () => {
    if (!activeThread) return;
    emailActions.archiveEmail(activeThread.id);
    setSelectedThreadId("");
  };

  const deleteSelectedEmail = () => {
    if (!activeThread) return;
    emailActions.deleteEmail(activeThread.id);
    setSelectedThreadId("");
  };

  const toggleSelectedEmailRead = () => {
    if (activeThread) {
      void emailActions.toggleEmailRead(activeThread.id);
    }
  };

  const openAssistantResult = (result: AssistantEmailSummary) => {
    setThreads((current) =>
      current.some((thread) => thread.id === result.id)
        ? current
        : [
            {
              ...result,
              date: result.received_at ?? undefined,
            },
            ...current,
          ],
    );
    openEmail(result.id);
  };

  const openAssistantActionEmail = (emailId: string) => {
    if (!threads.some((thread) => thread.id === emailId)) return;
    openEmail(emailId);
  };

  const openAssistantCompose = (parameters: Record<string, unknown>) => {
    let targetThread = activeThread;
    let replyBody: string | undefined;
    if (Object.keys(parameters).length > 0) {
      const recipient = parameters.to;
      const subject = parameters.subject;
      const body = parameters.body;
      if (
        Object.keys(parameters).length !== 3 ||
        typeof recipient !== "string" ||
        typeof subject !== "string" ||
        typeof body !== "string"
      ) {
        return "This compose action has invalid parameters.";
      }

      const getSenderAddress = (sender: string) =>
        sender.match(/<([^<>]+)>/)?.[1] ??
        sender.match(/\[([^\]]+)\]\(mailto:[^)]+\)/i)?.[1] ??
        sender.trim();
      const normalizeSubject = (subject: string) =>
        subject.trim().replace(/^(re:\s*)+/i, "").toLowerCase();

      const matchesComposeTarget = (thread: (typeof threads)[number]) =>
        getSenderAddress(recipient).toLowerCase() ===
          getSenderAddress(thread.sender).toLowerCase() &&
        normalizeSubject(subject) === normalizeSubject(thread.subject);
      if (!targetThread || !matchesComposeTarget(targetThread)) {
        const matchingThreads = threads.filter(matchesComposeTarget);
        if (matchingThreads.length === 0) {
          return "No available email matches the recipient and subject for this reply.";
        }
        if (matchingThreads.length > 1) {
          return "More than one email matches this reply. Open the intended email first.";
        }
        targetThread = matchingThreads[0];
      }
      replyBody = body;
    }

    if (!targetThread) {
      return "Select an email to use the existing reply composer.";
    }

    openEmail(targetThread.id);
    emailActions.openReply(targetThread);
    if (replyBody !== undefined) emailActions.setReplyText(replyBody);
    setIsAssistantOpen(false);
    return "Opened the reply composer for the email.";
  };

  return (
    <>
      <main className="relative flex h-screen w-screen overflow-hidden bg-[#0b0c12] font-sans text-slate-100">
        {activeThread && (syncError || emailError) && (
          <div
            role="alert"
            className="absolute right-4 top-3 z-50 max-w-lg rounded-xl border border-rose-500/20 bg-[#1c1014] px-4 py-3 text-sm text-rose-200 shadow-xl"
          >
            {syncError || emailError}
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
          onReconnectGoogle={() => void reconnectGoogle()}
          onSignOut={onSignOut}
          signOutError={signOutError || reconnectError}
        />
        {activeThread ? (
          <EmailDetailView
            thread={activeThread}
            isRead={activeRead}
            isLoadingBody={isLoadingBody(activeThread.id)}
            bodyError={bodyErrorFor(activeThread.id)}
            onRetryBody={retryEmailBody}
            onBack={() => setSelectedThreadId("")}
            onArchive={archiveSelectedEmail}
            onMarkRead={toggleSelectedEmailRead}
            onDelete={deleteSelectedEmail}
            onSchedule={() => void emailActions.extractMeeting(activeThread)}
            isScheduling={emailActions.schedulingEmailId === activeThread.id}
            isScheduled={isScheduled(activeThread)}
            replyDraft={emailActions.replyDraft}
            isDraftingReply={emailActions.draftingEmailId === activeThread.id}
            isSendingReply={emailActions.sendingEmailId === activeThread.id}
            onOpenReply={emailActions.openReply}
            onDraftReply={(thread) => void emailActions.draftReply(thread)}
            onReplyDraftChange={emailActions.setReplyText}
            onCloseReply={emailActions.closeReply}
            onCopyReply={() => void emailActions.copyReply()}
            onSendReply={() => void emailActions.sendCurrentReply()}
          />
        ) : (
          <EmailListView
            threads={visibleEmails}
            selectedEmailId={selectedThreadId}
            currentFilter={currentFilter}
            isLoading={isLoading}
            isInitialSyncing={isInitialSyncing}
            initialSyncFailed={initialSyncFailed}
            isRefreshing={isRefreshing}
            error={apiError}
            hasLoadError={Boolean(emailError)}
            onSelectEmail={openEmail}
            onRefresh={() => void refreshEmails()}
            onSelectFilter={(filter) => {
              setCurrentFilter(filter);
              setSelectedThreadId("");
            }}
            onToggleRead={(emailId) => void emailActions.toggleEmailRead(emailId)}
          />
        )}
      </main>

      <AssistantPanel
        apiBaseUrl={apiBaseUrl}
        getAccessToken={getGoogleToken}
        pageContext={collectAssistantPageContext(currentFilter, activeThread?.id ?? null)}
        availableEmailIds={new Set(threads.map((thread) => thread.id))}
        onOpenEmail={openAssistantActionEmail}
        onOpenResultEmail={openAssistantResult}
        onOpenCompose={openAssistantCompose}
        onScheduleProposal={emailActions.openScheduleProposal}
        onNavigateToInbox={() => setSelectedThreadId("")}
        onSetFilter={(filter) => {
          setCurrentFilter(filter);
          setSelectedThreadId("");
        }}
        isOpen={isAssistantOpen}
        onOpen={() => setIsAssistantOpen(true)}
        onClose={() => setIsAssistantOpen(false)}
      />

      {emailActions.scheduleProposal && (
        <ScheduleModal
          proposal={emailActions.scheduleProposal}
          apiBaseUrl={apiBaseUrl}
          getAccessToken={getGoogleToken}
          onClose={emailActions.closeScheduleProposal}
          onSuccess={emailActions.confirmScheduledEmail}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
