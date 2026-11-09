export interface GoogleTokenSyncPayload {
  email: string;
  accessToken: string;
  accessTokenExpiresAt?: Date | null;
  refreshToken?: string | null;
}

export async function syncGoogleTokensToBackend(
  payload: GoogleTokenSyncPayload,
): Promise<void> {
  const syncSecret = process.env.GOOGLE_TOKEN_SYNC_SECRET;
  if (!syncSecret) {
    throw new Error("GOOGLE_TOKEN_SYNC_SECRET is not configured.");
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const syncUrl = apiBaseUrl.includes("/api/v1")
    ? `${apiBaseUrl}/auth/google-tokens`
    : `${apiBaseUrl}/api/v1/auth/google-tokens`;

  const response = await fetch(syncUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Google-Token-Sync-Secret": syncSecret,
    },
    body: JSON.stringify({
      email: payload.email,
      access_token: payload.accessToken,
      access_token_expires_at:
        payload.accessTokenExpiresAt?.toISOString() ?? null,
      ...(payload.refreshToken?.trim()
        ? { refresh_token: payload.refreshToken }
        : {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("[Google Token Sync] Backend failure:", {
      status: response.status,
    });

    throw new Error(`Google account token sync failed (${response.status}).`);
  }
}
