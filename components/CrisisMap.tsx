"use client";

import { Badge } from "@/components/Badge";
import { cn, formatLocationLabel, markerToneClasses } from "@/lib/utils";
import type { Location, Tone } from "@/types";
import dynamic from "next/dynamic";

export interface CrisisMapPoint {
  id: string;
  label: string;
  location: Location;
  tone: Tone;
  detail?: string;
}

interface CrisisMapProps {
  title: string;
  subtitle: string;
  affectedArea: CrisisMapPoint | null;
  ngoCenters?: CrisisMapPoint[];
  volunteers?: CrisisMapPoint[];
  resourceDonors?: CrisisMapPoint[];
  tasks?: CrisisMapPoint[];
}

interface CrisisMapGroup {
  label: string;
  tone: Tone;
  points: CrisisMapPoint[];
}

const locationIQApiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
const hasLocationIQApiKey = Boolean(locationIQApiKey);

const DynamicLeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="mt-4 h-80 flex items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-white/70">Loading map...</div>
});

export function CrisisMap({
  title,
  subtitle,
  affectedArea,
  ngoCenters = [],
  volunteers = [],
  resourceDonors = [],
  tasks = [],
}: CrisisMapProps) {
  const groups: CrisisMapGroup[] = [
    {
      label: "Affected area",
      tone: affectedArea?.tone ?? "alert",
      points: affectedArea ? [affectedArea] : [],
    },
    {
      label: "NGO center",
      tone: "neutral",
      points: ngoCenters,
    },
    {
      label: "Volunteers",
      tone: "safe",
      points: volunteers,
    },
    {
      label: "Resource donors",
      tone: "info",
      points: resourceDonors,
    },
    {
      label: "Tasks",
      tone: "warn",
      points: tasks,
    },
  ];

  const populatedGroups = groups.filter((group) => group.points.length > 0);
  const allPoints = populatedGroups.flatMap((group) => group.points);

  return (
    <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
            Crisis map
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-command">{title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-command-soft/80">
            {subtitle}
          </p>
        </div>
        <Badge tone={hasLocationIQApiKey ? "safe" : "neutral"}>
          {hasLocationIQApiKey ? "LocationIQ active" : "Fallback map mode"}
        </Badge>
      </div>

      {hasLocationIQApiKey && locationIQApiKey ? (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,#17314c_0%,#13273b_100%)] p-4 text-white">
          <DynamicLeafletMap apiKey={locationIQApiKey} points={allPoints} />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {populatedGroups.map((group) => (
              <div
                key={group.label}
                className="rounded-[20px] border border-white/10 bg-white/10 p-3 backdrop-blur"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                    {group.label}
                  </p>
                  <Badge tone={group.tone} className="border-0">
                    {group.points.length}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {populatedGroups.map((group) => (
            <article
              key={group.label}
              className="rounded-[24px] border border-border bg-white/85 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-command">{group.label}</p>
                <Badge tone={group.tone}>{group.points.length}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {group.points.map((point) => (
                  <div
                    key={point.id}
                    className="rounded-[18px] border border-border bg-mist/55 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-3 w-3 rounded-full",
                          markerToneClasses[point.tone],
                        )}
                      />
                      <p className="text-sm font-semibold text-command">{point.label}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-command-soft/78">
                      {formatLocationLabel(point.location)}
                    </p>
                    {point.detail ? (
                      <p className="mt-1 text-sm leading-6 text-command-soft/70">
                        {point.detail}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}

          <article className="rounded-[24px] border border-dashed border-border bg-white/80 p-5 md:col-span-2 xl:col-span-3">
            <p className="text-sm font-semibold text-command">LocationIQ ready later</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">
              Add \`NEXT_PUBLIC_LOCATIONIQ_API_KEY\` to keep this component ready for a live map
              upgrade. Until then, the fallback cards keep the app fully usable and safe.
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
