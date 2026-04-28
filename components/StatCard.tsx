import { Badge } from "@/components/Badge";
import { cn } from "@/lib/utils";
import type { DashboardStat } from "@/types";

interface StatCardProps {
  stat: DashboardStat;
}

export function StatCard({ stat }: StatCardProps) {
  const toneBars = {
    neutral: "from-slate-400 to-slate-600",
    info: "from-command to-cyan-600",
    safe: "from-safe to-emerald-400",
    warn: "from-warn to-amber-300",
    alert: "from-alert to-rose-400",
  } as const;

  return (
    <article className="surface-panel motion-card flex min-w-0 flex-col overflow-hidden rounded-[28px] p-5">
      <div className={cn("h-1 w-16 rounded-full bg-gradient-to-r", toneBars[stat.tone])} />
      <div className="mt-5 flex min-h-[78px] flex-col items-start gap-3">
        <p className="max-w-full font-mono text-xs uppercase leading-6 tracking-[0.24em] text-command-soft/70 [overflow-wrap:anywhere]">
          {stat.label}
        </p>
        <Badge
          tone={stat.tone}
          caps={false}
          className="w-fit max-w-full justify-center px-3 py-1 text-left text-[11px] font-bold leading-5 tracking-normal"
        >
          {stat.change}
        </Badge>
      </div>
      <p className="mt-4 text-4xl font-semibold leading-none text-foreground">
        {stat.value}
      </p>
      <div className="mt-4 h-px w-full bg-border/80" />
      <p className="mt-4 text-sm leading-6 text-command-soft/78">
        {stat.helper}
      </p>
    </article>
  );
}
