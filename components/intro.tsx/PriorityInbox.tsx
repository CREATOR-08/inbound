"use client";

import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface PriorityInboxProps {
  onNext: () => void;
  onBack: () => void;
}

export default function PriorityInbox({
  onNext,
  onBack,
}: PriorityInboxProps) {
  const features = [
    "Quick email search",
    "A dedicated urgent-email view",
    "Less time sorting through messages",
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex h-dvh w-screen items-center justify-center overflow-y-auto bg-black/90 p-4 text-white sm:p-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-violet-600/10 blur-[100px]" />
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
          <span className="text-xs text-gray-500 sm:text-sm">03 / 04</span>
        </header>

        {/* Main content */}
        <main className="grid items-center gap-8 px-6 py-8 sm:px-8 sm:py-10 md:grid-cols-2 md:gap-10 lg:px-10">
          {/* Left: Text */}
          <section>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[11px] font-medium text-blue-300">
              <AlertCircle size={13} />
              YOUR ATTENTION, PRIORITIZED
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Focus on what
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                matters most.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-gray-400 sm:text-base">
              Find important conversations without digging through dozens
              of messages. Search your inbox quickly and separate urgent
              emails from everyday updates.
            </p>

            <div className="mt-6 space-y-3">
              {features.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-gray-300"
                >
                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-violet-400"
                  />
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
              <span className="h-1.5 w-2 rounded-full bg-gray-700" />
              <span className="h-1.5 w-2 rounded-full bg-gray-700" />
              <span className="h-1.5 w-6 rounded-full bg-violet-500" />
              <span className="ml-2">Step 3 of 3</span>
            </div>
          </section>

          {/* Right: Inbox preview */}
          <section className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rounded-3xl bg-blue-600/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#03050a] shadow-2xl">
              {/* Preview header */}
              <div className="flex items-center gap-3 border-b border-white/10 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                  <Inbox size={17} />
                </div>
                <span className="text-sm font-semibold">Your inbox</span>
                <span className="ml-auto rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-300">
                  12 emails
                </span>
              </div>

              {/* Search */}
              <div className="border-b border-white/10 p-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <Search size={16} className="shrink-0 text-gray-500" />
                  <span className="text-xs text-gray-500">
                    Search synced emails...
                  </span>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 p-3">
                <span className="rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-medium">
                  All mail
                </span>
                <span className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-gray-400">
                  Urgent only
                </span>
              </div>

              {/* Urgent email */}
              <div className="border-t border-white/10 bg-violet-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Alex Rivera</p>
                      <span className="text-[11px] text-gray-500">
                        10:42 AM
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">
                      Urgent: Q3 Roadmap Alignment
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      Integration specifications needed before tomorrow's
                      standup.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300">
                      <AlertCircle size={12} />
                      High priority
                    </span>
                  </div>
                </div>
              </div>

              {/* Regular email */}
              <div className="border-t border-white/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />
                  <div>
                    <p className="text-sm font-medium">Weekly Newsletter</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Regular updates · No immediate action needed
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview footer */}
              <div className="border-t border-white/10 px-4 py-3 text-[11px] text-gray-500">
                Illustrative inbox preview
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-gray-500">
              Find the important. Ignore the noise.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}