import type {
  CalendarEventConfirmationPayload,
  EmailThread,
} from "@/Types/email";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface WatchRegistrationResponse {
  status: "subscribed";
  data: {
    historyId: string;
    expiration: string;
  };
}

export const getApiBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    .replace(/\/+$/, "")
    .replace(/\/api(?:\/v1)?$/i, "");

const getEndpoint = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/+$/, "").replace(/\/api(?:\/v1)?$/i, "")}${path}`;

const readErrorMessage = async (response: Response) => {
  const body = await response.text();
  if (!body) return `Request failed (${response.status}).`;

  try {
    const payload: unknown = JSON.parse(body);
    if (typeof payload === "object" && payload !== null) {
      if ("detail" in payload && typeof payload.detail === "string") return payload.detail;
      if ("message" in payload && typeof payload.message === "string") return payload.message;
    }
  } catch {
    return body;
  }
  return body;
};

const request = async (baseUrl: string, path: string, init?: RequestInit) => {
  const response = await fetch(getEndpoint(baseUrl, path), init);
  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return response;
};

const isEmailThread = (value: unknown): value is EmailThread =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "sender" in value &&
  typeof value.sender === "string" &&
  "subject" in value &&
  typeof value.subject === "string" &&
  "category" in value &&
  typeof value.category === "string" &&
  "priority" in value &&
  typeof value.priority === "string";

export async function fetchEmails(baseUrl: string): Promise<EmailThread[]> {
  const response = await request(baseUrl, "/api/v1/emails");
  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    !Array.isArray(payload.data) ||
    !payload.data.every(isEmailThread)
  ) {
    throw new Error("The email list response was invalid.");
  }
  return payload.data;
}

export async function fetchEmailBody(baseUrl: string, emailId: string, token: string) {
  const response = await request(baseUrl, `/api/v1/emails/${encodeURIComponent(emailId)}/body`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("body" in payload) ||
    typeof payload.body !== "string" ||
    !("body_html" in payload) ||
    typeof payload.body_html !== "string"
  ) {
    throw new Error("The email body response was invalid.");
  }
  return { body: payload.body, body_html: payload.body_html };
}

export async function registerWatch(baseUrl: string, token: string): Promise<WatchRegistrationResponse> {
  const response = await request(baseUrl, "/api/v1/emails/watch", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("status" in payload) ||
    payload.status !== "subscribed" ||
    !("data" in payload) ||
    typeof payload.data !== "object" ||
    payload.data === null ||
    !("historyId" in payload.data) ||
    typeof payload.data.historyId !== "string" ||
    !("expiration" in payload.data) ||
    typeof payload.data.expiration !== "string"
  ) {
    throw new Error("The Gmail watch registration response was invalid.");
  }
  return {
    status: "subscribed",
    data: {
      historyId: payload.data.historyId,
      expiration: payload.data.expiration,
    },
  };
}

export function extractSchedule(baseUrl: string, emailId: string) {
  return request(baseUrl, "/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_id: emailId }),
  });
}

export function confirmCalendarEvent(
  baseUrl: string,
  token: string,
  payload: CalendarEventConfirmationPayload,
): Promise<Response> {
  return request(baseUrl, "/api/calendar/confirm", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function draftReply(baseUrl: string, emailId: string) {
  return request(baseUrl, "/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_id: emailId }),
  });
}

export function sendReply(baseUrl: string, token: string, emailId: string, body: string) {
  return request(baseUrl, "/api/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_id: emailId, body }),
  });
}
