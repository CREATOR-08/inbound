import type {
  AssistantCommandRequest,
  AssistantCommandResponse,
  AssistantEmailQueryResult,
  AssistantEmailSummary,
  AssistantIntent,
  AssistantQueryFilter,
  AssistantQuerySpec,
  AssistantStatus,
  AssistantUIAction,
} from "@/Types/assistant";
import { consumeAssistantSSE } from "@/lib/assistant-sse";

export class AssistantApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AssistantApiError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isQueryFilter = (value: unknown): value is AssistantQueryFilter => {
  if (!isRecord(value)) return false;
  const fields = [
    "sender",
    "subject",
    "priority",
    "category",
    "received_at",
    "is_archived",
  ];
  const operators = ["eq", "contains", "gt", "gte", "lt", "lte", "in", "between"];
  const filterValue = value.value;
  return (
    typeof value.field === "string" &&
    fields.includes(value.field) &&
    typeof value.operator === "string" &&
    operators.includes(value.operator) &&
    (typeof filterValue === "string" ||
      typeof filterValue === "boolean" ||
      (isStringArray(filterValue) && filterValue.length > 0) ||
      (Array.isArray(filterValue) &&
        filterValue.length > 0 &&
        filterValue.every((item) => typeof item === "boolean")))
  );
};

const isQuerySpec = (value: unknown): value is AssistantQuerySpec => {
  if (!isRecord(value)) return false;
  return (
    value.resource === "emails" &&
    Array.isArray(value.filters) &&
    value.filters.length <= 10 &&
    value.filters.every(isQueryFilter) &&
    ["received_at", "sender", "subject", "priority"].includes(String(value.sort_by)) &&
    ["asc", "desc"].includes(String(value.sort_order)) &&
    Number.isInteger(value.limit) &&
    Number(value.limit) >= 1 &&
    Number(value.limit) <= 50 &&
    Number.isInteger(value.offset) &&
    Number(value.offset) >= 0 &&
    Number(value.offset) <= 10_000
  );
};

const isEmailSummary = (value: unknown): value is AssistantEmailSummary =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isStringOrNull(value.thread_id) &&
  typeof value.sender === "string" &&
  typeof value.subject === "string" &&
  typeof value.preview === "string" &&
  isStringOrNull(value.received_at) &&
  isStringOrNull(value.category) &&
  isStringOrNull(value.priority) &&
  typeof value.is_archived === "boolean";

export const isAssistantEmailQueryResult = (
  value: unknown,
): value is AssistantEmailQueryResult =>
  isRecord(value) &&
  value.resource === "emails" &&
  Array.isArray(value.items) &&
  value.items.every(isEmailSummary) &&
  value.items.length <= Number(value.limit) &&
  Number.isInteger(value.total) &&
  Number(value.total) >= 0 &&
  Number.isInteger(value.limit) &&
  Number(value.limit) >= 1 &&
  Number(value.limit) <= 50 &&
  Number.isInteger(value.offset) &&
  Number(value.offset) >= 0 &&
  Number(value.offset) <= 10_000 &&
  (value.next_offset === null ||
    (Number.isInteger(value.next_offset) &&
      Number(value.next_offset) >= 0 &&
      Number(value.next_offset) <= 10_000)) &&
  isQuerySpec(value.query_spec) &&
  value.query_spec.limit === value.limit &&
  value.query_spec.offset === value.offset;

const getHttpErrorMessage = (status: number) => {
  if (status === 401 || status === 403) {
    return "Your Google connection may have expired. Reconnect your account and try again.";
  }
  if (status === 422) {
    return "The assistant could not accept this request. Please try again.";
  }
  if (status === 429) {
    return "The assistant is receiving too many requests. Wait a moment and try again.";
  }
  if (status === 500 || status === 502 || status === 503) {
    return "The assistant service is temporarily unavailable. Please try again later.";
  }
  return "The assistant request failed. Please try again.";
};

const parseAction = (value: unknown): AssistantUIAction => {
  if (
    !isRecord(value) ||
    typeof value.type !== "string" ||
    !isRecord(value.parameters) ||
    typeof value.description !== "string"
  ) {
    throw new AssistantApiError("The assistant returned an invalid response.");
  }
  return {
    type: value.type,
    parameters: value.parameters,
    description: value.description,
  };
};

const intentValues: AssistantIntent[] = [
  "DATA_QUERY",
  "UI_ACTION",
  "QUESTION",
  "WORKFLOW",
  "CLARIFICATION",
];
const statusValues: AssistantStatus[] = [
  "success",
  "error",
  "invalid_request",
  "awaiting_confirmation",
  "confirmed",
  "rate_limited",
  "unsupported",
];

export const parseAssistantResponse = (value: unknown): AssistantCommandResponse => {
  if (
    !isRecord(value) ||
    typeof value.status !== "string" ||
    !statusValues.includes(value.status as AssistantStatus) ||
    typeof value.intent !== "string" ||
    !intentValues.includes(value.intent as AssistantIntent) ||
    typeof value.message !== "string" ||
    !value.message.trim() ||
    typeof value.requires_confirmation !== "boolean" ||
    typeof value.requires_clarification !== "boolean" ||
    !Array.isArray(value.actions) ||
    (value.data !== null && !isRecord(value.data))
  ) {
    throw new AssistantApiError("The assistant returned an invalid response.");
  }

  const data = value.data;
  if (isRecord(data) && data.resource === "emails" && !isAssistantEmailQueryResult(data)) {
    throw new AssistantApiError("The assistant returned invalid email search results.");
  }

  return {
    status: value.status as AssistantStatus,
    intent: value.intent as AssistantIntent,
    message: value.message,
    data,
    actions: value.actions.map(parseAction),
    requires_confirmation: value.requires_confirmation,
    requires_clarification: value.requires_clarification,
  };
};

export async function sendAssistantCommand(
  baseUrl: string,
  accessToken: string,
  payload: AssistantCommandRequest,
  signal: AbortSignal,
): Promise<AssistantCommandResponse> {
  if (!accessToken.trim()) {
    throw new AssistantApiError("An active Google connection is required.");
  }

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/+$/, "").replace(/\/api(?:\/v1)?$/i, "")}/api/v1/assistant/command`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new AssistantApiError(
      "Could not reach the assistant service. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new AssistantApiError(getHttpErrorMessage(response.status), response.status);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new AssistantApiError("The assistant returned an invalid response.");
  }

  return parseAssistantResponse(result);
}

export async function sendAssistantCommandStream(
  baseUrl: string,
  accessToken: string,
  payload: AssistantCommandRequest,
  signal: AbortSignal,
  onToken: (token: string) => void,
): Promise<AssistantCommandResponse> {
  if (!accessToken.trim()) {
    throw new AssistantApiError("An active Google connection is required.");
  }

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/+$/, "").replace(/\/api(?:\/v1)?$/i, "")}/api/v1/assistant/command/stream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
        signal,
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new AssistantApiError(
      "Could not reach the assistant service. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new AssistantApiError(getHttpErrorMessage(response.status), response.status);
  }
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new AssistantApiError("The assistant returned an invalid streaming response.");
  }

  try {
    const result = await consumeAssistantSSE(response, onToken, signal);
    return parseAssistantResponse(result);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof AssistantApiError) throw error;
    throw new AssistantApiError(
      error instanceof Error
        ? error.message
        : "The assistant request failed. Please try again.",
    );
  }
}
