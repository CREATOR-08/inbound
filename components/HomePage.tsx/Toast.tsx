"use client";

import type { ToastMessage } from "@/hooks/useToast";

interface ToastProps {
  toast: ToastMessage | null;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`fixed bottom-5 right-5 z-[120] max-w-[calc(100vw-2.5rem)] rounded-xl border px-4 py-3 text-sm shadow-2xl ${
        toast.type === "success"
          ? "border-emerald-500/30 bg-[#0d1b16] text-emerald-200"
          : "border-rose-500/30 bg-[#1c1014] text-rose-200"
      }`}
    >
      {toast.message}
    </div>
  );
}
