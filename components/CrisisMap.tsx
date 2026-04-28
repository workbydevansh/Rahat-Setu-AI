"use client";

import { Badge } from "@/components/Badge";
import { cn, formatLocationLabel, markerToneClasses } from "@/lib/utils";
import type { Location, Tone } from "@/types";

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

const hasGoogleMapsApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

function hasUsableCoordinates(location: Location) {
  return (
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) &&
    (location.lat !== 0 || location.lng !== 0)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFallbackPosition(index: number) {
  const columns = 3;
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    left: 18 + column * 28,
    top: 22 + row * 16,
  };
}

function buildMarkerPosition(
  point: CrisisMapPoint,
  index: number,
  points: CrisisMapPoint[],
) {
  const pointsWithCoordinates = points.filter((candidate) =>
    hasUsableCoordinates(candidate.location),
  );

  if (!hasUsableCoordinates(point.location) || pointsWithCoordinates.length === 0) {
    return getFallbackPosition(index);
  }

  const latitudes = pointsWithCoordinates.map((candidate) => candidate.location.lat);
  const longitudes = pointsWithCoordinates.map((candidate) => candidate.location.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const normalizedLat =
    latSpan === 0 ? 0.5 : (maxLat - point.location.lat) / latSpan;
  const normalizedLng =
    lngSpan === 0 ? 0.5 : (point.location.lng - minLng) / lngSpan;
  const offsetX = ((index % 3) - 1) * 2.4;
  const offsetY = ((index % 4) - 1.5) * 1.8;

  return {
    left: clamp(12 + normalizedLng * 76 + offsetX, 10, 90),
    top: clamp(14 + normalizedLat * 66 + offsetY, 12, 86),
  };
}

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
        <Badge tone={hasGoogleMapsApiKey ? "safe" : "neutral"}>
          {hasGoogleMapsApiKey ? "Google Maps API detected" : "Fallback map mode"}
        </Badge>
      </div>

      {hasGoogleMapsApiKey ? (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,#17314c_0%,#13273b_100%)] p-4 text-white">
          <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-white/78">
            Google Maps key is available, so this placeholder is ready to be swapped for the
            real map layer without changing the data shape. Until then, the command board still
            shows all marker groups safely.
          </div>

          <div className="relative mt-4 h-80 overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(47,143,131,0.18),transparent_26%),radial-gradient(circle_at_78%_26%,rgba(222,108,76,0.22),transparent_28%),radial-gradient(circle_at_54%_82%,rgba(216,163,69,0.15),transparent_24%)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />

            {allPoints.map((point, index) => {
              const position = buildMarkerPosition(point, index, allPoints);

              return (
                <div
                  key={point.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${position.left}%`, top: `${position.top}%` }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 rounded-full border-2 border-white shadow-[0_10px_20px_rgba(0,0,0,0.22)]",
                        markerToneClasses[point.tone],
                      )}
                    />
                    <div
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-[0_12px_24px_rgba(0,0,0,0.22)]",
                        markerToneClasses[point.tone],
                      )}
                    >
                      {point.label}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="absolute bottom-4 left-4 right-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <p className="text-sm font-semibold text-command">Google Maps ready later</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">
              Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to keep this component ready for a live map
              upgrade. Until then, the fallback cards keep the app fully usable and safe.
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
