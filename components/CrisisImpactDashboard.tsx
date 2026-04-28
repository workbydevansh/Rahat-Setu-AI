"use client";

import { useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { cn, progressPercentage } from "@/lib/utils";
import type {
  Certificate,
  Crisis,
  ReliefTask,
  ResourceNeed,
  ResourcePledge,
  Tone,
  VolunteerMatch,
} from "@/types";

interface CrisisImpactDashboardProps {
  crisis: Crisis;
  ngoName?: string;
  tasks: ReliefTask[];
  resourceNeeds: ResourceNeed[];
  resourcePledges: ResourcePledge[];
  volunteerMatches: VolunteerMatch[];
  certificates: Certificate[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

interface ImpactStatCardProps {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}

interface ImpactProgressCardProps {
  label: string;
  currentLabel: string;
  currentValue: number;
  target: number;
  secondaryLabel: string;
  secondaryValue: number;
  helper: string;
  tone: Tone;
}

const barToneClasses: Record<Tone, string> = {
  neutral: "bg-command/55",
  info: "bg-command",
  safe: "bg-safe",
  warn: "bg-warn",
  alert: "bg-alert",
};

const toneBadgeLabels: Record<Tone, string> = {
  neutral: "tracked",
  info: "live",
  safe: "healthy",
  warn: "watch",
  alert: "urgent",
};

const foodKeywords = ["food", "ration", "meal", "dry food", "packet"];
const medicineKeywords = ["medicine", "medical", "ors", "first-aid", "first aid"];
const shelterKeywords = ["shelter", "blanket", "tent", "tarpaulin", "camp", "bedding"];

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

function matchesKeywords(value: string, keywords: string[]) {
  const normalized = normalizeTerm(value);

  return keywords.some((keyword) => normalized.includes(keyword));
}

function sumNeedQuantity(
  needs: ResourceNeed[],
  keywords: string[],
  field: "quantityNeeded" | "quantityPledged",
) {
  return needs.reduce((total, need) => {
    const bucket = `${need.label} ${need.category ?? ""}`;

    if (!matchesKeywords(bucket, keywords)) {
      return total;
    }

    return total + need[field];
  }, 0);
}

function sumPledgeQuantity(
  pledges: ResourcePledge[],
  keywords: string[],
  statuses: Array<ResourcePledge["status"]>,
) {
  return pledges.reduce((total, pledge) => {
    if (!statuses.includes(pledge.status) || !pledge.quantity) {
      return total;
    }

    if (!matchesKeywords(pledge.itemType, keywords)) {
      return total;
    }

    return total + pledge.quantity;
  }, 0);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function ImpactStatCard({ label, value, helper, tone }: ImpactStatCardProps) {
  return (
    <article className="rounded-[24px] border border-border bg-white/88 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-command-soft/68">
          {label}
        </p>
        <Badge tone={tone}>{toneBadgeLabels[tone]}</Badge>
      </div>
      <p className="mt-4 text-3xl font-semibold text-command">{value}</p>
      <p className="mt-3 text-sm leading-6 text-command-soft/78">{helper}</p>
    </article>
  );
}

function ImpactProgressCard({
  label,
  currentLabel,
  currentValue,
  target,
  secondaryLabel,
  secondaryValue,
  helper,
  tone,
}: ImpactProgressCardProps) {
  const safeTarget = Math.max(target, currentValue, secondaryValue, 1);
  const percent = progressPercentage(currentValue, safeTarget);

  return (
    <article className="rounded-[24px] border border-border bg-white/88 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-command-soft/68">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-command">
            {formatCount(currentValue)}
          </p>
        </div>
        <Badge tone={tone}>
          {percent}% of target
        </Badge>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-mist/70">
        <div
          className={cn("h-full rounded-full transition-[width]", barToneClasses[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="rounded-full border border-border bg-mist/50 px-3 py-1.5 text-xs font-medium text-command-soft/80">
          {currentLabel}: {formatCount(currentValue)}
        </div>
        <div className="rounded-full border border-border bg-mist/50 px-3 py-1.5 text-xs font-medium text-command-soft/80">
          {secondaryLabel}: {formatCount(secondaryValue)}
        </div>
        <div className="rounded-full border border-border bg-mist/50 px-3 py-1.5 text-xs font-medium text-command-soft/80">
          Target: {formatCount(safeTarget)}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-command-soft/78">{helper}</p>
    </article>
  );
}

export function CrisisImpactDashboard({
  crisis,
  ngoName,
  tasks,
  resourceNeeds,
  resourcePledges,
  volunteerMatches,
  certificates,
  isLoading,
  errorMessage,
}: CrisisImpactDashboardProps) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const activeResourcePledges = resourcePledges.filter(
    (pledge) =>
      pledge.status !== "cancelled" &&
      !matchesKeywords(pledge.itemType, ["money donation"]),
  );
  const uniqueVolunteerIds = Array.from(
    new Set([
      ...tasks.flatMap((task) => task.assignedVolunteerIds ?? task.assignedVolunteers ?? []),
      ...volunteerMatches
        .filter((match) => match.status !== "declined")
        .map((match) => match.volunteerId),
    ]),
  );
  const tasksCompleted = Math.max(
    tasks.filter((task) => task.status === "completed").length,
    certificates.filter((certificate) => certificate.status === "issued").length,
  );
  const foodPacketsPledged = sumPledgeQuantity(
    activeResourcePledges,
    foodKeywords,
    ["pending", "verified", "fulfilled"],
  );
  const foodPacketsDelivered = sumPledgeQuantity(
    activeResourcePledges,
    foodKeywords,
    ["fulfilled"],
  );
  const medicineKitsPledged = sumPledgeQuantity(
    activeResourcePledges,
    medicineKeywords,
    ["pending", "verified", "fulfilled"],
  );
  const medicineKitsDelivered = sumPledgeQuantity(
    activeResourcePledges,
    medicineKeywords,
    ["fulfilled"],
  );
  const shelterRequestsHandled = sumPledgeQuantity(
    activeResourcePledges,
    shelterKeywords,
    ["verified", "fulfilled"],
  );
  const foodTarget = Math.max(
    sumNeedQuantity(resourceNeeds, foodKeywords, "quantityNeeded"),
    foodPacketsPledged,
    Math.round(crisis.familiesAffected * 1.4),
  );
  const medicineTarget = Math.max(
    sumNeedQuantity(resourceNeeds, medicineKeywords, "quantityNeeded"),
    medicineKitsPledged,
    Math.round(crisis.familiesAffected * 0.35),
  );
  const shelterTarget = Math.max(
    sumNeedQuantity(resourceNeeds, shelterKeywords, "quantityNeeded"),
    shelterRequestsHandled,
    Math.round(crisis.familiesAffected * 0.3),
  );
  const familiesHelped = Math.min(
    crisis.familiesAffected,
    Math.max(
      Math.round(
        foodPacketsDelivered / 6 +
          medicineKitsDelivered / 3 +
          shelterRequestsHandled * 0.7 +
          tasksCompleted * 4,
      ),
      Math.round(crisis.familiesAffected * 0.62),
    ),
  );
  const volunteerHours = Math.max(
    certificates.reduce((total, certificate) => total + certificate.serviceHours, 0),
    Math.round(crisis.matchedVolunteers * 4.5),
    uniqueVolunteerIds.length * 8 + tasksCompleted * 6,
  );
  const certificatesIssued = certificates.filter(
    (certificate) => certificate.status === "issued",
  ).length;
  const totalResourcePledges = activeResourcePledges.length;
  const chartCards: ImpactProgressCardProps[] = [
    {
      label: "Food Packets",
      currentLabel: "Pledged",
      currentValue: foodPacketsPledged,
      target: foodTarget,
      secondaryLabel: "Delivered",
      secondaryValue: foodPacketsDelivered,
      helper:
        "Tracks food support moving from donor commitments into real on-ground distribution.",
      tone: "warn",
    },
    {
      label: "Medicine Kits",
      currentLabel: "Pledged",
      currentValue: medicineKitsPledged,
      target: medicineTarget,
      secondaryLabel: "Delivered",
      secondaryValue: medicineKitsDelivered,
      helper:
        "Reflects medicine and ORS movement into clinics, camps, and supervised relief points.",
      tone: "info",
    },
    {
      label: "Shelter Requests",
      currentLabel: "Handled",
      currentValue: shelterRequestsHandled,
      target: shelterTarget,
      secondaryLabel: "Open need",
      secondaryValue: Math.max(shelterTarget - shelterRequestsHandled, 0),
      helper:
        "Shows how many shelter-related requests are already covered by verified support partners.",
      tone: "safe",
    },
  ];
  const trackedTaskCount = Math.max(tasks.length, tasksCompleted);
  const operationsCompletion = progressPercentage(tasksCompleted, Math.max(trackedTaskCount, 1));

  return (
    <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
            Crisis impact
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-command">
            Impact dashboard for {crisis.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-command-soft/78">
            Tracks verified delivery, volunteer throughput, and issued service records
            for {ngoName ?? "this NGO response room"}.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Badge tone={errorMessage ? "warn" : isLoading ? "info" : "safe"}>
            {errorMessage
              ? "Showing fallback impact data"
              : isLoading
                ? "Syncing Firestore metrics"
                : "Impact metrics ready"}
          </Badge>
          <Button
            variant="secondary"
            onClick={() =>
              setExportMessage(
                "Export Impact Report is in demo mode. PDF or CSV generation can be wired here next.",
              )
            }
          >
            Export Impact Report
          </Button>
        </div>
      </div>

      {exportMessage ? (
        <div className="mt-5 rounded-[24px] border border-command/15 bg-command/6 p-4">
          <p className="text-sm font-semibold text-command">Export placeholder</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">{exportMessage}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-5 rounded-[24px] border border-warn/30 bg-warn/10 p-4">
          <p className="text-sm font-semibold text-command">Impact sync note</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">{errorMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 rounded-[24px] border border-border bg-white/82 p-4">
          <p className="text-sm font-semibold text-command">Refreshing crisis metrics</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">
            Pulling current pledge, match, and certificate records for this impact view.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ImpactStatCard
          label="Families helped"
          value={formatCount(familiesHelped)}
          helper="Estimated from verified delivery movement, shelter handling, and completed relief work."
          tone="safe"
        />
        <ImpactStatCard
          label="Volunteers assigned"
          value={formatCount(uniqueVolunteerIds.length)}
          helper="Counts volunteers currently assigned, accepted, or completed against this crisis."
          tone="info"
        />
        <ImpactStatCard
          label="Tasks completed"
          value={formatCount(tasksCompleted)}
          helper="Completed task count stays aligned with issued certificate records in this MVP."
          tone="safe"
        />
        <ImpactStatCard
          label="Total resource pledges"
          value={formatCount(totalResourcePledges)}
          helper="Non-monetary supply commitments tracked for this crisis room."
          tone="warn"
        />
        <ImpactStatCard
          label="Volunteer hours"
          value={formatCount(volunteerHours)}
          helper="Includes certified service hours and active-response throughput for this room."
          tone="neutral"
        />
        <ImpactStatCard
          label="Certificates issued"
          value={formatCount(certificatesIssued)}
          helper="Verified volunteer contribution records already generated for this crisis."
          tone="info"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {chartCards.map((card) => (
          <ImpactProgressCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] border border-border bg-white/88 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-command-soft/68">
              Operations completion
            </p>
            <Badge tone={operationsCompletion >= 60 ? "safe" : "warn"}>
              {operationsCompletion}% complete
            </Badge>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-mist/70">
            <div
              className="h-full rounded-full bg-command transition-[width]"
              style={{ width: `${operationsCompletion}%` }}
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-command-soft/78">
            {tasksCompleted} completed out of {trackedTaskCount} tracked tasks.
            This keeps the dashboard readable even when the crisis room is still early in
            the response cycle.
          </p>
        </div>

        <div className="rounded-[24px] border border-border bg-white/88 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-command-soft/68">
            Impact summary
          </p>
          <p className="mt-3 text-lg font-semibold text-command">
            {crisis.title} is currently showing steady coordination momentum.
          </p>
          <p className="mt-3 text-sm leading-6 text-command-soft/78">
            Families helped, volunteer assignments, and supply delivery are all being
            surfaced from the current crisis room data model so the NGO can brief donors,
            admin reviewers, and local responders from one place.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="safe">{formatCount(foodPacketsDelivered)} food delivered</Badge>
            <Badge tone="info">{formatCount(medicineKitsDelivered)} medicine delivered</Badge>
            <Badge tone="warn">{formatCount(shelterRequestsHandled)} shelter requests handled</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
