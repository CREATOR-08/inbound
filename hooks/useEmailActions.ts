"use client";

import { useCallback, useState } from "react";
import {
  draftReply as requestReplyDraft,
  extractSchedule,
  sendReply,
} from "@/lib/api";
import {
  isDraftStreamEvent,
  isScheduleExtractionResponse,
} from "@/lib/email-utils";
import type {
  CalendarEventConfirmationPayload,
  CalendarEventConfirmationResponse,
  EmailThread,
  ReplyDraft,
  ScheduleProposal,
} from "@/Types/email";

type Notify = (message: string, type: "success" | "error") => void;

interface UseEmailActionsOptions {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string>;
  loadEmailBody: (emailId: string) => Promise<{ body: string; body_html: string }>;
  setEmails: React.Dispatch<React.SetStateAction<EmailThread[]>>;
  notify: Notify;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useEmailActions({
  apiBaseUrl,
  getAccessToken,
  loadEmailBody,
  setEmails,
  notify,
}: UseEmailActionsOptions) {
  const [replyDraft, setReplyDraft] = useState<ReplyDraft | null>(null);
  const [draftingEmailId, setDraftingEmailId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [scheduleProposal, setScheduleProposal] = useState<ScheduleProposal | null>(null);
  const [schedulingEmailId, setSchedulingEmailId] = useState<string | null>(null);
  const [scheduledEmailIds, setScheduledEmailIds] = useState<Set<string>>(new Set());

  const openReply = useCallback((email: EmailThread) => {
    setReplyDraft((current) =>
      current?.email_id === email.id
        ? current
        : {
            email_id: email.id,
            sender: email.sender,
            subject: email.subject,
            reply_text: "",
          },
    );
  }, []);

  const draftReply = useCallback(
    async (email: EmailThread) => {
      if (!replyDraft || replyDraft.email_id !== email.id) {
        setReplyDraft({
          email_id: email.id,
          sender: email.sender,
          subject: email.subject,
          reply_text: "",
        });
      }
      setDraftingEmailId(email.id);
      try {
        if (email.body === undefined && email.body_html === undefined) {
          await loadEmailBody(email.id);
        }
        const token=await getAccessToken();
        const response = await requestReplyDraft(apiBaseUrl,token, email.id);
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
          if (!isDraftStreamEvent(event)) {
            throw new Error("The draft stream contained an invalid event.");
          }
          if (event.type === "token") {
            setReplyDraft((current) =>
              current?.email_id === email.id
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
        notify(getErrorMessage(error, "Unable to draft a reply."), "error");
      } finally {
        setDraftingEmailId(null);
      }
    },
    [apiBaseUrl, loadEmailBody, notify, replyDraft],
  );

  const sendCurrentReply = useCallback(async () => {
    if (!replyDraft) return;
    setSendingEmailId(replyDraft.email_id);
    try {
      const token = await getAccessToken();
      await sendReply(apiBaseUrl, token, replyDraft.email_id, replyDraft.reply_text);
      setReplyDraft(null);
      notify("Reply sent.", "success");
    } catch (error: unknown) {
      notify(getErrorMessage(error, "Unable to send reply."), "error");
    } finally {
      setSendingEmailId(null);
    }
  }, [apiBaseUrl, getAccessToken, notify, replyDraft]);

  const copyReply = useCallback(async () => {
    if (!replyDraft) return;
    try {
      await navigator.clipboard.writeText(replyDraft.reply_text);
      notify("Reply copied to clipboard.", "success");
    } catch {
      notify("Unable to copy the reply. Please select and copy the text manually.", "error");
    }
  }, [notify, replyDraft]);

const extractMeeting = useCallback(
  async (email: EmailThread) => {
    setSchedulingEmailId(email.id);

    try {
      const token = await getAccessToken();

      const response = await extractSchedule(
        apiBaseUrl,
        token,
        email.id,
      );

      const result: unknown = await response.json();

      if (!isScheduleExtractionResponse(result)) {
        throw new Error(
          "The schedule response did not include a calendar proposal.",
        );
      }

      const event = result.calendar_event;
      const needsManualSchedule =
        event.confidence === 0 &&
        event.start_time === "" &&
        event.end_time === "";

      if (
        !needsManualSchedule &&
        (!Number.isFinite(new Date(event.start_time).getTime()) ||
          !Number.isFinite(new Date(event.end_time).getTime()))
      ) {
        throw new Error(
          "The calendar proposal contained an invalid date or time.",
        );
      }

      setScheduleProposal({
        ...event,
        email_id: email.id,
      });
    } catch (error: unknown) {
      notify(
        getErrorMessage(error, "Unable to extract a meeting."),
        "error",
      );
    } finally {
      setSchedulingEmailId(null);
    }
  },
  [apiBaseUrl, getAccessToken, notify],
);

  const archiveEmail = useCallback(
    (emailId: string) => {
      setEmails((current) =>
        current.map((email) => (email.id === emailId ? { ...email, is_archived: true } : email)),
      );
      notify("Email archived.", "success");
    },
    [notify, setEmails],
  );

  const deleteEmail = useCallback(
    (emailId: string) => {
      setEmails((current) => current.filter((email) => email.id !== emailId));
      notify("Email deleted from this inbox.", "success");
    },
    [notify, setEmails],
  );

  const toggleEmailRead = useCallback(
    (emailId: string) => {
      setEmails((current) =>
        current.map((email) =>
          email.id === emailId ? { ...email, is_read: !email.is_read } : email,
        ),
      );
    },
    [setEmails],
  );

  const confirmScheduledEmail = useCallback(
    (
      result: CalendarEventConfirmationResponse,
      payload: CalendarEventConfirmationPayload,
    ) => {
      if (!scheduleProposal) return;
      setScheduledEmailIds((previous) => new Set(previous).add(scheduleProposal.email_id));
      setEmails((current) =>
        current.map((email) =>
          email.id === scheduleProposal.email_id
            ? {
                ...email,
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
            : email,
        ),
      );
      notify(`Meeting added to Google Calendar (${result.google_event_id}).`, "success");
    },
    [notify, scheduleProposal, setEmails],
  );

  return {
    replyDraft,
    draftingEmailId,
    sendingEmailId,
    scheduleProposal,
    schedulingEmailId,
    scheduledEmailIds,
    openReply,
    draftReply,
    setReplyText: (replyText: string) =>
      setReplyDraft((draft) => (draft ? { ...draft, reply_text: replyText } : draft)),
    closeReply: () => setReplyDraft(null),
    sendCurrentReply,
    copyReply,
    extractMeeting,
    closeScheduleProposal: () => setScheduleProposal(null),
    confirmScheduledEmail,
    archiveEmail,
    deleteEmail,
    toggleEmailRead,
  };
}
