"use client";

import React, { useState } from "react";
import { Search, Sparkles, Paperclip, Menu, ArrowLeft } from "lucide-react";
import { EmailThread } from "../../Types/email";

interface MiddlePaneProps {
  aiSidebarOpen: boolean;
  setAiSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  threads: EmailThread[];
  selectedThreadId: string | null;
  setSelectedThreadId: React.Dispatch<React.SetStateAction<string>>;
  onMobileMenuToggle: () => void; // Received parent action trigger prop
}

export default function MiddlePane({
  aiSidebarOpen,
  setAiSidebarOpen,
  threads,
  selectedThreadId,
  setSelectedThreadId,
  onMobileMenuToggle,
}: MiddlePaneProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // We track a mobile focus variable to toggle view modes cleanly on mobile screen widths
  const [isViewingDetailOnMobile, setIsViewingDetailOnMobile] = useState(false);

  const activeThread = threads.find((t) => t.id === selectedThreadId);

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-black h-full">
      {/* Search Header Bar */}
      <header className="h-14 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 w-full max-w-md">
          {/* Mobile hamburger menu toggle */}
          <button 
            onClick={onMobileMenuToggle} 
            className="p-1.5 text-slate-400 hover:text-slate-200 lg:hidden rounded-md hover:bg-slate-900"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search synced emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-slate-700 text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>
        
        <button
          onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors whitespace-nowrap"
        >
          <Sparkles className={`h-3.5 w-3.5 ${aiSidebarOpen ? "text-indigo-400" : "text-slate-400"}`} />
          <span className="hidden md:inline">{aiSidebarOpen ? "Hide AI" : "Open AI"}</span>
        </button>
      </header>

      {/* Inner split layout (List vs Detail Viewport Area) */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* Thread list section - Hidden on mobile if viewing an email detail */}
        <section className={`w-full md:w-80 border-r border-slate-800 overflow-y-auto flex-shrink-0 bg-slate-950/40 ${
          isViewingDetailOnMobile ? "hidden md:block" : "block"
        }`}>
          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => {
                setSelectedThreadId(thread.id);
                setIsViewingDetailOnMobile(true); // Bring details forward on mobile click
              }}
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
            </div>
          ))}
        </section>

        {/* Expanded reading window view - Hidden on mobile if looking through list index */}
        <section className={`flex-1 p-4 md:p-6 overflow-y-auto bg-black flex flex-col justify-between ${
          isViewingDetailOnMobile ? "block" : "hidden md:flex"
        }`}>
          {activeThread ? (
            <div className="space-y-6 flex-1">
              <div className="border-b border-slate-900 pb-4">
                {/* Mobile Back button to return to email list index mapping */}
                <button 
                  onClick={() => setIsViewingDetailOnMobile(false)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium mb-4 md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Inbox
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <span className="text-xs text-slate-400 font-medium">
                    From: <strong className="text-slate-200">{activeThread.sender}</strong>
                  </span>
                  <span className="text-xs text-slate-500">{activeThread.date}</span>
                </div>
                <h2 className="text-base md:text-lg font-semibold text-slate-100 tracking-tight">{activeThread.subject}</h2>
              </div>

              {activeThread.summary && (
                <div className="p-4 bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-indigo-900/30 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Context Synthesis
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{activeThread.summary}</p>
                </div>
              )}

              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {activeThread.preview} Full implementation data fetched from mock records.
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Select an email thread to load context.
            </div>
          )}

          {/* Quick reply composition block */}
          <div className="mt-6 border-t border-slate-900 pt-4 bg-black">
            <div className="bg-black border border-slate-800 rounded-xl p-3 focus-within:border-slate-700 transition-colors">
              <textarea
                placeholder="Draft an inline response..."
                className="w-full bg-transparent border-0 resize-none text-xs focus:outline-none min-h-[60px] text-slate-200 placeholder-slate-500"
              />
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/60 mt-2">
                <button className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors">
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all">
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