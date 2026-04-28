import type { ReactNode } from "react";
import { Badge } from "@/components/Badge";
import {
  formatTaskStatusLabel,
  riskLevelDescription,
  riskLevelLabel,
  toneFromRiskLevel,
  toneFromTaskStatus,
} from "@/lib/utils";
import type { ReliefTask } from "@/types";

interface TaskCardProps {
  task: ReliefTask;
  compact?: boolean;
  actions?: ReactNode;
}

export function TaskCard({ task, compact = false, actions }: TaskCardProps) {
  return (
    <article className="motion-card rounded-[28px] border border-border bg-white/88 p-5 shadow-[0_16px_30px_rgba(23,32,51,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={toneFromRiskLevel(task.riskLevel)} caps={false}>
          {riskLevelLabel(task.riskLevel)}
        </Badge>
        <Badge tone={toneFromTaskStatus(task.status)} caps={false}>
          {formatTaskStatusLabel(task.status)}
        </Badge>
        {task.priority ? <Badge tone="info" caps={false}>{task.priority} priority</Badge> : null}
        {task.languagePreference ? (
          <Badge tone="neutral" caps={false}>{task.languagePreference}</Badge>
        ) : null}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-command">{task.title}</h3>
      <p className="mt-2 text-sm leading-6 text-command-soft/78">
        {task.locationLabel ?? task.location.address} - Window {task.window}
      </p>

      {task.description ? (
        <p className="mt-3 text-sm leading-6 text-command-soft/78">
          {task.description}
        </p>
      ) : null}

      {!compact ? (
        <div className="mt-4 rounded-[22px] border border-border bg-mist/32 p-4">
          <p className="text-sm font-semibold text-command">Assignment safety</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">
            {riskLevelDescription(task.riskLevel)}
          </p>
        </div>
      ) : null}

      <div
        className={`mt-5 grid gap-4 ${
          task.requiredResources && task.requiredResources.length > 0
            ? "lg:grid-cols-3"
            : "sm:grid-cols-2"
        }`}
      >
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Required skills
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.requiredSkills.map((skill) => (
              <Badge key={skill} tone="neutral">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Assets
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.requiredAssets.map((asset) => (
              <Badge key={asset} tone="warn">
                {asset}
              </Badge>
            ))}
          </div>
        </div>
        {task.requiredResources && task.requiredResources.length > 0 ? (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
              Resources
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {task.requiredResources.map((resource) => (
                <Badge key={resource} tone="info">
                  {resource}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-command-soft/80">
            Volunteers needed: {task.volunteersNeeded} - Assigned: {task.assignedCount}
          </p>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : actions ? (
        <div className="mt-5 flex flex-wrap gap-2">{actions}</div>
      ) : null}
    </article>
  );
}
