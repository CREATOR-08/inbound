import type { InitialEmailSyncState } from "@/lib/api";

interface InitialSyncState {
  status: InitialEmailSyncState | null;
  startRequested: boolean;
}

export class InitialEmailSyncRegistry {
  private readonly accounts = new Map<string, InitialSyncState>();

  private getAccount(key: string) {
    let account = this.accounts.get(key);
    if (!account) {
      account = { status: null, startRequested: false };
      this.accounts.set(key, account);
    }
    return account;
  }

  getStatus(key: string) {
    return this.getAccount(key).status;
  }

  markStartRequested(key: string) {
    const account = this.getAccount(key);
    if (account.startRequested) return false;
    account.startRequested = true;
    return true;
  }

  clearStartRequest(key: string) {
    this.getAccount(key).startRequested = false;
  }

  setStatus(key: string, status: InitialEmailSyncState | null) {
    this.getAccount(key).status = status;
  }

  resetFailedSync(key: string) {
    const account = this.getAccount(key);
    if (account.status !== "failed") return false;
    account.status = null;
    account.startRequested = false;
    return true;
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
  readStatus: (signal: AbortSignal) => Promise<InitialEmailSyncState>,
  signal: AbortSignal,
  onStatus: (status: InitialEmailSyncState) => void,
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
      const status = await readStatus(requestController.signal);
      if (signal.aborted) return "aborted";
      onStatus(status);
      if (status === "completed" || status === "failed") return status;
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
