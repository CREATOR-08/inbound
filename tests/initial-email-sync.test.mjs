import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialEmailSyncStatus,
  syncInitialEmails,
} from "../lib/api.ts";
import {
  INITIAL_EMAIL_SYNC_POLL_INTERVAL_MS,
  InitialEmailSyncRegistry,
  pollInitialEmailSync,
} from "../lib/initial-email-sync.ts";

const withFetch = async (fetchMock, run) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test("accepts 202 pending and running responses with zero imported emails", async () => {
  for (const status of ["pending", "running"]) {
    await withFetch(async (url, init) => {
      assert.equal(
        url,
        "http://localhost:8000/api/v1/emails/sync-initial",
      );
      assert.equal(init.method, "POST");
      assert.equal(init.headers.get("Authorization"), "Bearer access-token");
      return new Response(
        JSON.stringify({
          status,
          imported_count: 0,
          skipped_count: 0,
          history_id: "1015739",
        }),
        { status: 202 },
      );
    }, async () => {
      const response = await syncInitialEmails(
        "http://localhost:8000",
        "access-token",
      );
      assert.equal(response.status, status);
      assert.equal(response.imported_count, 0);
      assert.equal(response.skipped_count, 0);
      assert.equal(response.history_id, "1015739");
    });
  }
});

test("reads completed and failed states from the status endpoint", async () => {
  for (const status of ["completed", "failed"]) {
    await withFetch(async (url, init) => {
      assert.equal(
        url,
        "http://localhost:8000/api/v1/emails/sync-initial/status",
      );
      assert.equal(init.method, undefined);
      assert.equal(init.headers.get("Authorization"), "Bearer access-token");
      return new Response(JSON.stringify({ status }), { status: 200 });
    }, async () => {
      assert.deepEqual(
        await getInitialEmailSyncStatus(
          "http://localhost:8000",
          "access-token",
        ),
        { status },
      );
    });
  }
});

test("rejects malformed sync status and counts", async () => {
  for (const payload of [
    { status: "accepted" },
    { status: "running", imported_count: -1 },
    { status: "running", skipped_count: "0" },
  ]) {
    await withFetch(async () => new Response(JSON.stringify(payload), { status: 202 }), async () => {
      await assert.rejects(
        syncInitialEmails("http://localhost:8000", "access-token"),
        /response was invalid/,
      );
    });
  }
});

test("coalesces repeated starts and permits retry after a failed state", () => {
  const registry = new InitialEmailSyncRegistry();

  assert.equal(registry.markStartRequested("account"), true);
  assert.equal(registry.markStartRequested("account"), false);
  registry.setStatus("account", "running");
  assert.equal(registry.markStartRequested("account"), false);
  registry.setStatus("account", "failed");
  assert.equal(registry.resetFailedSync("account"), true);
  assert.equal(registry.getStatus("account"), null);
  assert.equal(registry.markStartRequested("account"), true);
});

test("polls sequentially until completion and stops on failure", async () => {
  const statuses = ["pending", "running", "completed"];
  const observed = [];
  let activeRequests = 0;
  let maximumActiveRequests = 0;

  const result = await pollInitialEmailSync(
    async () => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      const status = statuses.shift();
      activeRequests -= 1;
      return status;
    },
    new AbortController().signal,
    (status) => observed.push(status),
    { intervalMs: 0 },
  );

  assert.equal(result, "completed");
  assert.deepEqual(observed, ["pending", "running", "completed"]);
  assert.equal(maximumActiveRequests, 1);

  let failureReads = 0;
  const failedResult = await pollInitialEmailSync(
    async () => {
      failureReads += 1;
      return "failed";
    },
    new AbortController().signal,
    () => {},
  );
  assert.equal(failedResult, "failed");
  assert.equal(failureReads, 1);
});

test("uses a 4.5 second start-to-start interval without overlapping requests", async () => {
  assert.equal(INITIAL_EMAIL_SYNC_POLL_INTERVAL_MS, 4500);
  const starts = [];
  let activeRequests = 0;
  let maximumActiveRequests = 0;
  let reads = 0;

  const result = await pollInitialEmailSync(
    async () => {
      starts.push(Date.now());
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 25));
      activeRequests -= 1;
      reads += 1;
      return reads === 3 ? "completed" : "running";
    },
    new AbortController().signal,
    () => {},
    { intervalMs: 60 },
  );

  assert.equal(result, "completed");
  assert.equal(maximumActiveRequests, 1);
  assert.equal(starts.length, 3);
  for (let index = 1; index < starts.length; index += 1) {
    const elapsed = starts[index] - starts[index - 1];
    assert.ok(elapsed >= 50, `poll started too early after ${elapsed}ms`);
    assert.ok(elapsed < 500, `poll cadence drifted to ${elapsed}ms`);
  }
});

test("retries temporary network errors and cleans up the polling timer on abort", async () => {
  let retryReads = 0;
  const retryResult = await pollInitialEmailSync(
    async () => {
      retryReads += 1;
      if (retryReads === 1) throw new TypeError("temporary network issue");
      return "completed";
    },
    new AbortController().signal,
    () => {},
    { intervalMs: 0, timeoutMs: 5000 },
  );
  assert.equal(retryResult, "completed");
  assert.equal(retryReads, 2);

  const controller = new AbortController();
  let reads = 0;
  const readStatus = async () => {
    reads += 1;
    return "running";
  };

  const polling = pollInitialEmailSync(
    readStatus,
    controller.signal,
    () => {},
    { intervalMs: 50, timeoutMs: 5000 },
  );

  setTimeout(() => controller.abort(), 5);
  assert.equal(await polling, "aborted");
  await new Promise((resolve) => setTimeout(resolve, 70));
  assert.equal(reads, 1);
});

test("returns a timeout for a sync that remains pending", async () => {
  let reads = 0;
  const result = await pollInitialEmailSync(
    async () => {
      reads += 1;
      return "pending";
    },
    new AbortController().signal,
    () => {},
    { intervalMs: 1, timeoutMs: 5 },
  );

  assert.equal(result, "timeout");
  assert.ok(reads >= 1);
});

test("aborts stalled status requests and in-flight requests on unmount", async () => {
  let timedOutRequests = 0;
  const timedOut = await pollInitialEmailSync(
    (signal) =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          timedOutRequests += 1;
          reject(new DOMException("Request aborted", "AbortError"));
        });
      }),
    new AbortController().signal,
    () => {},
    { intervalMs: 1, timeoutMs: 10, requestTimeoutMs: 5 },
  );
  assert.equal(timedOut, "timeout");
  assert.ok(timedOutRequests >= 1);

  const controller = new AbortController();
  let unmountAbortCount = 0;
  const polling = pollInitialEmailSync(
    (signal) =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          unmountAbortCount += 1;
          reject(new DOMException("Request aborted", "AbortError"));
        });
      }),
    controller.signal,
    () => {},
  );
  setTimeout(() => controller.abort(), 5);
  assert.equal(await polling, "aborted");
  assert.equal(unmountAbortCount, 1);
});
