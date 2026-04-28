"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types";

interface ToastInput {
  title: string;
  description?: string;
  tone?: Tone;
  durationMs?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
  tone: Tone;
}

interface ToastContextValue {
  pushToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastSurfaceClasses: Record<Tone, string> = {
  neutral: "border-command/12 bg-white/96",
  info: "border-command/18 bg-command text-white",
  safe: "border-safe/20 bg-white/96",
  warn: "border-warn/25 bg-white/96",
  alert: "border-alert/25 bg-white/96",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, description, tone = "neutral", durationMs = 4200 }: ToastInput) => {
      const id = `toast-${++idRef.current}`;
      const nextToast: ToastRecord = {
        id,
        title,
        description,
        tone,
        durationMs,
      };

      setToasts((current) => [...current, nextToast]);

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      pushToast,
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 sm:inset-x-auto sm:right-5 sm:top-24 sm:bottom-auto sm:w-[360px]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto animate-[toast-in_240ms_ease-out] rounded-[24px] border p-4 shadow-[0_24px_48px_rgba(17,36,58,0.18)] backdrop-blur-xl",
              toastSurfaceClasses[toast.tone],
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone={toast.tone}>
                  {toast.tone === "safe"
                    ? "success"
                    : toast.tone === "alert"
                      ? "error"
                      : toast.tone === "warn"
                        ? "notice"
                        : toast.tone}
                </Badge>
                <p
                  className={cn(
                    "mt-3 text-sm font-semibold",
                    toast.tone === "info" ? "text-white" : "text-command",
                  )}
                >
                  {toast.title}
                </p>
                {toast.description ? (
                  <p
                    className={cn(
                      "mt-2 text-sm leading-6",
                      toast.tone === "info" ? "text-white/80" : "text-command-soft/78",
                    )}
                  >
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className={cn(
                  "rounded-full px-2 py-1 text-xs font-semibold transition",
                  toast.tone === "info"
                    ? "text-white/75 hover:bg-white/10 hover:text-white"
                    : "text-command-soft/70 hover:bg-command/6 hover:text-command",
                )}
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
