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

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    .replace(/\/+$/, "")
    .replace(/\/api(?:\/v1)?$/i, "");
  const response = await fetch(
    `${apiBaseUrl}/api/v1/auth/google-tokens`,
    {
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
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();

    console.error("[Google Token Sync] Backend failure:", {
      status: response.status,
      body: errorBody,
    });

    throw new Error(
      `Google token sync failed (${response.status}): ${errorBody}`,
    );
  }
}
