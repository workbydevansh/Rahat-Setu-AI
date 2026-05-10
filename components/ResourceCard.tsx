import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import {
  formatResourceStatusLabel,
  humanizeLabel,
  progressPercentage,
  toneFromUrgency,
} from "@/lib/utils";
import type { ResourceNeed } from "@/types";

interface ResourceCardProps {
  need: ResourceNeed;
  compact?: boolean;
  actionHref?: string;
  actionLabel?: string;
  onMarkUrgent?: () => void;
}

export function ResourceCard({
  need,
  compact = false,
  actionHref,
  actionLabel,
  onMarkUrgent,
}: ResourceCardProps) {
  const progress = progressPercentage(need.quantityPledged, need.quantityNeeded);
  const urgencyTone = toneFromUrgency(need.urgency);
  const statusTone = need.status === "fulfilled" ? "safe" : "neutral";

  return (
    <article className="motion-card overflow-hidden rounded-[28px] border border-border bg-white/88 shadow-[0_16px_30px_rgba(23,32,51,0.06)]">
      <div className="h-1 bg-[linear-gradient(90deg,#079669,#1d4ed8,#d99720)]" />
      <div className="p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={urgencyTone} caps={false}>
              {humanizeLabel(need.urgency)}
            </Badge>
            <Badge tone={statusTone} caps={false}>
              {formatResourceStatusLabel(need.status)}
            </Badge>
          </div>
          <p className="mt-4 text-lg font-semibold leading-7 text-command">
            {need.label}
          </p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">
            {need.locationLabel} - Deadline {need.deadline}
          </p>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-sm font-medium text-command">
            <span>
              {need.quantityPledged} pledged / {need.quantityNeeded} needed
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#079669,#1d4ed8,#d99720)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {!compact ? (
          <p className="mt-4 text-sm leading-6 text-command-soft/80">
            Preferred help source: {need.providerHint}
          </p>
        ) : null}

        {actionHref && actionLabel ? (
          <div className="mt-5 flex gap-2">
            <Button href={actionHref} variant="secondary" size="sm">
              {actionLabel}
            </Button>
            {onMarkUrgent && (
              <Button type="button" onClick={onMarkUrgent} variant="secondary" size="sm">
                Mark Critical
              </Button>
            )}
          </div>
        ) : onMarkUrgent ? (
          <div className="mt-5">
            <Button type="button" onClick={onMarkUrgent} variant="secondary" size="sm">
              Mark Critical
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
