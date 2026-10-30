"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  fetchEmails,
  registerWatch,
  syncInitialEmails,
} from "@/lib/api";
import type { EmailThread } from "@/Types/email";

interface UseGmailSyncOptions {
  apiBaseUrl: string;
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

export function useGmailSync({ apiBaseUrl, enabled, getAccessToken }: UseGmailSyncOptions) {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [watchError, setWatchError] = useState("");
  const watchAttempted = useRef(false);
  const initializationAttempted = useRef(false);
  const initializationInFlight = useRef(false);
  const initializationComplete = useRef(false);
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

  const initialize = useCallback(async (allowRetry = false) => {
    if (initializationInFlight.current) return;
    if (initializationAttempted.current && !allowRetry) return;

    initializationAttempted.current = true;
    initializationInFlight.current = true;
    setIsRefreshing(true);
    let token = "";
    let syncCompleted = false;

    try {
      const forceTokenRefresh = authenticationFailed.current && allowRetry;
      if (allowRetry) authenticationFailed.current = false;
      try {
        token = await getAccessToken(forceTokenRefresh);
      } catch (error: unknown) {
        authenticationFailed.current = true;
        throw error;
      }

      if (!watchAttempted.current) {
        watchAttempted.current = true;
        try {
          await registerWatch(apiBaseUrl, token);
          setWatchError("");
        } catch (error: unknown) {
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

      try {
        await syncInitialEmails(apiBaseUrl, token);
      } catch (error: unknown) {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          authenticationFailed.current = true;
        }
        throw error;
      }

      initializationComplete.current = true;
      syncCompleted = true;
      setEmailError("");
    } catch (error: unknown) {
      setEmailError(getEmailErrorMessage(error));
    } finally {
      initializationInFlight.current = false;
      if (!syncCompleted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    if (syncCompleted) {
      await refresh(false, token);
    }
  }, [apiBaseUrl, getAccessToken, refresh]);

  const refreshManually = useCallback(() => {
    if (!initializationComplete.current) return initialize(true);
    return refresh(true);
  }, [initialize, refresh]);

  useEffect(() => {
    if (!enabled) return;
    void Promise.resolve().then(() => initialize());
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
    isRefreshing,
    error: watchError || emailError,
    emailError,
    watchError,
    refresh: refreshManually,
  };
}
