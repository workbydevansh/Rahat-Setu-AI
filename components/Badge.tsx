import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  caps?: boolean;
}

const toneClasses: Record<Tone, string> = {
  neutral: "border border-slate-500/14 bg-slate-900/5 text-slate-700",
  info: "border border-command/18 bg-command/8 text-command",
  safe: "border border-safe/18 bg-safe/10 text-safe",
  warn: "border border-warn/22 bg-warn/10 text-amber-800",
  alert: "border border-alert/20 bg-alert/10 text-alert",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  caps = true,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] px-2.5 py-1 text-[11px] font-semibold leading-4",
        caps ? "uppercase tracking-[0.14em]" : "tracking-[0.01em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
