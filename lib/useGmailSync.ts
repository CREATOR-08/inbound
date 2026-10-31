"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  fetchEmails,
  getInitialEmailSyncStatus,
  registerWatch,
  syncInitialEmails,
} from "@/lib/api";
import type { InitialEmailSyncState } from "@/lib/api";
import {
  initialEmailSyncRegistry,
  pollInitialEmailSync,
} from "@/lib/initial-email-sync";
import type { EmailThread } from "@/Types/email";

interface UseGmailSyncOptions {
  apiBaseUrl: string;
  accountKey: string;
  enabled: boolean;
  getAccessToken: (forceRefresh?: boolean) => Promise<string>;
}

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

export function useGmailSync({
  apiBaseUrl,
  accountKey,
  enabled,
  getAccessToken,
}: UseGmailSyncOptions) {
  const syncKey = `${apiBaseUrl}\u0000${accountKey}`;
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [syncStatus, setSyncStatus] = useState<InitialEmailSyncState | null>(
    () => initialEmailSyncRegistry.getStatus(syncKey),
  );
  const [watchError, setWatchError] = useState("");
  const watchAttempted = useRef(false);
  const initializationAttempted = useRef(false);
  const initializationInFlight = useRef(false);
  const initializationComplete = useRef(false);
  const initializationController = useRef<AbortController | null>(null);
  const refreshInFlight = useRef(false);
  const authenticationFailed = useRef(false);

  const refresh = useCallback(async (
    allowAuthenticationRetry = false,
    tokenOverride?: string,
  ) => {
    if (!initializationComplete.current || initializationInFlight.current) {
      return;
    }
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

      try {
        setEmails(await fetchEmails(apiBaseUrl, token));
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
  }, [apiBaseUrl, getAccessToken]);

  const initialize = useCallback(async (
    allowRetry = false,
    effectController?: AbortController,
  ) => {
    if (initializationInFlight.current || effectController?.signal.aborted) return;
    if (initializationAttempted.current && !allowRetry) return;

    initializationAttempted.current = true;
    initializationInFlight.current = true;
    const controller = effectController ?? new AbortController();
    const signal = controller.signal;
    initializationController.current = controller;
    setIsRefreshing(true);
    setSyncError("");
    setEmailError("");
    let token = "";
    let syncCompleted = false;

    const updateSyncStatus = (status: InitialEmailSyncState) => {
      initialEmailSyncRegistry.setStatus(syncKey, status);
      setSyncStatus(status);
    };

    try {
      const forceTokenRefresh = authenticationFailed.current && allowRetry;
      if (allowRetry) authenticationFailed.current = false;
      try {
        token = await getAccessToken(forceTokenRefresh);
      } catch (error: unknown) {
        authenticationFailed.current = true;
        throw error;
      }
      if (signal.aborted) return;

      if (!watchAttempted.current) {
        watchAttempted.current = true;
        try {
          await registerWatch(apiBaseUrl, token, signal);
          setWatchError("");
        } catch (error: unknown) {
          if (signal.aborted) {
            watchAttempted.current = false;
            return;
          }
          if (error instanceof ApiError && error.status === 401) {
            setWatchError(
              "Your Google access token has expired. Please sign out and sign in again.",
            );
          } else {
            setWatchError(
              getErrorMessage(error, "Unable to enable real-time Gmail updates."),
            );
          }
        }
      }

      const currentStatus = initialEmailSyncRegistry.getStatus(syncKey);
      setSyncStatus(currentStatus);
      if (initialEmailSyncRegistry.getStatus(syncKey) === "completed") {
        syncCompleted = true;
      } else if (
        initialEmailSyncRegistry.getStatus(syncKey) === "failed" &&
        !allowRetry
      ) {
        throw new Error(
          "Initial Gmail synchronization failed. Retry to start it again.",
        );
      } else {
        if (
          allowRetry &&
          initialEmailSyncRegistry.resetFailedSync(syncKey)
        ) {
          setSyncStatus(null);
        }

        if (initialEmailSyncRegistry.markStartRequested(syncKey)) {
          updateSyncStatus("pending");
          try {
            const startResponse = await syncInitialEmails(
              apiBaseUrl,
              token,
              signal,
            );
            if (signal.aborted) return;
            updateSyncStatus(startResponse.status);
            if (startResponse.status === "completed") {
              syncCompleted = true;
            }
          } catch (error: unknown) {
            if (signal.aborted) return;
            initialEmailSyncRegistry.clearStartRequest(syncKey);
            updateSyncStatus("failed");
            if (
              error instanceof ApiError &&
              (error.status === 401 || error.status === 403)
            ) {
              authenticationFailed.current = true;
            }
            throw error;
          }
        }

        if (!syncCompleted) {
          const pollResult = await pollInitialEmailSync(
            async (requestSignal) => {
              const statusResponse = await getInitialEmailSyncStatus(
                apiBaseUrl,
                token,
                requestSignal,
              );
              return statusResponse.status;
            },
            signal,
            updateSyncStatus,
          );
          if (pollResult === "completed") {
            syncCompleted = true;
          } else if (pollResult === "failed") {
            throw new Error(
              "Gmail could not finish the initial synchronization. Retry to try again.",
            );
          } else if (pollResult === "timeout") {
            setSyncError(
              "Initial Gmail synchronization is taking longer than expected. It will continue in the background.",
            );
          }
        }
      }

      if (syncCompleted) {
        initializationComplete.current = true;
        setEmailError("");
        setSyncError("");
      }
    } catch (error: unknown) {
      if (!signal.aborted) {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          authenticationFailed.current = true;
        }
        if (initialEmailSyncRegistry.getStatus(syncKey) !== "failed") {
          updateSyncStatus("failed");
        }
        setSyncError(getInitialSyncErrorMessage(error));
      }
    } finally {
      if (initializationController.current === controller) {
        initializationController.current = null;
        initializationInFlight.current = false;
      }
      if (!signal.aborted) {
        if (!syncCompleted) {
          const currentStatus = initialEmailSyncRegistry.getStatus(syncKey);
          setIsLoading(
            currentStatus === "pending" || currentStatus === "running",
          );
          setIsRefreshing(false);
        }
      }
    }

    if (syncCompleted) {
      await refresh(false, token);
    }
  }, [apiBaseUrl, getAccessToken, refresh, syncKey]);

  useEffect(() => {
    watchAttempted.current = false;
    initializationAttempted.current = false;
    initializationComplete.current = false;
    authenticationFailed.current = false;
  }, [syncKey]);

  const refreshManually = useCallback(() => {
    if (!initializationComplete.current) return initialize(true);
    return refresh(true);
  }, [initialize, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        void initialize(false, controller);
      }
    });

    return () => {
      controller.abort();
      if (initializationController.current === controller) {
        initializationController.current = null;
        initializationInFlight.current = false;
      }
    };
  }, [enabled, initialize]);

  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, refresh]);

  return {
    emails,
    setEmails,
    isLoading,
    isInitialSyncing: syncStatus === "pending" || syncStatus === "running",
    initialSyncFailed: syncStatus === "failed",
    isRefreshing,
    error: watchError || syncError || emailError,
    emailError,
    syncError,
    watchError,
    refresh: refreshManually,
  };
}
