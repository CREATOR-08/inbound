"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchEmails, registerWatch } from "@/lib/api";
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
  const refreshInFlight = useRef(false);
  const authenticationFailed = useRef(false);

  const refresh = useCallback(async (allowAuthenticationRetry = false) => {
    if (refreshInFlight.current) return;
    if (authenticationFailed.current && !allowAuthenticationRetry) return;
    const forceTokenRefresh = authenticationFailed.current && allowAuthenticationRetry;
    if (allowAuthenticationRetry) authenticationFailed.current = false;
    refreshInFlight.current = true;
    setIsRefreshing(true);
    try {
      let token: string;
      try {
        token = await getAccessToken(forceTokenRefresh);
      } catch (error: unknown) {
        authenticationFailed.current = true;
        throw error;
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

  const refreshManually = useCallback(() => refresh(true), [refresh]);

  useEffect(() => {
    if (!enabled || watchAttempted.current) return;
    watchAttempted.current = true;

    void (async () => {
      try {
        const token = await getAccessToken();
        await registerWatch(apiBaseUrl, token);
        setWatchError("");
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 401) {
          setWatchError("Your Google access token has expired. Please sign out and sign in again.");
          return;
        }
        setWatchError(getErrorMessage(error, "Unable to enable real-time Gmail updates."));
      }
    })();
  }, [apiBaseUrl, enabled, getAccessToken]);

  useEffect(() => {
    if (!enabled) return;

    void refresh();
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
