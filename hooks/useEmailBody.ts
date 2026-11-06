"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ApiError, fetchEmailBody } from "@/lib/api";
import type { EmailThread } from "@/Types/email";
import {
  getOrCreateEmailBodyRequest,
  type SharedEmailBodyRequest,
} from "@/lib/email-body-request";

interface UseEmailBodyOptions {
  apiBaseUrl: string;
  cacheScope: string;
  selectedEmail: EmailThread | null;
  setEmails: React.Dispatch<React.SetStateAction<EmailThread[]>>;
  getAccessToken: () => Promise<string>;
  invalidateAccessToken: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

type EmailBody = Awaited<ReturnType<typeof fetchEmailBody>>;

const createAbortError = () =>
  new DOMException("The email body request was cancelled.", "AbortError");

const consumeEmailBodyRequest = (
  request: SharedEmailBodyRequest<EmailBody>,
  signal?: AbortSignal,
) => {
  if (signal?.aborted) return Promise.reject(createAbortError());
  request.consumers += 1;

  return new Promise<EmailBody>((resolve, reject) => {
    let active = true;
    const release = () => {
      if (!active) return false;
      active = false;
      signal?.removeEventListener("abort", onAbort);
      request.consumers -= 1;
      if (!request.settled && request.consumers === 0) {
        request.controller.abort();
      }
      return true;
    };
    const onAbort = () => {
      if (release()) reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    request.promise.then(
      (body) => {
        if (release()) resolve(body);
      },
      (error: unknown) => {
        if (release()) reject(error);
      },
    );
  });
};

export function useEmailBody({
  apiBaseUrl,
  cacheScope,
  selectedEmail,
  setEmails,
  getAccessToken,
  invalidateAccessToken,
}: UseEmailBodyOptions) {
  const [loadingEmailId, setLoadingEmailId] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<{ emailId: string; message: string } | null>(null);
  const bodyCache = useRef(new Map<string, EmailBody>());
  const bodyRequests = useRef(new Map<string, SharedEmailBodyRequest<EmailBody>>());
  const cacheContext = JSON.stringify([apiBaseUrl, cacheScope]);
  const cacheContextRef = useRef(cacheContext);

  useLayoutEffect(() => {
    cacheContextRef.current = cacheContext;
    bodyCache.current.clear();
    bodyRequests.current.forEach((request) => request.controller.abort());
    bodyRequests.current.clear();
  }, [cacheContext]);

  const loadEmailBody = useCallback(
    async (emailId: string, signal?: AbortSignal) => {
      const requestKey = JSON.stringify([cacheContext, emailId]);
      const cachedBody = bodyCache.current.get(requestKey);
      if (cachedBody) {
        setEmails((current) =>
          current.map((email) => (email.id === emailId ? { ...email, ...cachedBody } : email)),
        );
        return cachedBody;
      }

      const request = getOrCreateEmailBodyRequest(
        bodyRequests.current,
        requestKey,
        async (signal) => {
          const token = await getAccessToken();
          if (signal.aborted) throw createAbortError();
          const body = await fetchEmailBody(
            apiBaseUrl,
            emailId,
            token,
            signal,
          );
          if (cacheContextRef.current !== cacheContext) throw createAbortError();
          bodyCache.current.set(requestKey, body);
          setEmails((current) =>
            current.map((email) => (email.id === emailId ? { ...email, ...body } : email)),
          );
          return body;
        },
      );

      try {
        return await consumeEmailBodyRequest(request, signal);
      } catch (error: unknown) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          invalidateAccessToken();
        }
        throw error;
      }
    },
    [apiBaseUrl, cacheContext, getAccessToken, invalidateAccessToken, setEmails],
  );

  const selectedEmailId = selectedEmail?.id ?? null;
  const selectedEmailHasBody =
    selectedEmail?.body !== undefined || selectedEmail?.body_html !== undefined;

  useEffect(() => {
    if (!selectedEmailId || selectedEmailHasBody) return;
    let cancelled = false;
    const controller = new AbortController();
    const emailId = selectedEmailId;
    const timer = window.setTimeout(() => {
      setLoadingEmailId(emailId);
      setBodyError(null);
      loadEmailBody(emailId, controller.signal)
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
      controller.abort();
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
