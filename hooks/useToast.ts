"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastMessage {
  type: "success" | "error";
  message: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string, type: ToastMessage["type"]) => {
    if (timeout.current) clearTimeout(timeout.current);
    setToast({ message, type });
    timeout.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  return { toast, notify };
}
