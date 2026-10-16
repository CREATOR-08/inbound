
"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface GetStartedProps {
  onBack: () => void;
  onAuthSuccess: () => void;
}

export default function GetStarted({
  onBack,
}: GetStartedProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/",
      });

      // Better Auth normally redirects the browser to Google.
      // Do not mark the user authenticated here.
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex h-dvh w-screen items-center justify-center overflow-y-auto bg-black/90 p-4 text-white sm:p-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      {/* Original centered onboarding card */}
      <div className="relative my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#080910] shadow-2xl shadow-violet-950/20">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-600/20">
              <Sparkles size={20} />
            </div>

            <span className="text-base font-semibold tracking-tight sm:text-lg">
              MailFlow<span className="text-violet-400">.ai</span>
            </span>
          </div>

          <span className="text-xs text-gray-500 sm:text-sm">
            04 / 04
          </span>
        </header>

        {/* Main content */}
        <main className="mx-auto flex max-w-md flex-col items-center px-6 py-8 text-center sm:px-10 sm:py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-950/20">
            <Mail size={26} />
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-300">
            <Sparkles size={13} />
            YOUR SMARTER INBOX AWAITS
          </div>

          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Welcome back.
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            Sign in securely with your Google account to continue
            to MailFlow.ai.
          </p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#080910] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-gray-900"
                aria-hidden="true"
              />
            ) : (
              <svg
                viewBox="0 0 48 48"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                  transform="translate(0 4)"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.65 5.93c4.47-4.13 7.12-10.2 7.12-17.58Z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
                  transform="translate(1 0)"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.9-5.82l-7.65-5.93c-2.13 1.43-4.86 2.27-8.25 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                  transform="translate(0 -4)"
                />
              </svg>
            )}

            {isSubmitting
              ? "Redirecting to Google..."
              : "Continue with Google"}

            {!isSubmitting && <ArrowRight size={17} />}
          </button>

          {errorMessage && (
            <p
              role="alert"
              className="mt-4 w-full break-words text-left text-sm text-rose-400"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
            <ShieldCheck
              size={15}
              className="shrink-0 text-emerald-400"
            />
            Secure authentication powered by Google
          </div>

          {/* Back navigation */}
          <button
            type="button"
            onClick={onBack}
            className="mt-7 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </main>
      </div>
    </div>
  );
}
