"use client";

import React from "react";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Mail,
  BrainCircuit,
} from "lucide-react";

interface EmailIntelligenceProps {
  onNext: () => void;
  onBack: () => void;
}

export default function EmailIntelligence({
  onNext,
  onBack,
}: EmailIntelligenceProps) {
  const features = [
    "Instant AI-powered summaries",
    "Key decisions and action items",
    "Clearer context from lengthy emails",
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex h-dvh w-screen items-center justify-center overflow-y-auto bg-black/90 p-4 text-white sm:p-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      {/* Centered onboarding card */}
      <div className="relative my-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#080910] shadow-2xl shadow-violet-950/20">
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
          <span className="text-xs text-gray-500 sm:text-sm">02 / 04</span>
        </header>

        {/* Main content */}
        <main className="grid items-center gap-8 px-6 py-8 sm:px-8 sm:py-10 md:grid-cols-2 md:gap-10 lg:px-10">
          {/* Left: Text */}
          <section>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-300">
              <BrainCircuit size={13} />
              INTELLIGENCE BEYOND YOUR INBOX
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Understand emails
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                in seconds.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-gray-400 sm:text-base">
              Stop reading every line to understand the bigger picture.
              MailFlow.ai turns lengthy emails into concise summaries and
              highlights the context that matters.
            </p>

            {/* Features */}
            <div className="mt-6 space-y-3">
              {features.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-gray-300"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs text-violet-300">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <button
                type="button"
                onClick={onNext}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#080910]"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Progress */}
            <div className="mt-7 flex items-center gap-2 text-xs text-gray-500">
              <span className="h-1.5 w-6 rounded-full bg-violet-500" />
              <span className="h-1.5 w-2 rounded-full bg-gray-700" />
              <span className="h-1.5 w-2 rounded-full bg-gray-700" />
              <span className="ml-2">Step 2 of 3</span>
            </div>
          </section>

          {/* Right: Email and AI summary preview */}
          <section className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rounded-3xl bg-violet-600/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#03050a] shadow-2xl">
              {/* Email header */}
              <div className="flex items-center gap-3 border-b border-white/10 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                  <Mail size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Project update</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Alex Rivera · 10:42 AM
                  </p>
                </div>
              </div>

              {/* Original email */}
              <div className="p-4">
                <p className="text-sm leading-6 text-gray-400">
                  Hi team, after reviewing the Q3 roadmap, we need to finalize
                  the integration specifications before tomorrow's meeting.
                  Please complete API documentation and confirm testing
                  timelines by tonight.
                </p>
              </div>

              {/* AI summary */}
              <div className="m-3 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-blue-500/5 p-4 sm:m-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
                  <Sparkles size={16} />
                  AI Context Synthesis
                </div>

                <p className="mt-3 text-sm leading-6 text-gray-300">
                  Finalize Q3 integration specifications before tomorrow's
                  meeting.
                </p>

                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Action items
                  </p>
                  <ul className="mt-3 space-y-2.5 text-xs text-gray-300">
                    <li>• Complete API documentation</li>
                    <li>• Confirm testing timelines</li>
                    <li>• Deadline: Tonight</li>
                  </ul>
                </div>
              </div>

              {/* Preview footer */}
              <div className="border-t border-white/10 px-4 py-3 text-[11px] text-gray-500">
                <span className="text-violet-400">✦</span>
                {" "}Example AI-generated summary
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-gray-500">
              Understand more. Read less.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}