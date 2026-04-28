import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { formatAvailabilityStatus } from "@/lib/utils";
import type { VolunteerProfile } from "@/types";

interface VolunteerMatchCardProps {
  volunteer: VolunteerProfile;
  score: number;
  reasons: string[];
  distanceLabel: string;
  isAssigned: boolean;
  isAssigning: boolean;
  onAssign: () => void;
}

export function VolunteerMatchCard({
  volunteer,
  score,
  reasons,
  distanceLabel,
  isAssigned,
  isAssigning,
  onAssign,
}: VolunteerMatchCardProps) {
  return (
    <article className="rounded-[28px] border border-border bg-white/88 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-command">{volunteer.name}</h3>
            <Badge tone={volunteer.verified ? "safe" : "warn"}>
              {volunteer.verified ? "verified" : "verification pending"}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">
            {volunteer.roleTitle}
            {volunteer.city || volunteer.location.city
              ? ` - ${volunteer.city ?? volunteer.location.city}`
              : ""}
          </p>
        </div>

        <div className="rounded-[22px] bg-command px-4 py-3 text-right text-white">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/70">
            Match score
          </p>
          <p className="mt-1 text-2xl font-semibold">{score.toFixed(1)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Distance
          </p>
          <p className="mt-2 text-base font-semibold text-command">{distanceLabel}</p>
        </div>
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Availability
          </p>
          <p className="mt-2 text-base font-semibold text-command">
            {formatAvailabilityStatus(volunteer.availability)}
          </p>
        </div>
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Emergency
          </p>
          <p className="mt-2 text-base font-semibold text-command">
            {volunteer.emergencyAvailable ? "Ready" : "Standard"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Skills
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {volunteer.skills.length > 0 ? (
              volunteer.skills.map((skill) => (
                <Badge key={skill} tone="neutral">
                  {skill}
                </Badge>
              ))
            ) : (
              <Badge tone="neutral">No skills listed</Badge>
            )}
          </div>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Assets
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {volunteer.assets.length > 0 ? (
              volunteer.assets.map((asset) => (
                <Badge key={asset} tone="warn">
                  {asset}
                </Badge>
              ))
            ) : (
              <Badge tone="warn">No assets listed</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-border bg-mist/38 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
          Match reasons
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <Badge key={reason} tone="info" className="normal-case tracking-normal">
              {reason}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm leading-6 text-command-soft/78">
            {isAssigned
              ? "This volunteer is already assigned to the task."
              : "Assign this volunteer to create the match record and a notification placeholder."}
          </p>
          <p className="text-sm leading-6 text-command-soft/72">
            Exact volunteer location stays private here and is intended to be shown
            only to a verified NGO after task assignment.
          </p>
        </div>
        <Button onClick={onAssign} disabled={isAssigned || isAssigning}>
          {isAssigned ? "Assigned" : isAssigning ? "Assigning..." : "Assign volunteer"}
        </Button>
      </div>
    </article>
  );
}
