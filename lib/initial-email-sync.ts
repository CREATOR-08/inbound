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
}

const createAccountState = (): AccountState => ({
  snapshot: {
    response: null,
    initialImportWasEligible: false,
    startRequested: false,
  },
  listeners: new Set(),
  initialization: null,
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

export async function pollInitialEmailSync(
  readStatus: (signal: AbortSignal) => Promise<InitialEmailSyncResponse>,
  signal: AbortSignal,
  onStatus: (status: InitialEmailSyncResponse) => void,
  {
    intervalMs = INITIAL_EMAIL_SYNC_POLL_INTERVAL_MS,
    timeoutMs = 10 * 60 * 1000,
    requestTimeoutMs = 20 * 1000,
  }: {
    intervalMs?: number;
    timeoutMs?: number;
    requestTimeoutMs?: number;
  } = {},
): Promise<InitialSyncPollResult> {
  const startedAt = Date.now();

  while (!signal.aborted) {
    const remainingMs = timeoutMs - (Date.now() - startedAt);
    if (remainingMs <= 0) return "timeout";
    const pollStartedAt = Date.now();

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
    } finally {
      clearTimeout(requestTimer);
      signal.removeEventListener("abort", abortRequest);
    }

    await waitForNextPoll(
      Math.max(0, intervalMs - (Date.now() - pollStartedAt)),
      signal,
    );
  }

  return "aborted";
}
