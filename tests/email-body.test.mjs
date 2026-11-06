import assert from "node:assert/strict";
import test from "node:test";
import { fetchEmailBody } from "../lib/api.ts";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const backend = process.env.NEXT_PUBLIC_API_URL;

assert.ok(backend, "NEXT_PUBLIC_API_URL is not configured");

test("fetchEmailBody forwards cancellation to the body request", async () => {
  const controller = new AbortController();
  const originalFetch = globalThis.fetch;
  let requestSignal;

  globalThis.fetch = async (url, init) => {
    const requestUrl = new URL(url, backend);

    assert.equal(
      requestUrl.pathname,
      "/api/v1/emails/email%2F1/body"
    );

    assert.equal(requestUrl.origin, new URL(backend).origin);

    requestSignal = init.signal;

    return new Response(
      JSON.stringify({
        body: "Plain text",
        body_html: "<p>HTML</p>",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  };

  try {
    const body = await fetchEmailBody(
      backend,
      "email/1",
      "access-token",
      controller.signal
    );

    assert.deepEqual(body, {
      body: "Plain text",
      body_html: "<p>HTML</p>",
    });

    assert.equal(requestSignal, controller.signal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});