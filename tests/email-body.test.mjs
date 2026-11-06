import assert from "node:assert/strict";
import test from "node:test";
import { fetchEmailBody } from "../lib/api.ts";

test("fetchEmailBody forwards cancellation to the body request", async () => {
  const controller = new AbortController();
  const originalFetch = globalThis.fetch;
  let requestSignal;

  globalThis.fetch = async (url, init) => {
    assert.equal(url, "http://localhost:8000/api/v1/emails/email%2F1/body");
    requestSignal = init.signal;
    return new Response(
      JSON.stringify({ body: "Plain text", body_html: "<p>HTML</p>" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const body = await fetchEmailBody(
      "http://localhost:8000",
      "email/1",
      "access-token",
      controller.signal,
    );
    assert.deepEqual(body, { body: "Plain text", body_html: "<p>HTML</p>" });
    assert.equal(requestSignal, controller.signal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
