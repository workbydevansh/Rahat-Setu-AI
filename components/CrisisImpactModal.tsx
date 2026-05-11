"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import {
  getCrisisImpactMetrics,
  getStorySpotlights,
  getVolunteerProfiles,
} from "@/lib/firestore";
import { calculateSkillTagScore } from "@/lib/matching";
import type {
  Crisis,
  CrisisImpactMetric,
  StorySpotlight,
  VolunteerProfile,
} from "@/types";
import { VOLUNTEER_SKILL_TAG_LABELS } from "@/types";

interface CrisisImpactModalProps {
  crisis: Crisis;
  onClose: () => void;
}

const toneForType: Record<string, "alert" | "info" | "warn" | "safe"> = {
  fire: "alert",
  flood: "info",
  landslide: "warn",
  earthquake: "alert",
  cyclone: "info",
};

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

export function CrisisImpactModal({ crisis, onClose }: CrisisImpactModalProps) {
  const [metrics, setMetrics] = useState<CrisisImpactMetric[]>([]);
  const [stories, setStories] = useState<StorySpotlight[]>([]);
  const [matchedVolunteers, setMatchedVolunteers] = useState<
    Array<{ volunteer: VolunteerProfile; score: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadImpactData() {
      setIsLoading(true);

      const [metricsResult, storiesResult, volunteersResult] = await Promise.allSettled([
        getCrisisImpactMetrics(crisis.id),
        getStorySpotlights(crisis.id),
        getVolunteerProfiles(),
      ]);

      if (!isActive) return;

      if (metricsResult.status === "fulfilled") {
        setMetrics(metricsResult.value);
      }

      if (storiesResult.status === "fulfilled") {
        setStories(storiesResult.value);
      }

      if (volunteersResult.status === "fulfilled") {
        const scored = volunteersResult.value
          .map((volunteer) => ({
            volunteer,
            score: calculateSkillTagScore(crisis, volunteer),
          }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4);
        setMatchedVolunteers(scored);
      }

      setIsLoading(false);
    }

    loadImpactData();

    return () => {
      isActive = false;
    };
  }, [crisis.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const tone = toneForType[crisis.type] ?? "neutral";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-command/60 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-border bg-surface p-6 shadow-[0_40px_100px_rgba(17,36,58,0.28)] sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/80 text-command-soft/70 transition hover:bg-white hover:text-command"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <Badge tone={tone} caps={false}>
            {crisis.type}
          </Badge>
          <Badge
            tone={crisis.status === "resolved" ? "safe" : "warn"}
            caps={false}
          >
            {crisis.status}
          </Badge>
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-command sm:text-3xl">
          {crisis.title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-command-soft/78">
          {crisis.location.address}
          {crisis.location.city ? `, ${crisis.location.city}` : ""}
          {crisis.location.state ? `, ${crisis.location.state}` : ""}
        </p>

        <p className="mt-4 text-sm leading-7 text-command-soft/80">
          {crisis.description}
        </p>

        {/* Quick stats */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-border bg-white/85 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-command-soft/60">
              Families affected
            </p>
            <p className="mt-2 text-2xl font-bold text-command">
              {formatNumber(crisis.familiesAffected)}
            </p>
          </div>
          <div className="rounded-[20px] border border-border bg-white/85 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-command-soft/60">
              Volunteers matched
            </p>
            <p className="mt-2 text-2xl font-bold text-command">
              {crisis.matchedVolunteers}
            </p>
          </div>
          <div className="rounded-[20px] border border-border bg-white/85 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-command-soft/60">
              Open tasks
            </p>
            <p className="mt-2 text-2xl font-bold text-command">
              {crisis.openTasks}
            </p>
          </div>
        </div>

        {/* Impact Metrics */}
        {isLoading ? (
          <div className="mt-6 rounded-[24px] border border-border bg-mist/30 p-6 text-center">
            <p className="text-sm text-command-soft/70">
              Loading impact data...
            </p>
          </div>
        ) : (
          <>
            {metrics.length > 0 ? (
              <div className="mt-6">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/65">
                  Impact metrics
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-[20px] border border-safe/20 bg-safe/6 p-4"
                    >
                      <p className="text-sm font-semibold text-command">
                        {metric.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-safe">
                        {formatNumber(metric.value)}
                        {metric.unit ? (
                          <span className="ml-1 text-sm font-medium text-command-soft/60">
                            {metric.unit}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Story Spotlights */}
            {stories.length > 0 ? (
              <div className="mt-6">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/65">
                  Story spotlights
                </p>
                <div className="mt-3 space-y-4">
                  {stories.map((story) => (
                    <article
                      key={story.id}
                      className="rounded-[24px] border border-border bg-white/85 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-command">
                            {story.personName}
                            {story.personAge ? (
                              <span className="ml-2 text-sm font-normal text-command-soft/60">
                                age {story.personAge}
                              </span>
                            ) : null}
                          </h3>
                          {story.location ? (
                            <p className="mt-1 text-xs text-command-soft/60">
                              {story.location.address ?? story.location.city}
                            </p>
                          ) : null}
                        </div>
                        {story.imageUrl ? (
                          <div className="h-14 w-14 flex-shrink-0 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#0891b2)] shadow-[0_8px_20px_rgba(29,78,216,0.2)]" />
                        ) : null}
                      </div>
                      {story.narrative ? (
                        <p className="mt-3 text-sm leading-7 text-command-soft/80">
                          {story.narrative}
                        </p>
                      ) : null}
                      {story.quote ? (
                        <blockquote className="mt-3 rounded-[18px] border-l-4 border-safe/40 bg-safe/6 px-4 py-3 text-sm italic leading-6 text-command-soft/75">
                          &ldquo;{story.quote}&rdquo;
                        </blockquote>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Matching Volunteers — Phase 2 ↔ Phase 3 bridge */}
            {matchedVolunteers.length > 0 ? (
              <div className="mt-6">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/65">
                  Matching volunteers
                </p>
                <p className="mt-1 text-xs leading-5 text-command-soft/60">
                  Volunteers whose skill tags match this crisis&apos;s needs.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {matchedVolunteers.map(({ volunteer, score }) => (
                    <div
                      key={volunteer.id}
                      className="rounded-[20px] border border-border bg-white/85 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-command">
                          {volunteer.name}
                        </p>
                        <Badge tone="safe" caps={false}>
                          {Math.round(score * 100)}% match
                        </Badge>
                      </div>
                      {volunteer.skillTags && volunteer.skillTags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {volunteer.skillTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-command/12 bg-command/6 px-2 py-0.5 text-[10px] font-medium capitalize text-command-soft/80"
                            >
                              {VOLUNTEER_SKILL_TAG_LABELS[tag]}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {metrics.length === 0 && stories.length === 0 && matchedVolunteers.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-border bg-white/80 p-6 text-center">
                <p className="text-sm font-semibold text-command">
                  Impact data coming soon
                </p>
                <p className="mt-2 text-sm leading-6 text-command-soft/70">
                  Metrics and stories for this crisis will be published as the
                  response progresses.
                </p>
              </div>
            ) : null}
          </>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button href={`/crisis/${crisis.id}`} size="sm" className="sm:flex-1">
            Open crisis room
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="sm:flex-1"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
