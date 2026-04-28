import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import {
  formatCrisisStatusLabel,
  formatLocationLabel,
  riskLevelDescription,
  riskLevelLabel,
  toneFromCrisisType,
  toneFromRiskLevel,
  toneFromStatus,
} from "@/lib/utils";
import type { Crisis } from "@/types";

interface CrisisCardProps {
  crisis: Crisis;
}

export function CrisisCard({ crisis }: CrisisCardProps) {
  return (
    <article className="motion-card rounded-[30px] border border-border bg-white/88 p-5 shadow-[0_16px_32px_rgba(23,32,51,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={toneFromCrisisType(crisis.type)}>{crisis.type}</Badge>
        <Badge tone={toneFromRiskLevel(crisis.riskLevel)} caps={false}>
          {riskLevelLabel(crisis.riskLevel)}
        </Badge>
        <Badge tone={toneFromStatus(crisis.status)} caps={false}>
          {formatCrisisStatusLabel(crisis.status)}
        </Badge>
        <Badge tone={crisis.verified ? "safe" : "warn"} caps={false}>
          {crisis.verified ? "Verified room" : "Verification pending"}
        </Badge>
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-semibold text-command">{crisis.title}</h3>
        <p className="mt-2 text-sm leading-6 text-command-soft/80">
          {formatLocationLabel(crisis.location)} - Updated {crisis.updatedAt}
        </p>
        <p className="mt-4 text-sm leading-6 text-command-soft/80">{crisis.summary}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {crisis.needs.slice(0, 4).map((need) => (
          <Badge key={need} tone="warn">
            {need}
          </Badge>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-command-soft/65">
            Families
          </p>
          <p className="mt-2 text-xl font-semibold text-command">
            {crisis.familiesAffected}
          </p>
        </div>
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-command-soft/65">
            Matches
          </p>
          <p className="mt-2 text-xl font-semibold text-command">
            {crisis.matchedVolunteers}
          </p>
        </div>
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-command-soft/65">
            Tasks
          </p>
          <p className="mt-2 text-xl font-semibold text-command">{crisis.openTasks}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-border bg-mist/34 p-4">
        <p className="text-sm font-semibold text-command">Risk guidance</p>
        <p className="mt-2 text-sm leading-6 text-command-soft/78">
          {riskLevelDescription(crisis.riskLevel)}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button href={`/crisis/${crisis.id}`} variant="secondary">
          View crisis room
        </Button>
        <Button href={`/crisis/${crisis.id}/help`}>Donate / help</Button>
      </div>
    </article>
  );
}
