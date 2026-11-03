

// export interface EmailThread {
//   id: string;
//   sender: string;
//   subject: string;
//   preview: string;
//   date: string;
//   aiClassification: "URGENT" | "ROUTINE" | "NEWSLETTER";
//   summary?: string;
// }
export type EmailFilter =
  | "ALL"
  | "UNREAD"
  | "READ"
  | "TRIAGED"
  | "URGENT"
  | "HIGH_PRIORITY"
  | "SCHEDULED"
  | "ARCHIVE";

export interface CalendarEventDraft {
  draft_id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: "PENDING" | "APPROVED" | "CANCELLED";
  attendees: string[];
  confidence?: number;
  ambiguity?: string | null;
}

export interface ScheduleProposal extends CalendarEventDraft {
  email_id: string;
  confidence: number;
  description?: string;
}

export interface ExtractedCalendarEvent extends CalendarEventDraft {
  confidence: number;
}

export interface ScheduleExtractionResponse {
  confirmation_required: boolean;
  calendar_event: ExtractedCalendarEvent;
}

export interface CalendarEventConfirmationPayload {
  draft_id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendees: string[];
}

export interface CalendarEventConfirmationResponse {
  status: "success";
  google_event_id: string;
}

export interface ReplyDraft {
  email_id: string;
  sender: string;
  subject: string;
  reply_text: string;
}

export interface EmailThread {
  id: string;
  thread_id: string | null;
  sender: string;
  subject: string;
  preview: string;
  received_at: string | null;
  category: string | null;
  priority: string | null;
  is_archived: boolean;
  recipient?: string;
  to?: string;
  body?: string;
  body_html?: string;
  date?: string;
  reply_outline?: string[];
  suggested_reply?: string;
  calendar_event?: CalendarEventDraft | null;
  is_read?: boolean;
}