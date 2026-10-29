"use client";

import { useCallback, useRef } from "react";
import { authClient } from "@/lib/auth-client";

interface CachedAccessToken {
  token: string;
  expiresAt: number;
}

export function useGoogleAccessToken() {
  const googleAccountId = useRef<string | null>(null);
  const googleAccountRequest = useRef<Promise<string> | null>(null);
  const accessTokenCache = useRef<CachedAccessToken | null>(null);
  const accessTokenRequest = useRef<Promise<string> | null>(null);

  const invalidateAccessToken = useCallback(() => {
    accessTokenCache.current = null;
  }, []);

  const getAccessToken = useCallback(async (forceRefresh = false): Promise<string> => {
    if (forceRefresh) invalidateAccessToken();
    const cachedToken = accessTokenCache.current;
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
      return cachedToken.token;
    }
    if (accessTokenRequest.current) return accessTokenRequest.current;

    const request = (async () => {
      let accountId = googleAccountId.current;
      if (!accountId) {
        if (!googleAccountRequest.current) {
          googleAccountRequest.current = (async () => {
            const { data: accounts } = await authClient.listAccounts();
            const googleAccount = accounts?.find((account) => account.providerId === "google");
            if (!googleAccount) {
              throw new Error("Google account link missing. Please log in again.");
            }
            googleAccountId.current = googleAccount.id;
            return googleAccount.id;
          })();
        }
        try {
          accountId = await googleAccountRequest.current;
        } finally {
          googleAccountRequest.current = null;
        }
      }

      const { data: tokenData } = await authClient.getAccessToken({ accountId });
      if (typeof tokenData?.accessToken !== "string" || !tokenData.accessToken.trim()) {
        throw new Error("Could not fetch an active Google access token.");
      }
      const expiresAt =
        tokenData.accessTokenExpiresAt instanceof Date
          ? tokenData.accessTokenExpiresAt.getTime()
          : typeof tokenData.accessTokenExpiresAt === "string"
            ? Date.parse(tokenData.accessTokenExpiresAt)
            : Number.NaN;
      if (Number.isFinite(expiresAt)) {
        accessTokenCache.current = { token: tokenData.accessToken, expiresAt };
      }
      return tokenData.accessToken;
    })();

    accessTokenRequest.current = request;
    try {
      return await request;
    } finally {
      if (accessTokenRequest.current === request) accessTokenRequest.current = null;
    }
  }, [invalidateAccessToken]);

  return { getAccessToken, invalidateAccessToken };
}
