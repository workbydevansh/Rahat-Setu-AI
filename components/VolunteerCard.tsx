import { Badge } from "@/components/Badge";
import { formatAvailabilityStatus } from "@/lib/utils";
import type { VolunteerProfile } from "@/types";

interface VolunteerCardProps {
  volunteer: VolunteerProfile;
}

export function VolunteerCard({ volunteer }: VolunteerCardProps) {
  return (
    <article className="rounded-[28px] border border-border bg-white/88 p-5 shadow-[0_16px_30px_rgba(17,36,58,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-command">{volunteer.name}</h3>
          <p className="mt-1 text-sm leading-6 text-command-soft/78">
            {volunteer.roleTitle} - {volunteer.city}
          </p>
        </div>
        <Badge tone={volunteer.verified ? "safe" : "warn"} caps={false}>
          {volunteer.verified ? "verified" : "verification pending"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Distance
          </p>
          <p className="mt-2 text-lg font-semibold text-command">
            {volunteer.distanceKm ?? "-"} km
          </p>
        </div>
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Response
          </p>
          <p className="mt-2 text-lg font-semibold text-command">
            {volunteer.responseRate ?? "-"}
          </p>
        </div>
        <div className="rounded-[20px] bg-mist/55 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
            Status
          </p>
          <p className="mt-2 text-lg font-semibold text-command">
            {formatAvailabilityStatus(volunteer.availability)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={volunteer.emergencyAvailable ? "alert" : "neutral"} caps={false}>
          {volunteer.emergencyAvailable ? "Emergency on" : "Emergency off"}
        </Badge>
        {volunteer.availableTime ? (
          <Badge tone="info" caps={false}>{volunteer.availableTime}</Badge>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {volunteer.skills.map((skill) => (
          <Badge key={skill} tone="neutral">
            {skill}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {volunteer.assets.map((asset) => (
          <Badge key={asset} tone="warn">
            {asset}
          </Badge>
        ))}
      </div>
    </article>
  );
}
