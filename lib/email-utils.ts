import type {
  EmailFilter,
  EmailThread,
  ScheduleExtractionResponse,
} from "@/Types/email";

export type DraftStreamEvent =
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export const isDraftStreamEvent = (value: unknown): value is DraftStreamEvent => {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  if (value.type === "token") return "content" in value && typeof value.content === "string";
  if (value.type === "error") return "message" in value && typeof value.message === "string";
  return value.type === "done";
};

export const isScheduleExtractionResponse = (
  value: unknown,
): value is ScheduleExtractionResponse => {
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

export const isArchivedEmail = (email: EmailThread) => email.is_archived === true;

export const isScheduledEmail = (email: EmailThread, scheduledEmailIds: ReadonlySet<string>) =>
  scheduledEmailIds.has(email.id) || Boolean(email.calendar_event);

export const matchesEmailFilter = (
  email: EmailThread,
  filter: EmailFilter,
  scheduledEmailIds: ReadonlySet<string>,
) => {
  const archived = isArchivedEmail(email);
  switch (filter) {
    case "ALL":
      return !archived;
    case "TRIAGED":
      return !archived && Boolean(email.category);
    case "URGENT":
      return (
        !archived &&
        (email.priority?.toUpperCase() === "URGENT" ||
          email.category?.toUpperCase() === "URGENT")
      );
    case "HIGH_PRIORITY":
      return !archived && email.priority?.toUpperCase() === "HIGH";
    case "SCHEDULED":
      return !archived && isScheduledEmail(email, scheduledEmailIds);
    case "ARCHIVE":
      return archived;
  }
};
