
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

export interface InitialEmailSyncResponse {
  status: "completed" | "already_completed";
}

/**
 * Normalize the API base URL.
 *
 * Supported environment values:
 *   http://localhost:8000
 *   http://localhost:8000/api
 *   http://localhost:8000/api/v1
 *
 * Endpoint paths below include /api/v1 where required.
 */
export const getApiBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    .replace(/\/+$/, "")
    .replace(/\/api(?:\/v1)?$/i, "");

/**
 * Build a URL without duplicating /api or /api/v1.
 */
const getEndpoint = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/+$/, "").replace(/\/api(?:\/v1)?$/i, "")}${path}`;

/**
 * Safely extract an error message from a backend response.
 */
const readErrorMessage = async (response: Response) => {
  const body = await response.text();

  if (!body) {
    return "The server returned no error details.";
  }

  let payload: unknown;

  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    return "The server returned an unreadable error response.";
  }

  if (typeof payload !== "object" || payload === null) {
    return "The server returned no error details.";
  }

  const redactCredentials = (message: string) =>
    message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 1000);

  if ("detail" in payload && typeof payload.detail === "string") {
    return redactCredentials(payload.detail);
  }

  if ("detail" in payload && Array.isArray(payload.detail)) {
    const messages = payload.detail.flatMap((issue) => {
      if (
        typeof issue !== "object" ||
        issue === null ||
        !("msg" in issue) ||
        typeof issue.msg !== "string"
      ) {
        return [];
      }

      const location =
        "loc" in issue && Array.isArray(issue.loc)
          ? issue.loc
              .filter(
                (part: unknown): part is string =>
                  typeof part === "string" || typeof part === "number",
              )
              .join(".")
          : "";

      return [
        redactCredentials(
          location ? `${location}: ${issue.msg}` : issue.msg,
        ),
      ];
    });

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if ("message" in payload && typeof payload.message === "string") {
    return redactCredentials(payload.message);
  }

  return "The server returned no error details.";
};

/**
 * Shared HTTP request helper.
 */
const request = async (
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  const headers = new Headers(init?.headers);

  const response = await fetch(getEndpoint(baseUrl, path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    const details = await readErrorMessage(response);

    throw new ApiError(
      `Request failed with status ${response.status}: ${details}`,
      response.status,
    );
  }

  return response;
};

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

/**
 * Validate the email list response.
 */
const getEmailThreadValidationError = (
  value: unknown,
): string | null => {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return "record must be an object";
  }

  if (!("id" in value) || typeof value.id !== "string") {
    return "id must be a string";
  }

  if (!("sender" in value) || typeof value.sender !== "string") {
    return "sender must be a string";
  }

  if (!("subject" in value) || typeof value.subject !== "string") {
    return "subject must be a string";
  }

  if (!("thread_id" in value) || !isStringOrNull(value.thread_id)) {
    return "thread_id must be a string or null";
  }

  if (!("preview" in value) || typeof value.preview !== "string") {
    return "preview must be a string";
  }

  if (!("received_at" in value) || !isStringOrNull(value.received_at)) {
    return "received_at must be a string or null";
  }

  if (!("category" in value) || !isStringOrNull(value.category)) {
    return "category must be a string or null";
  }

  if (!("priority" in value) || !isStringOrNull(value.priority)) {
    return "priority must be a string or null";
  }

  if (!("is_archived" in value) || typeof value.is_archived !== "boolean") {
    return "is_archived must be a boolean";
  }

  return null;
};

/**
 * GET /api/v1/emails
 *
 * Fetch the authenticated user's emails.
 */
export async function fetchEmails(
  baseUrl: string,
  token: string,
): Promise<EmailThread[]> {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error(
      "An active Google access token is required to load emails.",
    );
  }

  const response = await request(baseUrl, "/api/v1/emails", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload: unknown = await response.json();

  let emails: unknown[];

  if (Array.isArray(payload)) {
    emails = payload;
  } else if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload
  ) {
    if (!Array.isArray(payload.data)) {
      throw new Error(
        'The email list response was invalid: field "data" must be an array.',
      );
    }

    emails = payload.data;
  } else {
    throw new Error(
      'The email list response was invalid: field "data" must be an array.',
    );
  }

  let firstInvalidRecord: string | null = null;

  emails.forEach((email, index) => {
    const validationError = getEmailThreadValidationError(email);

    if (validationError && firstInvalidRecord === null) {
      firstInvalidRecord = `record ${index}: ${validationError}`;
    }
  });

  if (firstInvalidRecord !== null) {
    throw new Error(
      `The email list response was invalid: ${firstInvalidRecord}.`,
    );
  }

  return emails as EmailThread[];
}

/**
 * POST /api/v1/emails/sync-initial
 *
 * Import the authenticated user's historical emails if the initial sync has
 * not already completed.
 */
export async function syncInitialEmails(
  baseUrl: string,
  token: string,
): Promise<InitialEmailSyncResponse> {
  if (!token.trim()) {
    throw new Error(
      "An active Google access token is required to sync emails.",
    );
  }

  const response = await request(baseUrl, "/api/v1/emails/sync-initial", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload: unknown = await response.json();

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("status" in payload) ||
    (payload.status !== "completed" &&
      payload.status !== "already_completed")
  ) {
    throw new Error("The initial email sync response was invalid.");
  }

  return { status: payload.status };
}

/**
 * GET /api/v1/emails/{email_id}/body
 *
 * Fetch the plain-text and HTML body of an email.
 */
export async function fetchEmailBody(
  baseUrl: string,
  emailId: string,
  token: string,
) {
  if (!token.trim()) {
    throw new Error("An active Google access token is required.");
  }

  const response = await request(
    baseUrl,
    `/api/v1/emails/${encodeURIComponent(emailId)}/body`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

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

  return {
    body: payload.body,
    body_html: payload.body_html,
  };
}

/**
 * POST /api/v1/emails/watch
 *
 * Register a Gmail push-notification watch.
 */
export async function registerWatch(
  baseUrl: string,
  token: string,
): Promise<WatchRegistrationResponse> {
  if (!token.trim()) {
    throw new Error("An active Google access token is required.");
  }

  const response = await request(baseUrl, "/api/v1/emails/watch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    throw new Error(
      "The Gmail watch registration response was invalid.",
    );
  }

  return {
    status: "subscribed",
    data: {
      historyId: payload.data.historyId,
      expiration: payload.data.expiration,
    },
  };
}

/**
 * POST /api/v1/actions/schedule
 *
 * Generate a schedule from an email.
 */
export function extractSchedule(
  baseUrl: string,
  token: string,
  emailId: string,
) {
  return request(baseUrl, "/api/v1/actions/schedule", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_id: emailId,
    }),
  });
}
/**
 * POST /api/v1/actions/calendar/confirm
 *
 * Confirm a calendar event.
 */
export function confirmCalendarEvent(
  baseUrl: string,
  token: string,
  payload: CalendarEventConfirmationPayload,
): Promise<Response> {
  if (!token.trim()) {
    throw new Error("An active Google access token is required.");
  }

  return request(
    baseUrl,
    "/api/v1/actions/calendar/confirm",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

/**
 * POST /api/v1/actions/draft
 *
 * Generate a reply draft for an email.
 *
 * NOTE:
 * This preserves the existing request payload. If your backend requires
 * the Google token or additional fields, update this function to match
 * the actual backend handler schema.
 */
export function draftReply(
  baseUrl: string,
  token: string,
  emailId: string,
) {
  return request(baseUrl, "/api/v1/actions/draft", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_id: emailId,
    }),
  });
}

/**
 * POST /api/v1/actions/send
 *
 * Send a reply to an email.
 */
export function sendReply(
  baseUrl: string,
  token: string,
  emailId: string,
  body: string,
) {
  if (!token.trim()) {
    throw new Error("An active Google access token is required.");
  }

  return request(baseUrl, "/api/v1/actions/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_id: emailId,
      body,
    }),
  });
}
