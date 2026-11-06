import assert from "node:assert/strict";
import test from "node:test";
import { getOrCreateEmailBodyRequest } from "../lib/email-body-request.ts";

test("coalesces concurrent body loads for one email into a single fetch", async () => {
  const requests = new Map();
  let fetchCount = 0;
  let resolveFetch;
  const fetchBody = () => {
    fetchCount += 1;
    return new Promise((resolve) => {
      resolveFetch = resolve;
    });
  };

  const first = getOrCreateEmailBodyRequest(requests, "email-1", fetchBody);
  const second = getOrCreateEmailBodyRequest(requests, "email-1", fetchBody);
  await Promise.resolve();

  assert.equal(first, second);
  assert.equal(fetchCount, 1);
  resolveFetch({ body: "Full message", body_html: "" });
  assert.deepEqual(await first.promise, { body: "Full message", body_html: "" });
  assert.equal(requests.has("email-1"), false);
});

test("does not reuse a body request across account cache scopes", async () => {
  const requests = new Map();
  let fetchCount = 0;
  const fetchBody = async () => {
    fetchCount += 1;
    return { body: `Body ${fetchCount}`, body_html: "" };
  };

  const first = getOrCreateEmailBodyRequest(
    requests,
    JSON.stringify(["https://api.example", "first@example.com", "same-id"]),
    fetchBody,
  );
  const second = getOrCreateEmailBodyRequest(
    requests,
    JSON.stringify(["https://api.example", "second@example.com", "same-id"]),
    fetchBody,
  );

  assert.notEqual(first, second);
  assert.deepEqual(await first.promise, { body: "Body 1", body_html: "" });
  assert.deepEqual(await second.promise, { body: "Body 2", body_html: "" });
});
