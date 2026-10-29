"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchEmailBody } from "@/lib/api";
import type { EmailThread } from "@/Types/email";

interface UseEmailBodyOptions {
  apiBaseUrl: string;
  selectedEmail: EmailThread | null;
  setEmails: React.Dispatch<React.SetStateAction<EmailThread[]>>;
  getAccessToken: () => Promise<string>;
  invalidateAccessToken: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useEmailBody({
  apiBaseUrl,
  selectedEmail,
  setEmails,
  getAccessToken,
  invalidateAccessToken,
}: UseEmailBodyOptions) {
  const [loadingEmailId, setLoadingEmailId] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<{ emailId: string; message: string } | null>(null);
  const bodyCache = useRef(new Map<string, Awaited<ReturnType<typeof fetchEmailBody>>>());
  const bodyRequests = useRef(new Map<string, Promise<Awaited<ReturnType<typeof fetchEmailBody>>>>());

  const loadEmailBody = useCallback(
    async (emailId: string) => {
      const cachedBody = bodyCache.current.get(emailId);
      if (cachedBody) {
        setEmails((current) =>
          current.map((email) => (email.id === emailId ? { ...email, ...cachedBody } : email)),
        );
        return cachedBody;
      }

      const existingRequest = bodyRequests.current.get(emailId);
      if (existingRequest) return existingRequest;

      const request = (async () => {
        const token = await getAccessToken();
        const body = await fetchEmailBody(apiBaseUrl, emailId, token);
        bodyCache.current.set(emailId, body);
        setEmails((current) =>
          current.map((email) => (email.id === emailId ? { ...email, ...body } : email)),
        );
        return body;
      })();
      bodyRequests.current.set(emailId, request);
      try {
        return await request;
      } catch (error: unknown) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          invalidateAccessToken();
        }
        throw error;
      } finally {
        if (bodyRequests.current.get(emailId) === request) bodyRequests.current.delete(emailId);
      }
    },
    [apiBaseUrl, getAccessToken, invalidateAccessToken, setEmails],
  );

  const selectedEmailId = selectedEmail?.id ?? null;
  const selectedEmailHasBody =
    selectedEmail?.body !== undefined || selectedEmail?.body_html !== undefined;

  useEffect(() => {
    if (!selectedEmailId || selectedEmailHasBody) return;
    let cancelled = false;
    const emailId = selectedEmailId;
    const timer = window.setTimeout(() => {
      setLoadingEmailId(emailId);
      setBodyError(null);
      loadEmailBody(emailId)
        .catch((error: unknown) => {
          if (!cancelled) {
            setBodyError({
              emailId,
              message: getErrorMessage(error, "Unable to load email body."),
            });
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingEmailId((current) => (current === emailId ? null : current));
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadEmailBody, selectedEmailHasBody, selectedEmailId]);

  const retryEmailBody = useCallback(() => {
    if (!selectedEmailId || selectedEmailHasBody) return;
    const emailId = selectedEmailId;
    setLoadingEmailId(emailId);
    setBodyError(null);
    loadEmailBody(emailId)
      .catch((error: unknown) => {
        setBodyError({
          emailId,
          message: getErrorMessage(error, "Unable to load email body."),
        });
      })
      .finally(() => setLoadingEmailId((current) => (current === emailId ? null : current)));
  }, [loadEmailBody, selectedEmailHasBody, selectedEmailId]);

  return {
    loadEmailBody,
    isLoadingBody: (emailId: string) => loadingEmailId === emailId,
    bodyErrorFor: (emailId: string) => (bodyError?.emailId === emailId ? bodyError.message : ""),
    retryEmailBody,
  };
}
