"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CrisisImpactModal } from "@/components/CrisisImpactModal";
import { cn, markerToneClasses, formatLocationLabel } from "@/lib/utils";
import type { Crisis, Tone } from "@/types";
import dynamic from "next/dynamic";

const locationIQApiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
const hasLocationIQApiKey = Boolean(locationIQApiKey);

interface ImpactHubMapPoint {
  id: string;
  label: string;
  location: Crisis["location"];
  tone: Tone;
  detail?: string;
}

const DynamicLeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="mt-4 flex h-80 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-white/70">
      Loading map...
    </div>
  ),
});

interface ImpactHubMapProps {
  crises: Crisis[];
}

const crisisTypeTone: Record<string, Tone> = {
  fire: "alert",
  flood: "info",
  landslide: "warn",
  earthquake: "alert",
  cyclone: "info",
};

type FilterMode = "all" | "active" | "resolved";

export function ImpactHubMap({ crises }: ImpactHubMapProps) {
  const [selectedCrisis, setSelectedCrisis] = useState<Crisis | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const filteredCrises = useMemo(() => {
    if (filterMode === "all") return crises;
    if (filterMode === "resolved")
      return crises.filter((c) => c.status === "resolved");
    return crises.filter((c) => c.status !== "resolved");
  }, [crises, filterMode]);

  const points: ImpactHubMapPoint[] = useMemo(
    () =>
      filteredCrises.map((crisis) => ({
        id: crisis.id,
        label: crisis.title,
        location: crisis.location,
        tone: crisisTypeTone[crisis.type] ?? ("neutral" as Tone),
        detail: `${crisis.type.toUpperCase()} — ${crisis.familiesAffected} families • ${crisis.matchedVolunteers} volunteers`,
      })),
    [filteredCrises],
  );

  const filterButtons: { value: FilterMode; label: string }[] = [
    { value: "all", label: "All crises" },
    { value: "active", label: "Active" },
    { value: "resolved", label: "Past work" },
  ];

  return (
    <>
      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Impact Hub
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-command">
              Crisis impact map
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-command-soft/80">
              Every pin represents a crisis where Rahat Setu coordinated relief.
              Click a pin or card to see real impact metrics and stories.
            </p>
          </div>
          <div className="flex gap-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setFilterMode(btn.value)}
                className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                  filterMode === btn.value
                    ? "border-command bg-command text-white shadow-[0_4px_12px_rgba(17,36,58,0.18)]"
                    : "border-border bg-white/80 text-command hover:border-command/35"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map or fallback */}
        {hasLocationIQApiKey && locationIQApiKey ? (
          <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,#17314c_0%,#13273b_100%)] p-4 text-white">
            <DynamicLeafletMap
              apiKey={locationIQApiKey}
              points={points}
              onMarkerClick={(pointId) => {
                const crisis = filteredCrises.find((c) => c.id === pointId);
                if (crisis) setSelectedCrisis(crisis);
              }}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCrises.map((crisis) => (
                <button
                  key={crisis.id}
                  type="button"
                  onClick={() => setSelectedCrisis(crisis)}
                  className="rounded-[20px] border border-white/10 bg-white/10 p-3 text-left backdrop-blur transition hover:bg-white/18"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white/90">
                      {crisis.title}
                    </p>
                    <Badge
                      tone={crisisTypeTone[crisis.type] ?? "neutral"}
                      className="border-0"
                    >
                      {crisis.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-white/60">
                    {crisis.familiesAffected} families •{" "}
                    {crisis.matchedVolunteers} volunteers
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            {/* Fallback visual map */}
            <div className="relative overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,#17314c_0%,#13273b_100%)] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(47,143,131,0.18),transparent_28%),radial-gradient(circle_at_70%_25%,rgba(222,108,76,0.2),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(216,163,69,0.16),transparent_24%)]" />
              <div className="relative flex h-72 items-center justify-center">
                {filteredCrises.map((crisis, index) => {
                  const xPercent = 20 + index * 30;
                  const yPercent = 30 + (index % 2) * 25;
                  const tone = crisisTypeTone[crisis.type] ?? "neutral";

                  return (
                    <button
                      key={crisis.id}
                      type="button"
                      onClick={() => setSelectedCrisis(crisis)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
                      style={{
                        left: `${xPercent}%`,
                        top: `${yPercent}%`,
                      }}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 rounded-full border-2 border-white shadow-[0_10px_20px_rgba(0,0,0,0.32)] animate-pulse",
                            markerToneClasses[tone],
                          )}
                        />
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-[0_8px_18px_rgba(0,0,0,0.22)]",
                            markerToneClasses[tone],
                            "bg-white",
                          )}
                        >
                          {crisis.title}
                        </span>
                      </div>
                    </button>
                  );
                })}

                <div className="absolute bottom-3 left-3 rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                    Interactive map
                  </p>
                  <p className="mt-1.5 max-w-[220px] text-xs leading-5 text-white/70">
                    Click any pin to view impact metrics, stories, and the full
                    crisis room.
                  </p>
                </div>
              </div>
            </div>

            {/* Crisis cards below map */}
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCrises.map((crisis) => {
                const tone = crisisTypeTone[crisis.type] ?? "neutral";

                return (
                  <article
                    key={crisis.id}
                    className="group cursor-pointer rounded-[24px] border border-border bg-white/85 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)] transition hover:shadow-[0_20px_40px_rgba(17,36,58,0.12)]"
                    onClick={() => setSelectedCrisis(crisis)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={tone} caps={false}>
                            {crisis.type}
                          </Badge>
                          <Badge
                            tone={
                              crisis.status === "resolved" ? "safe" : "warn"
                            }
                            caps={false}
                          >
                            {crisis.status}
                          </Badge>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-command group-hover:text-command/90">
                          {crisis.title}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "mt-1 inline-flex h-3.5 w-3.5 rounded-full",
                          markerToneClasses[tone],
                        )}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-command-soft/78">
                      {formatLocationLabel(crisis.location)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-command-soft/70">
                      {crisis.summary}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-[16px] border border-border bg-mist/30 p-2.5 text-center">
                        <p className="text-lg font-bold text-command">
                          {crisis.familiesAffected}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-command-soft/60">
                          Families
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-border bg-mist/30 p-2.5 text-center">
                        <p className="text-lg font-bold text-command">
                          {crisis.matchedVolunteers}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-command-soft/60">
                          Volunteers
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-border bg-mist/30 p-2.5 text-center">
                        <p className="text-lg font-bold text-command">
                          {crisis.openTasks}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-command-soft/60">
                          Tasks
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {selectedCrisis ? (
        <CrisisImpactModal
          crisis={selectedCrisis}
          onClose={() => setSelectedCrisis(null)}
        />
      ) : null}
    </>
  );
}
