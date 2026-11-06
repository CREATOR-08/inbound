import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchEmails,
  markEmailRead,
  markEmailUnread,
  updateEmailReadStatus,
} from "../lib/api.ts";
import {
  getEmailFetchReadFilter,
  matchesEmailFilter,
} from "../lib/email-utils.ts";

const withFetch = async (fetchMock, run) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const makeEmailThread = (overrides = {}) => ({
  id: "email-1",
  thread_id: "thread-1",
  sender: "Sender <sender@example.com>",
  subject: "Test Subject",
  preview: "Preview text",
  received_at: "2026-10-31T12:00:00.000Z",
  category: "PRIMARY",
  priority: "HIGH",
  is_archived: false,
  is_read: false,
  ...overrides,
});

test("only read and unread folder changes require a different server query", () => {
  assert.equal(getEmailFetchReadFilter("READ"), true);
  assert.equal(getEmailFetchReadFilter("UNREAD"), false);
  assert.equal(getEmailFetchReadFilter("ALL"), null);
  assert.equal(getEmailFetchReadFilter("TRIAGED"), null);
  assert.equal(getEmailFetchReadFilter("URGENT"), null);
});

test("fetchEmails requests backend with query parameters based on filter options", async () => {
  const calls = [];

  await withFetch(
    async (url, init) => {
      calls.push({ url, method: init?.method, headers: init?.headers });
      return new Response(
        JSON.stringify({
          data: [
            makeEmailThread({ id: "e1", is_read: true }),
            makeEmailThread({ id: "e2", is_read: false }),
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
    async () => {
      // 1. Fetch All (no options)
      await fetchEmails("http://localhost:8000", "token-1");
      assert.equal(calls[0].url, "http://localhost:8000/api/v1/emails");

      // 2. Fetch Read (is_read: true)
      await fetchEmails("http://localhost:8000", "token-1", { is_read: true });
      assert.equal(
        calls[1].url,
        "http://localhost:8000/api/v1/emails?is_read=true",
      );

      // 3. Fetch Unread (is_read: false)
      await fetchEmails("http://localhost:8000", "token-1", { is_read: false });
      assert.equal(
        calls[2].url,
        "http://localhost:8000/api/v1/emails?is_read=false",
      );

      // 4. Fetch status=read
      await fetchEmails("http://localhost:8000", "token-1", { status: "read" });
      assert.equal(
        calls[3].url,
        "http://localhost:8000/api/v1/emails?status=read",
      );

      // 5. Fetch status=unread
      await fetchEmails("http://localhost:8000", "token-1", { status: "unread" });
      assert.equal(
        calls[4].url,
        "http://localhost:8000/api/v1/emails?status=unread",
      );

      // 6. Fetch status=all
      await fetchEmails("http://localhost:8000", "token-1", { status: "all" });
      assert.equal(calls[5].url, "http://localhost:8000/api/v1/emails");
    },
  );
});

test("updateEmailReadStatus, markEmailRead, and markEmailUnread call backend endpoints", async () => {
  const calls = [];

  await withFetch(
    async (url, init) => {
      calls.push({
        url,
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
      });
      const isRead = url.endsWith("/read");
      return new Response(
        JSON.stringify({
          status: "success",
          id: "email-123",
          email_id: "email-123",
          is_read: isRead,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
    async () => {
      // Mark read
      const readResult = await markEmailRead(
        "http://localhost:8000",
        "token-1",
        "email-123",
      );
      assert.equal(
        calls[0].url,
        "http://localhost:8000/api/v1/emails/email-123/read",
      );
      assert.equal(calls[0].method, "POST");
      assert.equal(readResult.is_read, true);

      // Mark unread
      const unreadResult = await markEmailUnread(
        "http://localhost:8000",
        "token-1",
        "email-123",
      );
      assert.equal(
        calls[1].url,
        "http://localhost:8000/api/v1/emails/email-123/unread",
      );
      assert.equal(calls[1].method, "POST");
      assert.equal(unreadResult.is_read, false);

      // updateEmailReadStatus with isRead: false
      const updateResult = await updateEmailReadStatus(
        "http://localhost:8000",
        "token-1",
        "email-123",
        false,
      );
      assert.equal(
        calls[2].url,
        "http://localhost:8000/api/v1/emails/email-123/unread",
      );
      assert.equal(updateResult.is_read, false);
    },
  );
});

test("matchesEmailFilter filters correctly for ALL, UNREAD, and READ", () => {
  const unreadEmail = makeEmailThread({ id: "e1", is_read: false });
  const readEmail = makeEmailThread({ id: "e2", is_read: true });
  const archivedUnreadEmail = makeEmailThread({
    id: "e3",
    is_read: false,
    is_archived: true,
  });
  const scheduledIds = new Set();

  // ALL filter
  assert.equal(matchesEmailFilter(unreadEmail, "ALL", scheduledIds), true);
  assert.equal(matchesEmailFilter(readEmail, "ALL", scheduledIds), true);
  assert.equal(
    matchesEmailFilter(archivedUnreadEmail, "ALL", scheduledIds),
    false,
  );

  // UNREAD filter
  assert.equal(matchesEmailFilter(unreadEmail, "UNREAD", scheduledIds), true);
  assert.equal(matchesEmailFilter(readEmail, "UNREAD", scheduledIds), false);
  assert.equal(
    matchesEmailFilter(archivedUnreadEmail, "UNREAD", scheduledIds),
    false,
  );

  // READ filter
  assert.equal(matchesEmailFilter(unreadEmail, "READ", scheduledIds), false);
  assert.equal(matchesEmailFilter(readEmail, "READ", scheduledIds), true);
  assert.equal(
    matchesEmailFilter(archivedUnreadEmail, "READ", scheduledIds),
    false,
  );
});
