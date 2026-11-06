"use client";

import React from "react";
import { Sparkles, ArrowRight, Mail, Zap } from "lucide-react";

interface WelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function Welcome({ onNext, onSkip }: WelcomeProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex h-dvh w-screen items-center justify-center overflow-y-auto bg-black/90 p-4 text-white sm:p-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Centered onboarding card */}
      <div className="relative my-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#07090f] shadow-2xl shadow-violet-950/20">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-600/20">
              <Sparkles size={20} />
            </div>
            <span className="text-base font-semibold tracking-tight sm:text-lg">
              Inbound AI
            </span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            Skip intro
          </button>
        </header>

        {/* Main content */}
        <main className="grid items-center gap-8 px-6 py-8 sm:px-8 sm:py-10 md:grid-cols-2 md:gap-10 lg:px-10">
          {/* Left: Text */}
          <section>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-300">
              <Zap size={13} />
              YOUR SMARTER INBOX STARTS HERE
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Your inbox,
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                minus the chaos.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-gray-400 sm:text-base">
              Meet a smarter way to handle email. Understand conversations
              faster, spot what matters, and spend less time digging through
              your inbox.
            </p>

            <button
              type="button"
              onClick={onNext}
              className="mt-7 inline-flex items-center gap-3 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#07090f]"
            >
              Get started
              <ArrowRight size={17} />
            </button>

            {/* Progress */}
            <div className="mt-7 flex items-center gap-2 text-xs text-gray-500">
              <span className="h-1.5 w-6 rounded-full bg-violet-500" />
              <span className="h-1.5 w-2 rounded-full bg-gray-700" />
              <span className="h-1.5 w-2 rounded-full bg-gray-700" />
              <span className="ml-2">Step 1 of 3</span>
            </div>
          </section>

          {/* Right: Product preview */}
          <section className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rounded-3xl bg-violet-600/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#03050a] shadow-2xl">
              {/* Preview top bar */}
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                  <Mail size={17} />
                </div>
                <span className="text-sm font-medium">Your inbox</span>
                <span className="ml-auto rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-300">
                  AI enabled
                </span>
              </div>

              {/* Preview email */}
              <div className="border-b border-white/10 bg-violet-500/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Alex Rivera</span>
                  <span className="text-xs text-gray-500">10:42 AM</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold">
                  Urgent: Q3 Roadmap Alignment
                </h3>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                  We need to finalize the integration specs before tomorrow&apos;s
                  standup...
                </p>
              </div>

              {/* AI summary */}
              <div className="m-3 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-blue-500/5 p-4 sm:m-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
                  <Sparkles size={15} />
                  AI Context Synthesis
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-300">
                  Finalize the Q3 integration specs before tomorrow morning&apos;s
                  standup meeting.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-gray-400">
                    Priority: High
                  </span>
                </div>
              </div>

              {/* Preview footer */}
              <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-xs text-gray-500">
                <Sparkles size={13} className="text-violet-400" />
                Less reading. More clarity.
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-gray-500">
              A clearer inbox, powered by AI.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}