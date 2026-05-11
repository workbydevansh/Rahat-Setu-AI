"use client";

import { useMemo } from "react";
import {
  VOLUNTEER_SKILL_TAG_LABELS,
  type VolunteerSkillTag,
} from "@/types";

const ALL_SKILL_TAGS = Object.keys(VOLUNTEER_SKILL_TAG_LABELS) as VolunteerSkillTag[];

interface SkillTagSelectorProps {
  selected: VolunteerSkillTag[];
  onChange: (tags: VolunteerSkillTag[]) => void;
  label?: string;
  maxTags?: number;
  className?: string;
}

export function SkillTagSelector({
  selected,
  onChange,
  label = "Skill tags",
  maxTags = 6,
  className = "",
}: SkillTagSelectorProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggleTag(tag: VolunteerSkillTag) {
    if (selectedSet.has(tag)) {
      onChange(selected.filter((entry) => entry !== tag));
    } else if (selected.length < maxTags) {
      onChange([...selected, tag]);
    }
  }

  return (
    <div className={className}>
      <p className="text-sm font-medium text-command">{label}</p>
      <p className="mt-1 text-xs leading-5 text-command-soft/70">
        Select up to {maxTags} professional skill tags for better crisis matching.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {ALL_SKILL_TAGS.map((tag) => {
          const isSelected = selectedSet.has(tag);
          const isDisabled = !isSelected && selected.length >= maxTags;

          return (
            <button
              key={tag}
              type="button"
              disabled={isDisabled}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium capitalize transition ${
                isSelected
                  ? "border-command bg-command text-white shadow-[0_4px_12px_rgba(17,36,58,0.18)]"
                  : isDisabled
                    ? "cursor-not-allowed border-border/50 bg-mist/20 text-command-soft/40"
                    : "border-border bg-white/80 text-command hover:border-command/35 hover:shadow-[0_2px_8px_rgba(17,36,58,0.08)]"
              }`}
              aria-pressed={isSelected}
            >
              {VOLUNTEER_SKILL_TAG_LABELS[tag]}
            </button>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <div className="mt-3 rounded-[20px] border border-safe/20 bg-safe/6 px-4 py-3">
          <p className="text-xs font-semibold text-command-soft/80">
            {selected.length}/{maxTags} selected
          </p>
          <p className="mt-1 text-sm leading-6 text-command-soft/75">
            {selected.map((tag) => VOLUNTEER_SKILL_TAG_LABELS[tag]).join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
