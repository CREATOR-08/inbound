
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { syncGoogleTokensToBackend } from "@/lib/google-token-sync";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const pool = new Pool({
  connectionString,
});

const syncGoogleAccount = async (
  account: {
    providerId: string;
    userId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    accessTokenExpiresAt?: Date | null;
  },
  
  endpointContext: {
    context: {
      internalAdapter: {
        findUserById: (userId: string) => Promise<{ email: string } | null>;
      };
    };
  } | null,
) => {
  if (account.providerId !== "google" || !account.accessToken?.trim()) return;
  if (!endpointContext) {
    throw new Error("Google account token sync requires an auth request context.");
  }

  const user = await endpointContext.context.internalAdapter.findUserById(
    account.userId,
  );
  if (!user?.email) {
    throw new Error("Google account token sync could not resolve the user.");
  }

  await syncGoogleTokensToBackend({
    email: user.email,
    accessToken: account.accessToken,
    accessTokenExpiresAt: account.accessTokenExpiresAt,
    refreshToken: account.refreshToken,
  });
};


export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ,
  secret: process.env.BETTER_AUTH_SECRET,

  database: pool,

  emailAndPassword: {
    enabled: false,
  },
  trustedOrigins: [
    "https://inbound-opal.vercel.app/",
  ],

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: "offline",
      prompt: "select_account consent",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    },
  },

  databaseHooks: {
    account: {
      update: {
        before: async (account) => {
          if (
            "refreshToken" in account &&
            (account.refreshToken == null || account.refreshToken.trim() === "")
          ) {
            return { data: { refreshToken: undefined } };
          }
        },
        after: syncGoogleAccount,
      },
      create: {
        after: syncGoogleAccount,
      },
    },
  },
});
