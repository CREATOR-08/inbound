import type {
  InitialEmailSyncResponse,
  InitialEmailSyncState,
} from "@/lib/api";

export interface InitialEmailSyncSnapshot {
  response: InitialEmailSyncResponse | null;
  initialImportWasEligible: boolean;
  startRequested: boolean;
}

interface AccountState {
  snapshot: InitialEmailSyncSnapshot;
  listeners: Set<() => void>;
  initialization: Promise<void> | null;
  completionRefreshes: Map<string, Promise<void>>;
}

const createAccountState = (): AccountState => ({
  snapshot: {
    response: null,
    initialImportWasEligible: false,
    startRequested: false,
  },
  listeners: new Set(),
  initialization: null,
  completionRefreshes: new Map(),
});

export class InitialEmailSyncRegistry {
  private readonly accounts = new Map<string, AccountState>();

  private getAccount(key: string) {
    let account = this.accounts.get(key);
    if (!account) {
      account = createAccountState();
      this.accounts.set(key, account);
    }
    return account;
  }

  getSnapshot(key: string) {
    return this.getAccount(key).snapshot;
  }

  subscribe(key: string, listener: () => void) {
    const account = this.getAccount(key);
    account.listeners.add(listener);
    return () => account.listeners.delete(listener);
  }

  private update(key: string, snapshot: InitialEmailSyncSnapshot) {
    const account = this.getAccount(key);
    account.snapshot = snapshot;
    account.listeners.forEach((listener) => listener());
  }

  setResponse(key: string, response: InitialEmailSyncResponse) {
    const snapshot = this.getSnapshot(key);
    this.update(key, {
      ...snapshot,
      response,
      initialImportWasEligible:
        snapshot.initialImportWasEligible ||
        (response.account_status === "new" && response.sync_mode === "initial"),
    });
  }

  setStatus(key: string, status: InitialEmailSyncState) {
    const snapshot = this.getSnapshot(key);
    if (!snapshot.response) return;
    this.update(key, {
      ...snapshot,
      response: { ...snapshot.response, status },
    });
  }

  markStartRequested(key: string) {
    const snapshot = this.getSnapshot(key);
    if (snapshot.startRequested) return false;
    this.update(key, { ...snapshot, startRequested: true });
    return true;
  }

  runInitialization(key: string, initialize: () => Promise<void>) {
    const account = this.getAccount(key);
    if (account.initialization) return account.initialization;

    const initialization = Promise.resolve()
      .then(initialize)
      .finally(() => {
        if (account.initialization === initialization) {
          account.initialization = null;
        }
      });
    account.initialization = initialization;
    return initialization;
  }

  runCompletionRefresh(
    key: string,
    completionKey: "initial" | "incremental",
    refresh: () => Promise<void>,
  ) {
    const account = this.getAccount(key);
    const existing = account.completionRefreshes.get(completionKey);
    if (existing) return existing;

    const request = Promise.resolve().then(refresh);
    account.completionRefreshes.set(completionKey, request);
    return request;
  }

  getStatus(key: string) {
    return this.getSnapshot(key).response?.status ?? null;
  }
}

export const initialEmailSyncRegistry = new InitialEmailSyncRegistry();

const waitForNextPoll = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
  });

export type InitialSyncPollResult =
  | "completed"
  | "failed"
  | "timeout"
  | "aborted";

export const INITIAL_EMAIL_SYNC_POLL_INTERVAL_MS = 4500;
export const INITIAL_EMAIL_SYNC_RETRY_MAX_INTERVAL_MS = 60_000;

export async function pollInitialEmailSync(
  readStatus: (signal: AbortSignal) => Promise<InitialEmailSyncResponse>,
  signal: AbortSignal,
  onStatus: (status: InitialEmailSyncResponse) => void,
  {
    intervalMs = INITIAL_EMAIL_SYNC_POLL_INTERVAL_MS,
    timeoutMs = 10 * 60 * 1000,
    requestTimeoutMs = 20 * 1000,
    maxRetryIntervalMs = INITIAL_EMAIL_SYNC_RETRY_MAX_INTERVAL_MS,
  }: {
    intervalMs?: number;
    timeoutMs?: number;
    requestTimeoutMs?: number;
    maxRetryIntervalMs?: number;
  } = {},
): Promise<InitialSyncPollResult> {
  const startedAt = Date.now();
  let consecutiveFailures = 0;

  while (!signal.aborted) {
    const remainingMs = timeoutMs - (Date.now() - startedAt);
    if (remainingMs <= 0) return "timeout";
    const pollStartedAt = Date.now();
    let retryDelayMs = 0;

    const requestController = new AbortController();
    let requestTimedOut = false;
    const abortRequest = () => requestController.abort();
    signal.addEventListener("abort", abortRequest, { once: true });
    if (signal.aborted) abortRequest();
    const requestTimer = setTimeout(() => {
      requestTimedOut = true;
      requestController.abort();
    }, Math.min(requestTimeoutMs, remainingMs));
    try {
      const response = await readStatus(requestController.signal);
      if (signal.aborted) return "aborted";
      consecutiveFailures = 0;
      onStatus(response);
      if (response.status === "completed" || response.status === "already_completed") {
        return "completed";
      }
      if (response.status === "failed") return "failed";
    } catch (error: unknown) {
      if (signal.aborted) return "aborted";
      if (!requestTimedOut) {
        const retryable =
          error instanceof TypeError ||
          (error instanceof Error &&
            error.name === "ApiError" &&
            "status" in error &&
            typeof error.status === "number" &&
            error.status >= 500 &&
            error.status < 600);
        if (!retryable) throw error;
      }
      consecutiveFailures += 1;
      retryDelayMs = Math.min(
        maxRetryIntervalMs,
        Math.max(1, intervalMs) * 2 ** (consecutiveFailures - 1),
      );
    } finally {
      clearTimeout(requestTimer);
      signal.removeEventListener("abort", abortRequest);
    }

    const delayMs = retryDelayMs > 0
      ? retryDelayMs
      : Math.max(0, intervalMs - (Date.now() - pollStartedAt));
    await waitForNextPoll(delayMs, signal);
  }

  return "aborted";
}
