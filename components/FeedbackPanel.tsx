import type { ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/utils";

type FeedbackState = "loading" | "error" | "success" | "empty" | "info";

interface FeedbackPanelProps {
  state?: FeedbackState;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

const stateConfig: Record<
  FeedbackState,
  {
    tone: "neutral" | "info" | "safe" | "warn" | "alert";
    badge: string;
    container: string;
  }
> = {
  loading: {
    tone: "info",
    badge: "loading",
    container: "border-border bg-surface",
  },
  error: {
    tone: "alert",
    badge: "attention",
    container: "border-alert/20 bg-surface",
  },
  success: {
    tone: "safe",
    badge: "updated",
    container: "border-safe/20 bg-surface",
  },
  empty: {
    tone: "neutral",
    badge: "empty",
    container: "border-dashed border-border bg-white/80",
  },
  info: {
    tone: "warn",
    badge: "info",
    container: "border-border bg-surface",
  },
};

export function FeedbackPanel({
  state = "info",
  title,
  description,
  action,
  className,
}: FeedbackPanelProps) {
  const config = stateConfig[state];

  return (
    <section
      className={cn(
        "motion-card rounded-[28px] border p-5 shadow-[0_18px_40px_rgba(23,32,51,0.08)]",
        config.container,
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={config.tone}>{config.badge}</Badge>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
              System state
            </p>
          </div>
          <p className="mt-4 text-base font-semibold text-command">{title}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-command-soft/78">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
