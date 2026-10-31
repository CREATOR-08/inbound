"use client";
import AssistantPanel from "@/components/assistant/AssistantPannel";
import { useState } from "react";
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

interface InboxProps {
  user: { name: string; email: string };
  onSignOut: () => void;
  signOutError: string;
}

export default function Inbox({ user, onSignOut, signOutError }: InboxProps) {
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [currentFilter, setCurrentFilter] = useState<EmailFilter>("ALL");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const apiBaseUrl = getApiBaseUrl();
  const { getAccessToken: getGoogleToken, invalidateAccessToken } = useGoogleAccessToken();
  const { toast, notify } = useToast();

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
    watchError,
    refresh: refreshEmails,
  } = useGmailSync({
    apiBaseUrl,
    accountKey: user.email,
    enabled: true,
    getAccessToken: getGoogleToken,
  });

  const activeThread = threads.find((thread) => thread.id === selectedThreadId) || null;
  const {
    loadEmailBody,
    isLoadingBody,
    bodyErrorFor,
    retryEmailBody,
  } = useEmailBody({
    apiBaseUrl,
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
    if (activeThread) emailActions.toggleEmailRead(activeThread.id);
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
    setSelectedThreadId(result.id);
  };

  const openAssistantActionEmail = (emailId: string) => {
    if (!threads.some((thread) => thread.id === emailId)) return;
    setSelectedThreadId(emailId);
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
            syncError={syncError}
            hasLoadError={Boolean(emailError)}
            onSelectEmail={setSelectedThreadId}
            onRefresh={() => void refreshEmails()}
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
