import type { EmailFilter } from "@/Types/email";

export interface AssistantPageContext {
  page: "inbox" | "email_detail";
  active_filter: EmailFilter;
  selected_email_id: string | null;
}

export interface AssistantConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantQueryFilter {
  field: "sender" | "subject" | "priority" | "category" | "received_at" | "is_archived";
  operator: "eq" | "contains" | "gt" | "gte" | "lt" | "lte" | "in" | "between";
  value: string | boolean | string[] | boolean[];
}

export interface AssistantQuerySpec {
  resource: "emails";
  filters: AssistantQueryFilter[];
  sort_by: "received_at" | "sender" | "subject" | "priority";
  sort_order: "asc" | "desc";
  limit: number;
  offset: number;
}

export interface AssistantEmailSummary {
  id: string;
  thread_id: string | null;
  sender: string;
  subject: string;
  preview: string;
  received_at: string | null;
  category: string | null;
  priority: string | null;
  is_archived: boolean;
}

export interface AssistantEmailQueryResult {
  resource: "emails";
  items: AssistantEmailSummary[];
  total: number;
  limit: number;
  offset: number;
  next_offset: number | null;
  query_spec: AssistantQuerySpec;
}

export type AssistantIntent =
  | "DATA_QUERY"
  | "UI_ACTION"
  | "QUESTION"
  | "WORKFLOW"
  | "CLARIFICATION";

export type AssistantStatus =
  | "success"
  | "error"
  | "invalid_request"
  | "awaiting_confirmation"
  | "confirmed"
  | "rate_limited"
  | "unsupported";

export interface AssistantUIAction {
  type: string;
  parameters: Record<string, unknown>;
  description: string;
}

export interface AssistantWorkflowStep {
  tool:
    | "search_emails"
    | "read_email"
    | "summarize_email"
    | "triage_email"
    | "draft_email"
    | "send_email_reply"
    | "mark_email_read"
    | "mark_email_unread"
    | "archive_emails"
    | "schedule_event"
    | "unknown";
  parameters: Record<string, unknown>;
  description: string;
}

export interface AssistantCommandResponse {
  status: AssistantStatus;
  intent: AssistantIntent;
  message: string;
  data: unknown;
  actions: AssistantUIAction[];
  requires_confirmation: boolean;
  requires_clarification: boolean;
}

export interface AssistantCommandRequest {
  message: string;
  session_id: string;
  page_context: AssistantPageContext;
  conversation_history: AssistantConversationMessage[];
  query_context?: AssistantQuerySpec;
  approved_workflow?: AssistantWorkflowStep[] | null;
  confirm_workflow?: boolean;
}
