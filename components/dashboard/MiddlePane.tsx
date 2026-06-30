"use client";

import React, { useState } from "react";
import { Search, Sparkles, Paperclip } from "lucide-react";
import { MiddlePaneProps } from "@/Types/MiddlePaneProps"; 





export default function MiddlePane({
  aiSidebarOpen,
  setAiSidebarOpen,
  threads,
  selectedThreadId,
  setSelectedThreadId,
}: MiddlePaneProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Find the active thread from the passed-down array
  const activeThread = threads.find((t) => t.id === selectedThreadId);

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-black">
      {/* Search header bar */}
      <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search synced local emails (Prisma indices active)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-slate-700 placeholder-slate-500 text-slate-200"
          />
        </div>
        <button
          onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors"
        >
          <Sparkles className={`h-3.5 w-3.5 ${aiSidebarOpen ? "text-indigo-400" : "text-slate-400"}`} />
          {aiSidebarOpen ? "Hide AI Copilot" : "Open AI Copilot"}
        </button>
      </header>

      {/* Inner layout split (List vs Detail) */}
      <div className="flex-1 flex min-h-0">
        {/* Thread list list column */}
        <section className="w-80 border-r border-slate-800 overflow-y-auto flex-shrink-0 bg-black">
          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
              className={`p-4 border-b border-slate-900 cursor-pointer transition-all ${
                selectedThreadId === thread.id
                  ? "bg-black border-l-2 border-l-indigo-500"
                  : "hover:bg-slate-900/30"
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-xs font-medium text-slate-200 truncate">{thread.sender}</span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{thread.date}</span>
              </div>
              <h4 className="text-xs font-semibold text-slate-300 truncate mb-1">{thread.subject}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{thread.preview}</p>

              {thread.aiClassification === "URGENT" && (
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/50 text-red-400 border border-red-900/40">
                  AI Prioritized
                </span>
              )}
            </div>
          ))}
        </section>

        {/* Expanded reading window view */}
        <section className="flex-1 p-6 overflow-y-auto bg-black flex flex-col justify-between">
          {activeThread ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs text-slate-400 font-medium">
                    From: <strong className="text-slate-200">{activeThread.sender}</strong>
                  </span>
                  <span className="text-xs text-slate-500">{activeThread.date}</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-100 tracking-tight">{activeThread.subject}</h2>
              </div>

              {/* GENERATIVE UI PLACEHOLDER AREA */}
              {activeThread.summary && (
                <div className="p-4 bg-slate-950 border border-indigo-900/30 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Context Synthesis
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{activeThread.summary}</p>
                </div>
              )}

              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap border-t border-slate-900 pt-4">
                {activeThread.preview} Full implementation data fetched from mock database records pipeline.
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Select an email thread to load context.
            </div>
          )}

          {/* Quick reply composition bottom area */}
          <div className="mt-6 border-t border-slate-900 pt-4">
            <div className="bg-black border border-slate-800 rounded-xl p-3 focus-within:border-slate-700 transition-colors">
              <textarea
                placeholder="Draft an inline response or use Copilot suggestions on the right..."
                className="w-full bg-transparent border-0 resize-none text-xs focus:outline-none min-h-[60px] text-slate-200 placeholder-slate-500"
              />
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/60 mt-2">
                <div className="flex gap-1">
                  <button className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-black rounded-md transition-colors">
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all shadow-md shadow-indigo-600/10">
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}