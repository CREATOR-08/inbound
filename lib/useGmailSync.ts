"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ApiError,
  fetchEmails,
  getInitialEmailSyncStatus,
  syncInitialEmails,
  type FetchEmailsOptions,
  type InitialEmailSyncResponse,
} from "@/lib/api";
import {
  initialEmailSyncRegistry,
  pollInitialEmailSync,
} from "@/lib/initial-email-sync";
import type { EmailFilter, EmailThread } from "@/Types/email";

interface UseGmailSyncOptions {
  apiBaseUrl: string;
  accountKey: string;
  enabled: boolean;
  getAccessToken: (forceRefresh?: boolean) => Promise<string>;
  currentFilter?: EmailFilter;
}

const getFetchOptionsForFilter = (
  filter?: EmailFilter,
): FetchEmailsOptions | null => {
  if (filter === "READ") return { is_read: true };
  if (filter === "UNREAD") return { is_read: false };
  return null;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getEmailErrorMessage = (error: unknown) => {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return "Your Google access token was rejected. Please sign out and sign in again.";
  }
  return getErrorMessage(error, "Unable to refresh your inbox.");
};

const getInitialSyncErrorMessage = (error: unknown) => {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return "Your Google access token was rejected. Please sign out and sign in again.";
  }
  if (error instanceof TypeError) {
    return "Unable to connect while synchronizing Gmail. Check your connection and retry.";
  }
  return getErrorMessage(error, "Unable to synchronize your Gmail inbox.");
};

const isInitialImportInProgress = (response: InitialEmailSyncResponse | null) =>
  response?.account_status === "new" &&
  response.sync_mode === "initial" &&
  (response.status === "not_started" ||
    response.status === "pending" ||
    response.status === "running");

const isInitialImportComplete = (
  response: InitialEmailSyncResponse | null,
  wasEligible: boolean,
) =>
  wasEligible &&
  (response?.status === "completed" || response?.status === "already_completed");

export function useGmailSync({
  apiBaseUrl,
  accountKey,
  enabled,
  getAccessToken,
  currentFilter,
}: UseGmailSyncOptions) {
  const syncKey = `${apiBaseUrl}\u0000${accountKey}`;
  const syncSnapshot = useSyncExternalStore(
    (listener) => initialEmailSyncRegistry.subscribe(syncKey, listener),
    () => initialEmailSyncRegistry.getSnapshot(syncKey),
    () => initialEmailSyncRegistry.getSnapshot(syncKey),
  );
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [syncError, setSyncError] = useState("");
  const refreshInFlight = useRef(false);
  const authenticationFailed = useRef(false);
  const refreshRef = useRef<
    (allowAuthenticationRetry?: boolean, tokenOverride?: string) => Promise<void>
  >(async () => {});

  const refresh = useCallback(
    async (
      allowAuthenticationRetry = false,
      tokenOverride?: string,
      filterOverride?: EmailFilter,
    ) => {
      if (refreshInFlight.current) return;
      if (authenticationFailed.current && !allowAuthenticationRetry) return;
      const forceTokenRefresh =
        authenticationFailed.current && allowAuthenticationRetry;
      if (allowAuthenticationRetry) authenticationFailed.current = false;
      refreshInFlight.current = true;
      setIsRefreshing(true);
      try {
        let token = tokenOverride;
        if (!token) {
          try {
            token = await getAccessToken(forceTokenRefresh);
          } catch (error: unknown) {
            authenticationFailed.current = true;
            throw error;
          }
        }

        const activeFilter = filterOverride ?? currentFilter;
        const fetchOptions = getFetchOptionsForFilter(activeFilter);

        try {
          const fetchedEmails = await fetchEmails(apiBaseUrl, token, fetchOptions);
          setEmails((previousEmails) => {
            if (!activeFilter || activeFilter === "ALL") {
              return fetchedEmails;
            }
            if (activeFilter === "READ") {
              const readMap = new Map(fetchedEmails.map((email) => [email.id, email]));
              const existingUpdated = previousEmails.map((email) => {
                if (readMap.has(email.id)) {
                  return { ...email, ...readMap.get(email.id)!, is_read: true };
                }
                return { ...email, is_read: false };
              });
              const existingIds = new Set(previousEmails.map((email) => email.id));
              const newEmails = fetchedEmails.filter((email) => !existingIds.has(email.id));
              return [...existingUpdated, ...newEmails];
            }
            if (activeFilter === "UNREAD") {
              const unreadMap = new Map(fetchedEmails.map((email) => [email.id, email]));
              const existingUpdated = previousEmails.map((email) => {
                if (unreadMap.has(email.id)) {
                  return { ...email, ...unreadMap.get(email.id)!, is_read: false };
                }
                return { ...email, is_read: true };
              });
              const existingIds = new Set(previousEmails.map((email) => email.id));
              const newEmails = fetchedEmails.filter((email) => !existingIds.has(email.id));
              return [...existingUpdated, ...newEmails];
            }
            return fetchedEmails;
          });
        } catch (error: unknown) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            authenticationFailed.current = true;
          }
          throw error;
        }
        setEmailError("");
      } catch (error: unknown) {
        setEmailError(getEmailErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        refreshInFlight.current = false;
      }
    },
    [apiBaseUrl, currentFilter, getAccessToken],
  );
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const initialize = useCallback(async () => {
    let token = "";
    try {
      await initialEmailSyncRegistry.runInitialization(syncKey, async () => {
        setSyncError("");
        setEmailError("");

        try {
          token = await getAccessToken(authenticationFailed.current);
          authenticationFailed.current = false;
        } catch (error: unknown) {
          authenticationFailed.current = true;
          throw error;
        }

        const statusResponse = await getInitialEmailSyncStatus(
          apiBaseUrl,
          token,
        );
        initialEmailSyncRegistry.setResponse(syncKey, statusResponse);

        if (statusResponse.account_status === "new") {
          if (statusResponse.sync_mode !== "initial") {
            throw new Error("The Gmail sync response had an inconsistent account mode.");
          }

          if (statusResponse.status === "not_started") {
            if (!initialEmailSyncRegistry.markStartRequested(syncKey)) {
              initialEmailSyncRegistry.setStatus(syncKey, "failed");
              return;
            }
            initialEmailSyncRegistry.setStatus(syncKey, "pending");
            try {
              const startResponse = await syncInitialEmails(
                apiBaseUrl,
                token,
              );
              initialEmailSyncRegistry.setResponse(syncKey, startResponse);
            } catch (error: unknown) {
              initialEmailSyncRegistry.setStatus(syncKey, "failed");
              throw error;
            }
          } else {
            initialEmailSyncRegistry.markStartRequested(syncKey);
          }

          const currentResponse =
            initialEmailSyncRegistry.getSnapshot(syncKey).response;
          if (
            currentResponse?.status === "pending" ||
            currentResponse?.status === "running"
          ) {
            const pollResult = await pollInitialEmailSync(
              async (requestSignal) => {
                const response = await getInitialEmailSyncStatus(
                  apiBaseUrl,
                  token,
                  requestSignal,
                );
                initialEmailSyncRegistry.setResponse(syncKey, response);
                return response;
              },
              new AbortController().signal,
              (response) => initialEmailSyncRegistry.setResponse(syncKey, response),
            );
            if (pollResult === "failed") {
              throw new Error(
                "Gmail could not finish the initial synchronization. It will not be restarted automatically.",
              );
            }
            if (pollResult === "timeout") {
              setSyncError(
                "Initial Gmail synchronization is taking longer than expected. It will continue in the background.",
              );
            }
          }
          return;
        }

        if (statusResponse.sync_mode !== "incremental") {
          throw new Error("The Gmail sync response had an inconsistent account mode.");
        }
      });

      const currentResponse =
        initialEmailSyncRegistry.getSnapshot(syncKey).response;
      const wasInitialImportEligible =
        initialEmailSyncRegistry.getSnapshot(syncKey).initialImportWasEligible;
      if (
        currentResponse?.account_status === "existing" &&
        !wasInitialImportEligible
      ) {
        if (!token) token = await getAccessToken();
        await refreshRef.current(false, token);

        if (initialEmailSyncRegistry.markStartRequested(syncKey)) {
          setSyncError("");
          void syncInitialEmails(apiBaseUrl, token)
            .then((response) => {
              initialEmailSyncRegistry.setResponse(syncKey, response);
            })
            .catch((error: unknown) => {
              setSyncError(getInitialSyncErrorMessage(error));
            });
        }
      } else if (
        isInitialImportComplete(currentResponse, wasInitialImportEligible)
      ) {
        await refreshRef.current(false, token);
      } else if (
        wasInitialImportEligible &&
        currentResponse?.status === "failed"
      ) {
        setIsLoading(false);
      } else if (
        wasInitialImportEligible &&
        isInitialImportInProgress(currentResponse)
      ) {
        setIsLoading(false);
      }
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        authenticationFailed.current = true;
      }
      setIsLoading(false);
      setSyncError(getInitialSyncErrorMessage(error));
    }
  }, [apiBaseUrl, getAccessToken, syncKey]);

  useEffect(() => {
    if (!enabled) return;
    void Promise.resolve().then(() => initialize());
  }, [enabled, initialize]);

  const previousFilterRef = useRef<EmailFilter | undefined>(currentFilter);
  useEffect(() => {
    if (previousFilterRef.current === currentFilter) return;
    previousFilterRef.current = currentFilter;
    void refresh(false, undefined, currentFilter);
  }, [currentFilter, refresh]);

  useEffect(() => {
    const response = syncSnapshot.response;
    const hasCompletedSync =
      isInitialImportComplete(
        response,
        syncSnapshot.initialImportWasEligible,
      ) ||
      (response?.account_status === "existing" &&
        response.incremental_sync_status === "completed");
    if (hasCompletedSync) {
      void refresh();
    }
  }, [
    refresh,
    syncSnapshot.initialImportWasEligible,
    syncSnapshot.response,
  ]);

  const refreshManually = useCallback(() => {
    if (
      syncSnapshot.initialImportWasEligible &&
      syncSnapshot.response?.status === "failed"
    ) {
      return refresh(true);
    }
    return initialize();
  }, [
    initialize,
    refresh,
    syncSnapshot.initialImportWasEligible,
    syncSnapshot.response?.status,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, refresh]);

  const response = syncSnapshot.response;
  const isInitialSyncing =
    syncSnapshot.initialImportWasEligible &&
    (response?.status === "pending" || response?.status === "running");

  return {
    emails,
    setEmails,
    isLoading,
    isInitialSyncing,
    initialSyncFailed:
      syncSnapshot.initialImportWasEligible && response?.status === "failed",
    isRefreshing,
    error: syncError || emailError,
    emailError,
    syncError,
    refresh: refreshManually,
  };
}
