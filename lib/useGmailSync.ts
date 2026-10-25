"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchEmails, registerWatch } from "@/lib/api";
import type { EmailThread } from "@/Types/email";

interface UseGmailSyncOptions {
  apiBaseUrl: string;
  enabled: boolean;
  getAccessToken: () => Promise<string>;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useGmailSync({ apiBaseUrl, enabled, getAccessToken }: UseGmailSyncOptions) {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [watchError, setWatchError] = useState("");
  const watchAttempted = useRef(false);
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);
    try {
      setEmails(await fetchEmails(apiBaseUrl));
      setEmailError("");
    } catch (error: unknown) {
      setEmailError(getErrorMessage(error, "Unable to refresh your inbox."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      refreshInFlight.current = false;
    }
  }, [apiBaseUrl]);

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

    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20_000);
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, refresh]);

  return {
    emails,
    setEmails,
    isLoading,
    isRefreshing,
    error: watchError || emailError,
    watchError,
    refresh,
  };
}
