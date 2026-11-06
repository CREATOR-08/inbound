import assert from "node:assert/strict";
import { test } from "node:test";
import { consumeAssistantSSE } from "../lib/assistant-sse.ts";

const responseFromChunks = (chunks) =>
  new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );

test("parses partial SSE frames and appends JSON-encoded multiline tokens", async () => {
  const tokens = [];
  const response = responseFromChunks([
    'event: tok',
    'en\r\ndata: "first\\n',
    'line"\r\n\r\nevent: token\ndata: " second"\n\n',
    'event: done\ndata: {"status":"success","message":"first\\\\nline second"}\n\n',
  ]);

  const result = await consumeAssistantSSE(response, (token) => tokens.push(token));
  assert.deepEqual(tokens, ["first\nline", " second"]);
  assert.equal(result.status, "success");
});

test("surfaces an SSE error event without exposing malformed payload details", async () => {
  const response = responseFromChunks([
    'event: error\ndata: "The assistant could not process your request."\n\n',
  ]);
  await assert.rejects(
    consumeAssistantSSE(response, () => {}),
    /The assistant could not process your request/,
  );
});

test("rejects a stream that ends before its done event", async () => {
  const response = responseFromChunks(['event: token\ndata: "partial"\n\n']);
  await assert.rejects(
    consumeAssistantSSE(response, () => {}),
    /ended before completion/,
  );
});

test("propagates a disconnected response body", async () => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new Error("connection lost"));
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
  await assert.rejects(
    consumeAssistantSSE(response, () => {}),
    /connection lost/,
  );
});

test("aborts a pending stream read", async () => {
  const controller = new AbortController();
  const response = new Response(new ReadableStream());
  const reading = consumeAssistantSSE(response, () => {}, controller.signal);
  controller.abort();
  await assert.rejects(reading, { name: "AbortError" });
});
