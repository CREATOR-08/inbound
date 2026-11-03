import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, test } from "node:test";
import { syncGoogleTokensToBackend } from "../lib/google-token-sync.ts";

const authSource = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const originalSyncSecret = process.env.GOOGLE_TOKEN_SYNC_SECRET;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  if (originalSyncSecret === undefined) {
    delete process.env.GOOGLE_TOKEN_SYNC_SECRET;
  } else {
    process.env.GOOGLE_TOKEN_SYNC_SECRET = originalSyncSecret;
  }
  globalThis.fetch = originalFetch;
});

test("Google OAuth requests offline access and consent with existing scopes", () => {
  assert.match(authSource, /accessType:\s*"offline"/);
  assert.match(authSource, /prompt:\s*"select_account consent"/);
  assert.match(authSource, /https:\/\/www\.googleapis\.com\/auth\/gmail\.readonly/);
  assert.match(authSource, /https:\/\/www\.googleapis\.com\/auth\/gmail\.send/);
  assert.match(authSource, /https:\/\/www\.googleapis\.com\/auth\/calendar\.events/);
});

test("syncs OAuth tokens server-side without requiring a replacement refresh token", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/api/v1/";
  process.env.GOOGLE_TOKEN_SYNC_SECRET = "server-only-secret";
  const fetchCalls = [];
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args);
    return new Response(null, { status: 204 });
  };
  const expiry = new Date("2026-11-03T12:00:00.000Z");

  await syncGoogleTokensToBackend({
    email: "person@example.com",
    accessToken: "access-token",
    accessTokenExpiresAt: expiry,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0][0],
    "http://localhost:8000/api/v1/auth/google-tokens",
  );
  assert.equal(
    fetchCalls[0][1].headers["X-Google-Token-Sync-Secret"],
    "server-only-secret",
  );
  assert.deepEqual(JSON.parse(fetchCalls[0][1].body), {
    email: "person@example.com",
    access_token: "access-token",
    access_token_expires_at: expiry.toISOString(),
  });
});

test("includes a refresh token only in the server-to-server sync request", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
  process.env.GOOGLE_TOKEN_SYNC_SECRET = "server-only-secret";
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(null, { status: 204 });
  };

  await syncGoogleTokensToBackend({
    email: "person@example.com",
    accessToken: "access-token",
    refreshToken: "refresh-token",
  });

  assert.equal(requestBody.refresh_token, "refresh-token");
});

test("surfaces token-sync errors without including token values", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
  process.env.GOOGLE_TOKEN_SYNC_SECRET = "server-only-secret";
  globalThis.fetch = async () => new Response(null, { status: 503 });

  await assert.rejects(
    syncGoogleTokensToBackend({
      email: "person@example.com",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }),
    (error) => {
      assert.equal(error.message, "Google account token sync failed (503).");
      assert.equal(error.message.includes("access-token"), false);
      assert.equal(error.message.includes("refresh-token"), false);
      return true;
    },
  );
});
