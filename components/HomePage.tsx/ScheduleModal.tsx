"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { CalendarCheck2, LoaderCircle, Plus, X } from "lucide-react";
import type {
  CalendarEventConfirmationPayload,
  CalendarEventConfirmationResponse,
  ScheduleProposal,
} from "@/Types/email";
import { confirmCalendarEvent } from "@/lib/api";

interface ScheduleModalProps {
  proposal: ScheduleProposal;
  apiBaseUrl: string;
  getAccessToken: () => Promise<string>;
  onClose: () => void;
  onSuccess: (
    result: CalendarEventConfirmationResponse,
    payload: CalendarEventConfirmationPayload,
  ) => void;
}

const isoToLocalDateTime = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const localDateTimeToIso = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const isValidEmail = (value: string) =>
  /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value);

const getBackendError = (payload: unknown, fallback: string) => {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (typeof payload !== "object" || payload === null) return fallback;
  if (!("detail" in payload)) {
    if ("message" in payload && typeof payload.message === "string") return payload.message;
    return fallback;
  }

  const detail = payload.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item) => {
      if (typeof item !== "object" || item === null || !("msg" in item)) return [];
      const message = typeof item.msg === "string" ? item.msg : "";
      const location =
        "loc" in item && Array.isArray(item.loc)
          ? item.loc.filter((part: unknown): part is string | number => typeof part === "string" || typeof part === "number").join(".")
          : "";
      return [location ? `${location}: ${message}` : message].filter(Boolean);
    });
    if (messages.length) return messages.join(" ");
  }
  return typeof detail === "object" ? JSON.stringify(detail) : fallback;
};

const readResponsePayload = async (response: Response): Promise<unknown> => {
  const body = await response.text();
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
};

export default function ScheduleModal({
  proposal,
  apiBaseUrl,
  getAccessToken,
  onClose,
  onSuccess,
}: ScheduleModalProps) {
  const [title, setTitle] = useState(proposal.title);
  const [startTime, setStartTime] = useState(() => isoToLocalDateTime(proposal.start_time));
  const [endTime, setEndTime] = useState(() => isoToLocalDateTime(proposal.end_time));
  const [attendees, setAttendees] = useState(proposal.attendees);
  const [attendeeInput, setAttendeeInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<CalendarEventConfirmationResponse | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const successButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const submittingRef = useRef(isSubmitting);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    submittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleInputRef.current?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !submittingRef.current) {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    if (confirmation) successButtonRef.current?.focus();
  }, [confirmation]);

  const addAttendee = (rawValue = attendeeInput) => {
    const email = rawValue.trim().replace(/,$/, "").trim();
    if (!email) return;
    if (!isValidEmail(email)) {
      setError(`“${email}” is not a valid email address.`);
      return;
    }
    if (!attendees.some((existing) => existing.toLowerCase() === email.toLowerCase())) {
      setAttendees((current) => [...current, email]);
    }
    setAttendeeInput("");
    setError("");
  };

  const handleAttendeeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addAttendee();
    } else if (event.key === "Backspace" && !attendeeInput && attendees.length) {
      setAttendees((current) => current.slice(0, -1));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const pendingAttendee = attendeeInput.trim().replace(/,$/, "").trim();
    let finalAttendees = attendees;
    if (pendingAttendee) {
      if (!isValidEmail(pendingAttendee)) {
        setError(`“${pendingAttendee}” is not a valid email address.`);
        return;
      }
      if (!attendees.some((email) => email.toLowerCase() === pendingAttendee.toLowerCase())) {
        finalAttendees = [...attendees, pendingAttendee];
      }
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError("Enter an event title.");
      return;
    }
    const isoStart = localDateTimeToIso(startTime);
    const isoEnd = localDateTimeToIso(endTime);
    if (!isoStart || !isoEnd) {
      setError("Enter valid start and end dates and times.");
      return;
    }
    if (new Date(isoEnd).getTime() <= new Date(isoStart).getTime()) {
      setError("The end time must be later than the start time.");
      return;
    }

    const payload: CalendarEventConfirmationPayload = {
      draft_id: proposal.draft_id,
      title: normalizedTitle,
      start_time: isoStart,
      end_time: isoEnd,
      attendees: finalAttendees,
    };

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      const response = await confirmCalendarEvent(apiBaseUrl, token, payload);
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(getBackendError(result, `Calendar confirmation failed (${response.status}).`));
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("status" in result) ||
        result.status !== "success" ||
        !("google_event_id" in result) ||
        typeof result.google_event_id !== "string"
      ) {
        throw new Error("The calendar response did not include a valid confirmation.");
      }

      const confirmedResult: CalendarEventConfirmationResponse = {
        status: "success",
        google_event_id: result.google_event_id,
      };
      setConfirmation(confirmedResult);
      onSuccess(confirmedResult, payload);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to confirm the calendar event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isSubmitting) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-dialog-title"
        className="my-auto w-full max-w-xl rounded-2xl border border-white/[0.1] bg-[#101117] p-5 shadow-2xl shadow-black/50 sm:p-7"
      >
        {confirmation ? (
          <div className="py-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
              <CalendarCheck2 className="h-6 w-6" />
            </div>
            <h2 id="schedule-dialog-title" className="mt-4 text-lg font-semibold text-white">
              Added to Google Calendar
            </h2>
            <p role="status" className="mt-2 text-sm text-slate-400">
              “{title.trim()}” has been confirmed.
            </p>
            <button
              ref={successButtonRef}
              type="button"
              onClick={onClose}
              className="mt-6 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="schedule-dialog-title" className="text-lg font-semibold text-white">
                    Confirm Calendar Proposal
                  </h2>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2 py-1 text-[10px] font-semibold text-emerald-300">
                    {Math.round(proposal.confidence * 100)}% match
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Review and edit the extracted event before adding it to your calendar.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close calendar proposal"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-3.5 py-3 text-xs leading-relaxed text-rose-200">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-xs font-medium text-slate-300">
                Event title
                <input
                  ref={titleInputRef}
                  type="text"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-400/50"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-300">
                  Start date &amp; time
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="mt-1.5 w-full min-w-0 rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-300">
                  End date &amp; time
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="mt-1.5 w-full min-w-0 rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50"
                  />
                </label>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-300">Attendees</span>
                <div className="mt-1.5 flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-white/[0.1] bg-black/30 px-2.5 py-2 focus-within:border-violet-400/50">
                  {attendees.map((attendee) => (
                    <span
                      key={attendee}
                      className="inline-flex items-center gap-1 rounded-md border border-violet-400/15 bg-violet-400/[0.07] py-1 pl-2 pr-1 text-[11px] text-violet-200"
                    >
                      {attendee}
                      <button
                        type="button"
                        onClick={() => setAttendees((current) => current.filter((email) => email !== attendee))}
                        aria-label={`Remove ${attendee}`}
                        className="rounded p-0.5 text-violet-300/70 hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    inputMode="email"
                    aria-label="Add attendee email"
                    value={attendeeInput}
                    onChange={(event) => setAttendeeInput(event.target.value)}
                    onKeyDown={handleAttendeeKeyDown}
                    placeholder={attendees.length ? "Add email…" : "name@example.com"}
                    className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-xs text-white outline-none placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => addAttendee()}
                    aria-label="Add attendee"
                    className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-600">Press Enter or comma to add an email address.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg px-4 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Adding to Google Calendar…" : "Add to Google Calendar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
