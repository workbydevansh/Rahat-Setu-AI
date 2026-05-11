"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import {
  VOLUNTEER_SKILL_TAG_LABELS,
  type VolunteerProfile,
  type VolunteerSkillTag,
} from "@/types";

const ALL_SKILL_TAGS = Object.keys(
  VOLUNTEER_SKILL_TAG_LABELS,
) as VolunteerSkillTag[];

interface SkillFilterPanelProps {
  volunteers: VolunteerProfile[];
  onSendNotification?: (
    volunteers: VolunteerProfile[],
    tags: VolunteerSkillTag[],
  ) => void;
}

export function SkillFilterPanel({
  volunteers,
  onSendNotification,
}: SkillFilterPanelProps) {
  const [activeTags, setActiveTags] = useState<VolunteerSkillTag[]>([]);

  function toggleTag(tag: VolunteerSkillTag) {
    setActiveTags((current) =>
      current.includes(tag)
        ? current.filter((entry) => entry !== tag)
        : [...current, tag],
    );
  }

  function clearFilters() {
    setActiveTags([]);
  }

  const filteredVolunteers = useMemo(() => {
    if (activeTags.length === 0) {
      return volunteers;
    }

    return volunteers.filter((volunteer) => {
      const tags = volunteer.skillTags ?? [];
      return activeTags.some((activeTag) => tags.includes(activeTag));
    });
  }, [volunteers, activeTags]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const tag of ALL_SKILL_TAGS) {
      counts[tag] = volunteers.filter((v) =>
        (v.skillTags ?? []).includes(tag),
      ).length;
    }

    return counts;
  }, [volunteers]);

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-border bg-white/85 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/65">
              Filter by skill tag
            </p>
            <p className="mt-1 text-sm leading-6 text-command-soft/75">
              Filter volunteers by professional qualifications.
            </p>
          </div>
          {activeTags.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_SKILL_TAGS.map((tag) => {
            const isActive = activeTags.includes(tag);
            const count = tagCounts[tag] ?? 0;

            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "border-command bg-command text-white shadow-[0_4px_12px_rgba(17,36,58,0.18)]"
                    : count > 0
                      ? "border-border bg-white/80 text-command hover:border-command/35"
                      : "border-border/50 bg-mist/20 text-command-soft/50"
                }`}
              >
                <span className="capitalize">
                  {VOLUNTEER_SKILL_TAG_LABELS[tag]}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-command/8 text-command-soft/70"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-command">
          {filteredVolunteers.length} volunteer
          {filteredVolunteers.length !== 1 ? "s" : ""} matched
          {activeTags.length > 0 ? ` for ${activeTags.length} tag filter${activeTags.length > 1 ? "s" : ""}` : ""}
        </p>
        {onSendNotification && filteredVolunteers.length > 0 && activeTags.length > 0 ? (
          <Button
            type="button"
            size="sm"
            onClick={() => onSendNotification(filteredVolunteers, activeTags)}
          >
            Notify {filteredVolunteers.length} volunteer
            {filteredVolunteers.length !== 1 ? "s" : ""}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filteredVolunteers.map((vol) => (
          <div
            key={vol.id}
            className="rounded-[24px] border border-border bg-white/85 p-4 shadow-[0_12px_24px_rgba(17,36,58,0.06)]"
          >
            <p className="text-lg font-semibold text-command">{vol.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {vol.skills.map((skill) => (
                <Badge key={skill} tone="neutral" caps={false}>
                  {skill}
                </Badge>
              ))}
              {vol.assets?.map((asset) => (
                <Badge key={asset} tone="warn" caps={false}>
                  {asset}
                </Badge>
              ))}
            </div>
            {vol.skillTags && vol.skillTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {vol.skillTags.map((tag) => (
                  <Badge
                    key={tag}
                    tone={activeTags.includes(tag) ? "safe" : "info"}
                    caps={false}
                  >
                    {VOLUNTEER_SKILL_TAG_LABELS[tag]}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {filteredVolunteers.length === 0 ? (
          <p className="text-sm text-command-soft/78 lg:col-span-2 xl:col-span-3">
            {activeTags.length > 0
              ? "No volunteers match the selected skill tags."
              : "No volunteers currently assigned."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
