"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CrisisCard } from "@/components/CrisisCard";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/components/ToastProvider";
import { activeCrises, getTaskById, ngoRecentMatches, tasks as mockTasks } from "@/data/mock-data";
import {
  subscribeToProfileSession,
  type CurrentProfileSession,
} from "@/lib/auth";
import {
  getAllCrises,
  getAllTasks,
  getVolunteerMatchesForVolunteer,
  updateVolunteerMatchStatus,
} from "@/lib/firestore";
import { subscribeToLocalDatabaseChanges } from "@/lib/local-database";
import {
  calculateAssetScore,
  calculateAvailabilityScore,
  calculateLanguageScore,
  calculateSkillScore,
  calculateVerificationScore,
} from "@/lib/matching";
import {
  loadVolunteerProfileSource,
  saveVolunteerProfileSource,
  volunteerAvailabilityOptions,
  type VolunteerProfileSource,
} from "@/lib/volunteer-profile";
import {
  cn,
  distanceBetweenLocations,
  formatAvailabilityStatus,
  formatLocationLabel,
  riskLevelLabel,
  toneFromRiskLevel,
} from "@/lib/utils";
import type {
  DashboardStat,
  Crisis,
  ReliefTask,
  Tone,
  VolunteerAvailabilityStatus,
  VolunteerMatch,
  VolunteerProfile,
} from "@/types";

type OpportunityState =
  | "eligible"
  | "review"
  | "not_eligible"
  | "accepted"
  | "assigned"
  | "completed"
  | "declined"
  | "closed";

interface VolunteerOpportunity {
  task: ReliefTask;
  match: VolunteerMatch | null;
  state: OpportunityState;
  score: number;
  distanceKm: number | null;
  sameCity: boolean;
  withinRadius: boolean;
  blockers: string[];
  reasons: string[];
  missingSkills: string[];
  missingAssets: string[];
  skillScore: number;
  assetScore: number;
  availabilityScore: number;
  verificationScore: number;
  languageScore: number;
}

const stateMeta: Record<
  OpportunityState,
  { label: string; tone: Tone; actionLabel: string }
> = {
  eligible: {
    label: "Eligible",
    tone: "safe",
    actionLabel: "Accept task",
  },
  review: {
    label: "Needs NGO review",
    tone: "warn",
    actionLabel: "Review needed",
  },
  not_eligible: {
    label: "Not eligible yet",
    tone: "neutral",
    actionLabel: "Not eligible",
  },
  accepted: {
    label: "Accepted",
    tone: "info",
    actionLabel: "Accepted",
  },
  assigned: {
    label: "Assigned to you",
    tone: "warn",
    actionLabel: "Accept task",
  },
  completed: {
    label: "Completed",
    tone: "safe",
    actionLabel: "Completed",
  },
  declined: {
    label: "Declined",
    tone: "neutral",
    actionLabel: "Declined",
  },
  closed: {
    label: "Full",
    tone: "neutral",
    actionLabel: "Full",
  },
};

function mergeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function normalizeValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMissingValues(requiredValues: string[], availableValues: string[]) {
  const availableSet = new Set(availableValues.map(normalizeValue));

  return requiredValues.filter(
    (value) => normalizeValue(value) && !availableSet.has(normalizeValue(value)),
  );
}

function getTaskAssignedVolunteerIds(task: ReliefTask) {
  return Array.from(
    new Set([
      ...(task.assignedVolunteerIds ?? []),
      ...((task.assignedVolunteers ?? []) as string[]),
    ].filter(Boolean)),
  );
}

function buildAcceptedTask(task: ReliefTask, volunteerId: string) {
  const nextAssignedVolunteerIds = Array.from(
    new Set([...getTaskAssignedVolunteerIds(task), volunteerId]),
  );

  return {
    ...task,
    assignedVolunteers: nextAssignedVolunteerIds,
    assignedVolunteerIds: nextAssignedVolunteerIds,
    assignedCount: nextAssignedVolunteerIds.length,
    status:
      task.status === "completed" || task.status === "cancelled"
        ? task.status
        : task.status === "in-progress"
          ? "in-progress"
          : "assigned",
    updatedAt: new Date().toISOString(),
  } satisfies ReliefTask;
}

function getMatchForTask(matches: VolunteerMatch[], taskId: string) {
  return (
    matches.find((match) => match.taskId === taskId && match.status === "accepted") ??
    matches.find((match) => match.taskId === taskId && match.status === "assigned") ??
    matches.find((match) => match.taskId === taskId) ??
    null
  );
}

function getMatchState(match: VolunteerMatch | null): OpportunityState | null {
  if (!match) {
    return null;
  }

  if (match.status === "accepted") {
    return "accepted";
  }

  if (match.status === "assigned") {
    return "assigned";
  }

  if (match.status === "completed") {
    return "completed";
  }

  if (match.status === "declined") {
    return "declined";
  }

  return null;
}

function getDistanceScore(distanceKm: number | null, sameCity: boolean, withinRadius: boolean) {
  if (distanceKm === null) {
    return sameCity ? 0.82 : 0.38;
  }

  if (!withinRadius) {
    return 0.18;
  }

  if (distanceKm <= 5) {
    return 1;
  }

  if (distanceKm <= 15) {
    return 0.86;
  }

  return 0.68;
}

function getSameCity(profile: VolunteerProfile, task: ReliefTask) {
  const volunteerCity = normalizeValue(
    profile.location.city ?? profile.city ?? profile.location.address,
  );
  const taskCity = normalizeValue(task.location.city ?? task.location.address);

  return Boolean(volunteerCity && taskCity && volunteerCity === taskCity);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getOpportunityReasons(
  task: ReliefTask,
  profile: VolunteerProfile,
  opportunity: Pick<
    VolunteerOpportunity,
    | "distanceKm"
    | "sameCity"
    | "skillScore"
    | "assetScore"
    | "availabilityScore"
    | "verificationScore"
    | "languageScore"
  >,
) {
  const reasons: string[] = [];

  if (opportunity.distanceKm !== null) {
    reasons.push(`${opportunity.distanceKm.toFixed(1)} km from your base`);
  } else if (opportunity.sameCity) {
    reasons.push(`Same city: ${formatLocationLabel(task.location)}`);
  } else {
    reasons.push("Distance will improve after coordinates are added");
  }

  reasons.push(`${formatPercent(opportunity.skillScore)} skill match`);
  reasons.push(`${formatPercent(opportunity.assetScore)} asset match`);
  reasons.push(formatAvailabilityStatus(profile.availability));

  if (profile.emergencyAvailable) {
    reasons.push("Availability toggle is on");
  }

  if (opportunity.verificationScore > 0) {
    reasons.push("Verified profile");
  }

  if (opportunity.languageScore > 0) {
    reasons.push(`${formatPercent(opportunity.languageScore)} language fit`);
  }

  return reasons;
}

function evaluateOpportunity(
  task: ReliefTask,
  profile: VolunteerProfile,
  match: VolunteerMatch | null,
): VolunteerOpportunity {
  const radiusKm = profile.emergencyRadiusKm ?? 25;
  const distanceKm = distanceBetweenLocations(profile.location, task.location);
  const sameCity = getSameCity(profile, task);
  const withinRadius = distanceKm === null ? sameCity : distanceKm <= radiusKm;
  const skillScore = calculateSkillScore(task.requiredSkills, profile.skills);
  const assetScore = calculateAssetScore(task.requiredAssets, profile.assets);
  const availabilityScore = calculateAvailabilityScore(task, profile);
  const verificationScore = calculateVerificationScore(profile);
  const languageScore = calculateLanguageScore(task, profile);
  const distanceScore = getDistanceScore(distanceKm, sameCity, withinRadius);
  const score = Math.round(
    (distanceScore * 24 +
      skillScore * 24 +
      assetScore * 18 +
      availabilityScore * 16 +
      verificationScore * 10 +
      languageScore * 8) *
      10,
  ) / 10;
  const missingSkills = getMissingValues(task.requiredSkills, profile.skills);
  const missingAssets = getMissingValues(task.requiredAssets, profile.assets);
  const blockers: string[] = [];
  const assignedVolunteerIds = getTaskAssignedVolunteerIds(task);
  const alreadyAssignedToCurrentVolunteer = assignedVolunteerIds.includes(profile.id);
  const matchState = getMatchState(match);

  if (profile.status !== "active") {
    blockers.push("Profile status is not active yet");
  }

  if (!profile.emergencyAvailable) {
    blockers.push("Turn your availability toggle on");
  }

  if (profile.availability === "unavailable") {
    blockers.push("Set your availability to a response window");
  }

  if (!withinRadius && !sameCity) {
    blockers.push(`Outside your ${radiusKm} km response radius`);
  }

  if (task.riskLevel === "red" && (!profile.verified || !profile.emergencyAvailable)) {
    blockers.push("Red-risk tasks need a verified profile with active availability");
  }

  if (
    task.assignedCount >= task.volunteersNeeded &&
    !alreadyAssignedToCurrentVolunteer &&
    matchState !== "assigned"
  ) {
    blockers.push("This task already has enough volunteers");
  }

  if (task.status === "completed" || task.status === "cancelled") {
    blockers.push(`Task is already ${task.status}`);
  }

  let state: OpportunityState;

  if (matchState) {
    state = matchState;
  } else if (
    task.assignedCount >= task.volunteersNeeded &&
    !alreadyAssignedToCurrentVolunteer
  ) {
    state = "closed";
  } else if (blockers.length > 0) {
    state = "not_eligible";
  } else if (
    score >= 58 &&
    (task.requiredSkills.length === 0 || skillScore >= 0.5) &&
    (task.requiredAssets.length === 0 || assetScore >= 0.5)
  ) {
    state = "eligible";
  } else if (score >= 42) {
    state = "review";
  } else {
    state = "not_eligible";
  }

  return {
    task,
    match,
    state,
    score,
    distanceKm,
    sameCity,
    withinRadius,
    blockers,
    reasons: getOpportunityReasons(task, profile, {
      distanceKm,
      sameCity,
      skillScore,
      assetScore,
      availabilityScore,
      verificationScore,
      languageScore,
    }),
    missingSkills,
    missingAssets,
    skillScore,
    assetScore,
    availabilityScore,
    verificationScore,
    languageScore,
  };
}

function buildOpportunityMatch(
  opportunity: VolunteerOpportunity,
  profile: VolunteerProfile,
): VolunteerMatch {
  const now = new Date().toISOString();

  return {
    id: `${opportunity.task.id}_${profile.id}`,
    crisisId: opportunity.task.crisisId,
    taskId: opportunity.task.id,
    volunteerId: profile.id,
    score: opportunity.score,
    reasons: opportunity.reasons,
    distanceKm: opportunity.distanceKm ?? undefined,
    location: opportunity.task.location,
    createdAt: opportunity.match?.createdAt ?? now,
    updatedAt: now,
    status: "assigned",
    verified: profile.verified,
  };
}

function ProgressBar({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: number;
  tone?: Tone;
}) {
  const barClasses: Record<Tone, string> = {
    neutral: "from-slate-400 to-slate-600",
    info: "from-command to-cyan-600",
    safe: "from-safe to-emerald-400",
    warn: "from-warn to-amber-300",
    alert: "from-alert to-rose-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-command-soft/68">
          {label}
        </p>
        <p className="text-xs font-semibold text-command">{formatPercent(value)}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-command/8">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", barClasses[tone])}
          style={{ width: `${Math.max(6, Math.round(value * 100))}%` }}
        />
      </div>
    </div>
  );
}

function AvailabilityToggle({
  profile,
  disabled,
  onToggle,
}: {
  profile: VolunteerProfile;
  disabled: boolean;
  onToggle: () => void;
}) {
  const isAvailable = Boolean(profile.emergencyAvailable);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isAvailable}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-[28px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
        isAvailable
          ? "border-safe/25 bg-safe/8"
          : "border-border bg-white/78",
      )}
    >
      <span>
        <span className="block text-sm font-semibold text-command">
          {isAvailable ? "Available for dispatch" : "Not available for dispatch"}
        </span>
        <span className="mt-1 block text-sm leading-6 text-command-soft/76">
          {formatAvailabilityStatus(profile.availability)} - radius{" "}
          {profile.emergencyRadiusKm ?? 25} km
        </span>
      </span>
      <span
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition",
          isAvailable ? "bg-safe" : "bg-command-soft/22",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_rgba(17,36,58,0.2)] transition",
            isAvailable ? "left-7" : "left-1",
          )}
        />
      </span>
    </button>
  );
}

function OpportunityCard({
  opportunity,
  isResponding,
  onAccept,
}: {
  opportunity: VolunteerOpportunity;
  isResponding: boolean;
  onAccept: (opportunity: VolunteerOpportunity) => void;
}) {
  const meta = stateMeta[opportunity.state];
  const crisis = activeCrises.find((item) => item.id === opportunity.task.crisisId);
  const canAccept =
    (opportunity.state === "eligible" || opportunity.state === "assigned") &&
    opportunity.blockers.length === 0;

  return (
    <article className="motion-card rounded-[28px] border border-border bg-white/86 p-5 shadow-[0_16px_30px_rgba(23,32,51,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone} caps={false}>
              {meta.label}
            </Badge>
            <Badge tone={toneFromRiskLevel(opportunity.task.riskLevel)} caps={false}>
              {riskLevelLabel(opportunity.task.riskLevel)}
            </Badge>
            <Badge tone={opportunity.withinRadius ? "safe" : "neutral"} caps={false}>
              {opportunity.distanceKm === null
                ? opportunity.sameCity
                  ? "Same city"
                  : "Distance unknown"
                : `${opportunity.distanceKm.toFixed(1)} km away`}
            </Badge>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-command">
            {opportunity.task.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">
            {crisis?.title ?? "Active crisis"} -{" "}
            {opportunity.task.locationLabel ?? opportunity.task.location.address} -{" "}
            {opportunity.task.window}
          </p>
          {opportunity.task.description ? (
            <p className="mt-3 text-sm leading-6 text-command-soft/78">
              {opportunity.task.description}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 rounded-[24px] border border-command/10 bg-command/6 px-5 py-4 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-command-soft/70">
            Fit score
          </p>
          <p className="mt-2 text-3xl font-semibold text-command">
            {Math.round(opportunity.score)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProgressBar label="Skills" value={opportunity.skillScore} tone="safe" />
        <ProgressBar label="Assets" value={opportunity.assetScore} tone="warn" />
        <ProgressBar label="Availability" value={opportunity.availabilityScore} tone="info" />
        <ProgressBar label="Verification" value={opportunity.verificationScore} tone="neutral" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[22px] border border-border bg-mist/28 p-4">
          <p className="text-sm font-semibold text-command">Why it matches</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {opportunity.reasons.slice(0, 6).map((reason) => (
              <Badge key={reason} tone="neutral" caps={false}>
                {reason}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-border bg-white/72 p-4">
          <p className="text-sm font-semibold text-command">
            {opportunity.blockers.length > 0 ? "Eligibility blockers" : "Readiness gaps"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {opportunity.blockers.length > 0 ? (
              opportunity.blockers.map((blocker) => (
                <Badge key={blocker} tone="warn" caps={false}>
                  {blocker}
                </Badge>
              ))
            ) : opportunity.missingSkills.length + opportunity.missingAssets.length > 0 ? (
              [...opportunity.missingSkills, ...opportunity.missingAssets]
                .slice(0, 5)
                .map((gap) => (
                  <Badge key={gap} tone="neutral" caps={false}>
                    Add {gap}
                  </Badge>
                ))
            ) : (
              <Badge tone="safe" caps={false}>
                No major blockers
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-command-soft/78">
          Volunteers needed: {opportunity.task.volunteersNeeded} - assigned{" "}
          {opportunity.task.assignedCount}
        </p>
        <Button
          type="button"
          size="sm"
          disabled={!canAccept || isResponding}
          onClick={() => onAccept(opportunity)}
        >
          {isResponding ? "Accepting..." : meta.actionLabel}
        </Button>
      </div>
    </article>
  );
}

export function VolunteerOpportunitiesView() {
  const { pushToast } = useToast();
  const [sessionReady, setSessionReady] = useState(false);
  const [session, setSession] = useState<CurrentProfileSession | null>(null);
  const [profileSource, setProfileSource] = useState<VolunteerProfileSource | null>(null);
  const [crisisRecords, setCrisisRecords] = useState<Crisis[]>([]);
  const [firestoreTasks, setFirestoreTasks] = useState<ReliefTask[]>([]);
  const [volunteerMatches, setVolunteerMatches] = useState<VolunteerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [respondingTaskId, setRespondingTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToProfileSession((nextSession) => {
      setSession(nextSession);
      setSessionReady(true);
    });
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadPage(showLoading = false) {
      if (showLoading) {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const nextSource = await loadVolunteerProfileSource();

        if (!isActive) {
          return;
        }

        setProfileSource(nextSource);

        const volunteerId = nextSource.volunteerProfile.id;
        const [crisesResult, tasksResult, matchesResult] = await Promise.allSettled([
          getAllCrises(),
          getAllTasks(),
          getVolunteerMatchesForVolunteer(volunteerId),
        ]);

        if (!isActive) {
          return;
        }

        setCrisisRecords(crisesResult.status === "fulfilled" ? crisesResult.value : []);
        setFirestoreTasks(tasksResult.status === "fulfilled" ? tasksResult.value : []);
        setVolunteerMatches(matchesResult.status === "fulfilled" ? matchesResult.value : []);

        if (
          crisesResult.status === "rejected" ||
          tasksResult.status === "rejected" ||
          matchesResult.status === "rejected"
        ) {
          setActionMessage(
            "Some live records were unavailable, so this page is using the local demo database where needed.",
          );
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load volunteer opportunities right now.",
        );
      } finally {
        if (isActive && showLoading) {
          setIsLoading(false);
        }
      }
    }

    loadPage(true);
    const unsubscribeDatabase = subscribeToLocalDatabaseChanges(() => {
      void loadPage(false);
    });
    const refreshInterval = window.setInterval(() => {
      void loadPage(false);
    }, 4000);

    return () => {
      isActive = false;
      unsubscribeDatabase();
      window.clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (errorMessage) {
      pushToast({
        title: "Opportunity warning",
        description: errorMessage,
        tone: "alert",
      });
    }
  }, [errorMessage, pushToast]);

  useEffect(() => {
    if (actionMessage) {
      pushToast({
        title: "Volunteer opportunities updated",
        description: actionMessage,
        tone: "safe",
      });
    }
  }, [actionMessage, pushToast]);

  async function saveProfile(nextProfile: VolunteerProfile, successMessage: string) {
    if (!profileSource) {
      return;
    }

    setIsSavingAvailability(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const nextSource = await saveVolunteerProfileSource(profileSource, {
        ...nextProfile,
        updatedAt: new Date().toISOString(),
      });

      setProfileSource(nextSource);
      setActionMessage(successMessage);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update volunteer availability right now.",
      );
    } finally {
      setIsSavingAvailability(false);
    }
  }

  function handleAvailabilityToggle() {
    if (!profileSource) {
      return;
    }

    const profile = profileSource.volunteerProfile;
    const nextEmergencyAvailable = !profile.emergencyAvailable;

    void saveProfile(
      {
        ...profile,
        emergencyAvailable: nextEmergencyAvailable,
        availability:
          nextEmergencyAvailable && profile.availability === "unavailable"
            ? "available_now"
            : profile.availability,
      },
      nextEmergencyAvailable
        ? "You are now visible for eligible volunteer opportunities."
        : "Your availability toggle is off. Opportunities remain visible, but accepting is paused.",
    );
  }

  function handleAvailabilityStatusChange(status: VolunteerAvailabilityStatus) {
    if (!profileSource) {
      return;
    }

    const profile = profileSource.volunteerProfile;

    void saveProfile(
      {
        ...profile,
        availability: status,
        emergencyAvailable:
          status === "unavailable" ? false : profile.emergencyAvailable,
      },
      `Availability updated to ${formatAvailabilityStatus(status).toLowerCase()}.`,
    );
  }

  function applyAcceptedTask(updatedMatch: VolunteerMatch, updatedTask: ReliefTask) {
    setVolunteerMatches((current) => mergeById([updatedMatch, ...current]));
    setFirestoreTasks((current) => mergeById([updatedTask, ...current]));
  }

  async function handleAcceptOpportunity(opportunity: VolunteerOpportunity) {
    if (!profileSource) {
      return;
    }

    setRespondingTaskId(opportunity.task.id);
    setErrorMessage(null);
    setActionMessage(null);

    const profile = profileSource.volunteerProfile;
    const match = opportunity.match ?? buildOpportunityMatch(opportunity, profile);
    const localTask = buildAcceptedTask(opportunity.task, profile.id);
    const localMatch: VolunteerMatch = {
      ...match,
      status: "accepted",
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await updateVolunteerMatchStatus({
        match,
        task: opportunity.task,
        status: "accepted",
      });

      applyAcceptedTask(response.match, response.task);
      setActionMessage("Task accepted. It now appears in your volunteer commitments.");
    } catch (error) {
      applyAcceptedTask(localMatch, localTask);
      setActionMessage(
        "The task was accepted in local demo mode because the live database was unavailable.",
      );

      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setRespondingTaskId(null);
    }
  }

  const pageData = useMemo(() => {
    if (!profileSource) {
      return null;
    }

    const profile = profileSource.volunteerProfile;
    const currentCrises = mergeById([...crisisRecords, ...activeCrises])
      .filter((crisis) => crisis.status !== "resolved")
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const mergedTasks = mergeById([...firestoreTasks, ...mockTasks]);
    const mockMatches = ngoRecentMatches.filter(
      (match) => match.volunteerId === profile.id,
    );
    const mergedMatches = mergeById([...volunteerMatches, ...mockMatches]);
    const opportunities = mergedTasks
      .filter((task) => task.status !== "cancelled")
      .map((task) => evaluateOpportunity(task, profile, getMatchForTask(mergedMatches, task.id)))
      .sort((left, right) => {
        const stateWeight: Record<OpportunityState, number> = {
          assigned: 7,
          eligible: 6,
          review: 5,
          accepted: 4,
          not_eligible: 3,
          closed: 2,
          declined: 1,
          completed: 0,
        };

        if (stateWeight[left.state] !== stateWeight[right.state]) {
          return stateWeight[right.state] - stateWeight[left.state];
        }

        if (left.withinRadius !== right.withinRadius) {
          return Number(right.withinRadius) - Number(left.withinRadius);
        }

        return right.score - left.score;
      });
    const eligibleCount = opportunities.filter(
      (opportunity) =>
        opportunity.state === "eligible" || opportunity.state === "assigned",
    ).length;
    const acceptedCount = opportunities.filter(
      (opportunity) => opportunity.state === "accepted",
    ).length;
    const reviewCount = opportunities.filter(
      (opportunity) => opportunity.state === "review",
    ).length;
    const nearbyCount = opportunities.filter(
      (opportunity) => opportunity.withinRadius || opportunity.sameCity,
    ).length;
    const stats: DashboardStat[] = [
      {
        label: "Eligible now",
        value: String(eligibleCount),
        change: profile.emergencyAvailable ? "accept ready" : "toggle off",
        helper: "Eligible opportunities pass the current radius, availability, safety, and fit checks.",
        tone: eligibleCount > 0 ? "safe" : "neutral",
      },
      {
        label: "Around me",
        value: String(nearbyCount),
        change: `${profile.emergencyRadiusKm ?? 25} km`,
        helper: "Nearby opportunities include tasks inside your radius or in your registered city.",
        tone: "info",
      },
      {
        label: "Need review",
        value: String(reviewCount),
        change: "NGO gate",
        helper: "Medium-fit opportunities stay visible but are safer with NGO assignment review first.",
        tone: "warn",
      },
      {
        label: "Accepted",
        value: String(acceptedCount),
        change: "commitments",
        helper: "Accepted work is saved to your match history and task assignment record.",
        tone: "neutral",
      },
    ];

    return {
      profile,
      currentCrises,
      opportunities,
      stats,
    };
  }, [crisisRecords, firestoreTasks, profileSource, volunteerMatches]);

  if (isLoading || !pageData || !sessionReady) {
    return (
      <AppShell
        currentPath="/volunteer/opportunities"
        eyebrow="Volunteer Opportunities"
        title="Loading opportunities around you"
        description="Checking your volunteer profile, nearby tasks, eligibility rules, and current assignment history."
      >
        <FeedbackPanel
          state="loading"
          title="Loading opportunity board"
          description="Preparing volunteer opportunities from the active data source."
        />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell
        currentPath="/volunteer/opportunities"
        eyebrow="Volunteer Opportunities"
        title="Sign in as a volunteer"
        description="Volunteer opportunities are tied to your profile, location, skills, assets, and availability status."
        actions={
          <>
            <Button href="/login" size="lg">
              Login
            </Button>
            <Button href="/register" variant="secondary" size="lg">
              Register
            </Button>
          </>
        }
      >
        <FeedbackPanel
          state="empty"
          title="No volunteer session"
          description="After login, this page shows opportunities around you with eligibility and accept controls."
        />
      </AppShell>
    );
  }

  if (session.role !== "volunteer" && session.role !== "admin") {
    return (
      <AppShell
        currentPath="/volunteer/opportunities"
        eyebrow="Volunteer Opportunities"
        title="This page is for volunteer accounts"
        description="Your signed-in role has its own dashboard and action pages, so volunteer-only controls stay hidden."
        actions={
          <Button href={session.dashboardPath} size="lg">
            Open my dashboard
          </Button>
        }
      >
        <FeedbackPanel
          state="empty"
          title="Role-specific page"
          description={`You are signed in as ${session.role}. Volunteer availability and task acceptance controls are only shown for volunteer profiles.`}
        />
      </AppShell>
    );
  }

  const { profile, currentCrises, opportunities, stats } = pageData;
  const visibleOpportunities = opportunities.filter(
    (opportunity) => opportunity.state !== "completed" && opportunity.state !== "declined",
  );

  return (
    <AppShell
      currentPath="/volunteer/opportunities"
      eyebrow="Volunteer Opportunities"
      title="Opportunities around you"
      description="See nearby relief tasks, understand your eligibility, toggle availability, and accept work that matches your response profile."
      actions={
        <>
          <Button
            type="button"
            size="lg"
            onClick={handleAvailabilityToggle}
            disabled={isSavingAvailability}
          >
            {isSavingAvailability
              ? "Updating..."
              : profile.emergencyAvailable
                ? "Availability on"
                : "Availability off"}
          </Button>
          <Button href="/volunteer/profile" variant="secondary" size="lg">
            Edit profile
          </Button>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="surface-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
              Crisis alerts
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Newly opened crisis rooms
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-command-soft/78">
              NGO-created crisis rooms appear here automatically, even before individual tasks are published.
            </p>
          </div>
          <Badge tone="alert" caps={false}>
            {currentCrises.length} current
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {currentCrises.length > 0 ? (
            currentCrises.slice(0, 3).map((crisis) => (
              <CrisisCard key={crisis.id} crisis={crisis} />
            ))
          ) : (
            <FeedbackPanel
              state="empty"
              title="No crisis alerts yet"
              description="When an NGO opens a crisis room, volunteers will see it here."
              className="rounded-[24px] shadow-none xl:col-span-3"
            />
          )}
        </div>
      </section>

      {actionMessage ? (
        <FeedbackPanel
          state="success"
          title="Volunteer workflow update"
          description={actionMessage}
        />
      ) : null}

      {errorMessage ? (
        <FeedbackPanel
          state="error"
          title="Opportunity warning"
          description={errorMessage}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                Availability
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Dispatch readiness
              </h2>
              <p className="mt-3 text-sm leading-7 text-command-soft/78">
                {formatLocationLabel(profile.location)} - {profile.skills.length} skills -{" "}
                {profile.assets.length} assets
              </p>
            </div>
            <Badge tone={profile.verified ? "safe" : "warn"} caps={false}>
              {profile.verified ? "Verified profile" : "Verification pending"}
            </Badge>
          </div>

          <div className="mt-5">
            <AvailabilityToggle
              profile={profile}
              disabled={isSavingAvailability}
              onToggle={handleAvailabilityToggle}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {volunteerAvailabilityOptions.map((option) => {
              const selected = profile.availability === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isSavingAvailability}
                  onClick={() => handleAvailabilityStatusChange(option.value)}
                  className={cn(
                    "rounded-[22px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-command/35 bg-command/8"
                      : "border-border bg-white/72 hover:border-command/25",
                  )}
                >
                  <p className="text-sm font-semibold text-command">{option.label}</p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/76">
                    {option.helper}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="dark-panel rounded-[32px] p-5 text-white sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/62">
                Eligibility model
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Safety-first matching
              </h2>
            </div>
            <Badge tone="info" caps={false}>
              {visibleOpportunities.length} tasks
            </Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Location", `${profile.emergencyRadiusKm ?? 25} km radius plus city fit`],
              ["Skills", profile.skills.length ? profile.skills.join(", ") : "Add skills"],
              ["Assets", profile.assets.length ? profile.assets.join(", ") : "Add assets"],
              ["Safety", profile.verified ? "Verified for high-risk review" : "Green/yellow first"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/10 bg-white/8 p-4"
              >
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-2 text-sm leading-6 text-white/76">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
              Nearby opportunities
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Tasks you can respond to
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-command-soft/78">
              Eligible tasks are sorted first, then review-needed and unavailable tasks so you can see exactly what to improve.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="safe" caps={false}>
              {opportunities.filter((item) => item.state === "eligible").length} eligible
            </Badge>
            <Badge tone="warn" caps={false}>
              {opportunities.filter((item) => item.state === "review").length} review
            </Badge>
            <Badge tone="neutral" caps={false}>
              {opportunities.filter((item) => item.state === "not_eligible").length} locked
            </Badge>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {visibleOpportunities.length > 0 ? (
            visibleOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.task.id}
                opportunity={opportunity}
                isResponding={respondingTaskId === opportunity.task.id}
                onAccept={handleAcceptOpportunity}
              />
            ))
          ) : (
            <FeedbackPanel
              state="empty"
              title="No opportunities available"
              description="New NGO-published tasks will appear here once they are open for volunteer response."
              className="rounded-[24px] shadow-none"
            />
          )}
        </div>
      </section>

      <section className="surface-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
              Accepted history
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Your accepted task links
            </h2>
          </div>
          <Button href="/volunteer/dashboard" variant="secondary" size="sm">
            Volunteer dashboard
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {opportunities
            .filter((opportunity) => opportunity.state === "accepted")
            .slice(0, 6)
            .map((opportunity) => {
              const task = getTaskById(opportunity.task.id) ?? opportunity.task;

              return (
                <div
                  key={`accepted-${opportunity.task.id}`}
                  className="rounded-[24px] border border-border bg-white/78 p-4"
                >
                  <Badge tone="info" caps={false}>
                    Accepted
                  </Badge>
                  <p className="mt-3 text-sm font-semibold text-command">{task.title}</p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {task.locationLabel ?? task.location.address}
                  </p>
                </div>
              );
            })}
          {opportunities.filter((opportunity) => opportunity.state === "accepted").length ===
          0 ? (
            <FeedbackPanel
              state="empty"
              title="No accepted tasks yet"
              description="Accepted opportunities will be saved here and in your volunteer dashboard."
              className="rounded-[24px] shadow-none md:col-span-2 xl:col-span-3"
            />
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
