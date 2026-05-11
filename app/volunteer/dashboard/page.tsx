"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CrisisCard } from "@/components/CrisisCard";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import { StatCard } from "@/components/StatCard";
import { TaskCard } from "@/components/TaskCard";
import { useToast } from "@/components/ToastProvider";
import { VolunteerCard } from "@/components/VolunteerCard";
import {
  activeCrises,
  crisisMapMarkers,
  getCertificatesByVolunteerId,
  getTaskById,
  ngoRecentMatches,
  tasks as mockTasks,
} from "@/data/mock-data";
import {
  getAllCrises,
  getAllTasks,
  getCertificatesForVolunteer,
  getVolunteerMatchesForVolunteer,
  updateVolunteerMatchStatus,
} from "@/lib/firestore";
import { subscribeToLocalDatabaseChanges } from "@/lib/local-database";
import {
  loadVolunteerProfileSource,
  saveVolunteerProfileSource,
  type VolunteerProfileSource,
} from "@/lib/volunteer-profile";
import { distanceBetweenLocations, formatAvailabilityStatus } from "@/lib/utils";
import type {
  Certificate,
  Crisis,
  DashboardStat,
  ReliefTask,
  VolunteerMatch,
  VolunteerProfile,
} from "@/types";

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

function buildLocalTaskForMatchResponse(
  task: ReliefTask,
  volunteerId: string,
  status: "accepted" | "declined",
): ReliefTask {
  const currentAssignedVolunteerIds = [
    ...(task.assignedVolunteerIds ?? []),
    ...((task.assignedVolunteers ?? []) as string[]),
  ].filter(Boolean);
  const nextAssignedVolunteerIds =
    status === "accepted"
      ? Array.from(new Set([...currentAssignedVolunteerIds, volunteerId]))
      : currentAssignedVolunteerIds.filter((id) => id !== volunteerId);

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
          : nextAssignedVolunteerIds.length > 0
            ? "assigned"
            : "open",
    updatedAt: new Date().toISOString(),
  };
}

function getAssignedVolunteerIds(task: ReliefTask) {
  return Array.from(
    new Set([
      ...(task.assignedVolunteerIds ?? []),
      ...((task.assignedVolunteers ?? []) as string[]),
    ].filter(Boolean)),
  );
}

function canAcceptTaskFromDashboard(task: ReliefTask, volunteerId: string) {
  if (task.status === "completed" || task.status === "cancelled") {
    return false;
  }

  const assignedVolunteerIds = getAssignedVolunteerIds(task);

  if (assignedVolunteerIds.includes(volunteerId)) {
    return false;
  }

  return task.assignedCount < task.volunteersNeeded;
}

function getDashboardAcceptLabel(task: ReliefTask, volunteerId: string) {
  if (task.status === "completed" || task.status === "cancelled") {
    return "Closed";
  }

  if (getAssignedVolunteerIds(task).includes(volunteerId)) {
    return "Already assigned";
  }

  if (task.assignedCount >= task.volunteersNeeded) {
    return "Task full";
  }

  return "Accept task";
}

function buildDashboardVolunteerMatch(
  task: ReliefTask,
  volunteerProfile: VolunteerProfile,
): VolunteerMatch {
  const now = new Date().toISOString();
  const distanceKm = distanceBetweenLocations(volunteerProfile.location, task.location);
  const reasons = [
    distanceKm !== null
      ? `${distanceKm.toFixed(1)} km away`
      : `Near ${task.location.city ?? task.location.address}`,
    "Accepted from volunteer dashboard",
    formatAvailabilityStatus(volunteerProfile.availability),
  ];

  if (volunteerProfile.verified) {
    reasons.push("Verified volunteer");
  }

  return {
    id: `${task.id}_${volunteerProfile.id}`,
    crisisId: task.crisisId,
    taskId: task.id,
    volunteerId: volunteerProfile.id,
    score: 75,
    reasons,
    distanceKm: distanceKm ?? undefined,
    location: task.location,
    createdAt: now,
    updatedAt: now,
    status: "assigned",
    verified: volunteerProfile.verified,
  };
}

export default function VolunteerDashboardPage() {
  const { pushToast } = useToast();
  const [profileSource, setProfileSource] = useState<VolunteerProfileSource | null>(null);
  const [crisisRecords, setCrisisRecords] = useState<Crisis[]>([]);
  const [firestoreTasks, setFirestoreTasks] = useState<ReliefTask[]>([]);
  const [volunteerMatches, setVolunteerMatches] = useState<VolunteerMatch[]>([]);
  const [certificateRecords, setCertificateRecords] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingEmergency, setIsTogglingEmergency] = useState(false);
  const [isRespondingMatchId, setIsRespondingMatchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard(showLoading = false) {
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
        const [
          crisesResult,
          tasksResult,
          matchesResult,
          certificatesResult,
        ] = await Promise.allSettled([
          getAllCrises(),
          getAllTasks(),
          getVolunteerMatchesForVolunteer(volunteerId),
          getCertificatesForVolunteer(volunteerId),
        ]);

        if (!isActive) {
          return;
        }

        setCrisisRecords(crisesResult.status === "fulfilled" ? crisesResult.value : []);
        setFirestoreTasks(tasksResult.status === "fulfilled" ? tasksResult.value : []);
        setVolunteerMatches(matchesResult.status === "fulfilled" ? matchesResult.value : []);
        setCertificateRecords(
          certificatesResult.status === "fulfilled" ? certificatesResult.value : [],
        );

        if (
          crisesResult.status === "rejected" &&
          tasksResult.status === "rejected" &&
          matchesResult.status === "rejected" &&
          certificatesResult.status === "rejected"
        ) {
          setActionMessage(
            "Firestore is unavailable, so the volunteer workflow is running in demo mode for this session.",
          );
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load the volunteer dashboard right now.",
        );
      } finally {
        if (isActive && showLoading) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard(true);
    const unsubscribeDatabase = subscribeToLocalDatabaseChanges(() => {
      void loadDashboard(false);
    });
    const refreshInterval = window.setInterval(() => {
      void loadDashboard(false);
    }, 4000);

    return () => {
      isActive = false;
      unsubscribeDatabase();
      window.clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (actionMessage) {
      pushToast({
        title: "Volunteer workflow updated",
        description: actionMessage,
        tone: "safe",
      });
    }
  }, [actionMessage, pushToast]);

  useEffect(() => {
    if (errorMessage) {
      pushToast({
        title: "Volunteer dashboard warning",
        description: errorMessage,
        tone: "alert",
      });
    }
  }, [errorMessage, pushToast]);

  async function handleEmergencyToggle() {
    if (!profileSource) {
      return;
    }

    setIsTogglingEmergency(true);
    setErrorMessage(null);

    try {
      const nextEmergencyAvailable = !profileSource.volunteerProfile.emergencyAvailable;
      const nextSource = await saveVolunteerProfileSource(profileSource, {
        ...profileSource.volunteerProfile,
        emergencyAvailable: nextEmergencyAvailable,
        updatedAt: new Date().toISOString(),
      });

      setProfileSource(nextSource);
      setActionMessage(
        nextEmergencyAvailable
          ? "Emergency availability enabled. You may now be matched to urgent nearby crises."
          : "Emergency availability disabled. You will only receive standard task requests.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update emergency availability right now.",
      );
    } finally {
      setIsTogglingEmergency(false);
    }
  }

  function applyLocalWorkflowUpdate(updatedMatch: VolunteerMatch, updatedTask: ReliefTask) {
    setVolunteerMatches((current) => mergeById([updatedMatch, ...current]));
    setFirestoreTasks((current) => mergeById([updatedTask, ...current]));
  }

  async function handleMatchResponse(
    match: VolunteerMatch,
    task: ReliefTask,
    status: "accepted" | "declined",
  ) {
    setIsRespondingMatchId(match.id);
    setErrorMessage(null);
    setActionMessage(null);

    const localTask = buildLocalTaskForMatchResponse(task, match.volunteerId, status);
    const localMatch: VolunteerMatch = {
      ...match,
      status,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await updateVolunteerMatchStatus({
        match,
        task,
        status,
      });

      applyLocalWorkflowUpdate(response.match, response.task);
      setActionMessage(
        status === "accepted"
          ? "Task accepted. It has moved into your assigned tasks queue."
          : "Task request declined. It has been removed from your active request list.",
      );
    } catch (error) {
      applyLocalWorkflowUpdate(localMatch, localTask);
      setActionMessage(
        status === "accepted"
          ? "Firestore was unavailable, so the acceptance was saved in demo mode for this session."
          : "Firestore was unavailable, so the decline was recorded in demo mode for this session.",
      );
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsRespondingMatchId(null);
    }
  }

  async function handleNearbyTaskAccept(task: ReliefTask) {
    if (!profileSource) {
      return;
    }

    const volunteerProfile = profileSource.volunteerProfile;

    if (!canAcceptTaskFromDashboard(task, volunteerProfile.id)) {
      setErrorMessage("This task cannot be accepted from the dashboard right now.");
      return;
    }

    await handleMatchResponse(
      buildDashboardVolunteerMatch(task, volunteerProfile),
      task,
      "accepted",
    );
  }

  const dashboardData = useMemo(() => {
    if (!profileSource) {
      return null;
    }

    const volunteerProfile = profileSource.volunteerProfile;
    const currentCrises = mergeById([...crisisRecords, ...activeCrises])
      .filter((crisis) => crisis.status !== "resolved")
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const mergedTasks = mergeById([...firestoreTasks, ...mockTasks]);
    const mockMatches = ngoRecentMatches.filter(
      (match) => match.volunteerId === volunteerProfile.id,
    );
    const mergedMatches = mergeById([...volunteerMatches, ...mockMatches]);
    const mergedCertificates = mergeById([
      ...certificateRecords,
      ...getCertificatesByVolunteerId(volunteerProfile.id),
    ]);
    const taskMap = new Map(mergedTasks.map((task) => [task.id, task]));

    const taskRequests = mergedMatches
      .filter((match) => match.status === "assigned")
      .map((match) => {
        const task = taskMap.get(match.taskId) ?? getTaskById(match.taskId);

        if (!task) {
          return null;
        }

        return { match, task };
      })
      .filter(
        (entry): entry is { match: VolunteerMatch; task: ReliefTask } => Boolean(entry),
      );

    const assignedTasks = mergeById(
      mergedMatches
        .filter((match) => match.status === "accepted")
        .map((match) => taskMap.get(match.taskId) ?? getTaskById(match.taskId))
        .filter((task): task is ReliefTask => Boolean(task))
        .filter((task) => task.status !== "completed" && task.status !== "cancelled"),
    );

    const completedTasks = mergeById(
      mergedMatches
        .filter((match) => match.status === "completed")
        .map((match) => taskMap.get(match.taskId) ?? getTaskById(match.taskId))
        .filter((task): task is ReliefTask => Boolean(task)),
    );

    const linkedTaskIds = new Set(
      mergedMatches
        .filter((match) =>
          ["assigned", "accepted", "completed", "declined"].includes(match.status),
        )
        .map((match) => match.taskId),
    );

    const nearbyTasks = mergedTasks
      .filter((task) => task.status !== "completed" && task.status !== "cancelled")
      .filter((task) => !linkedTaskIds.has(task.id))
      .map((task) => {
        const distanceKm = distanceBetweenLocations(
          volunteerProfile.location,
          task.location,
        );
        const sameCity =
          volunteerProfile.location.city &&
          task.location.city &&
          volunteerProfile.location.city.toLowerCase() ===
            task.location.city.toLowerCase();
        const withinRadius =
          distanceKm !== null &&
          distanceKm <= (volunteerProfile.emergencyRadiusKm ?? 25);
        const urgencyScore =
          task.riskLevel === "green" ? 3 : task.riskLevel === "yellow" ? 2 : 1;

        return {
          task,
          distanceKm,
          sortScore:
            (withinRadius ? 5 : 0) +
            (sameCity ? 3 : 0) +
            (task.status === "open" ? 4 : 1) +
            urgencyScore,
        };
      })
      .sort((left, right) => {
        if (left.sortScore !== right.sortScore) {
          return right.sortScore - left.sortScore;
        }

        if (left.distanceKm === null && right.distanceKm === null) {
          return 0;
        }

        if (left.distanceKm === null) {
          return 1;
        }

        if (right.distanceKm === null) {
          return -1;
        }

        return left.distanceKm - right.distanceKm;
      })
      .map((entry) => entry.task)
      .slice(0, 4);

    const mapTask =
      taskRequests[0]?.task ??
      assignedTasks[0] ??
      nearbyTasks[0] ??
      completedTasks[0] ??
      mockTasks[0];
    const markers =
      crisisMapMarkers[mapTask?.crisisId ?? "kerala-flood-relief"] ??
      crisisMapMarkers["kerala-flood-relief"];

    const stats: DashboardStat[] = [
      {
        label: "Task requests",
        value: String(taskRequests.length),
        change: taskRequests.length > 0 ? "needs response" : "all clear",
        helper: "NGO task requests wait here for your accept or decline response.",
        tone: "warn",
      },
      {
        label: "Assigned tasks",
        value: String(assignedTasks.length),
        change: assignedTasks.length > 0 ? "active" : "none yet",
        helper: "Accepted tasks move here so you can focus on the work already committed.",
        tone: "neutral",
      },
      {
        label: "Completed tasks",
        value: String(completedTasks.length),
        change: `${volunteerProfile.completedTasks ?? completedTasks.length} total`,
        helper: "Completed work feeds verified history and NGO-issued contribution records.",
        tone: "safe",
      },
      {
        label: "Certificates",
        value: String(mergedCertificates.length),
        change: mergedCertificates.length > 0 ? "issued" : "awaiting issue",
        helper: "Certificates appear here automatically after NGO completion and issuance.",
        tone: "info",
      },
    ];

    return {
      volunteerProfile,
      currentCrises,
      taskRequests,
      nearbyTasks,
      assignedTasks,
      completedTasks,
      certificates: mergedCertificates,
      markers,
      stats,
    };
  }, [certificateRecords, crisisRecords, firestoreTasks, profileSource, volunteerMatches]);

  if (isLoading || !dashboardData) {
    return (
      <AppShell
        currentPath="/volunteer/dashboard"
        eyebrow="Volunteer Response"
        title="Loading volunteer dashboard"
        description="Preparing your task requests, profile snapshot, and certificate view."
      >
        <FeedbackPanel
          state="loading"
          title="Loading volunteer dashboard"
          description="Pulling your volunteer dashboard from the active data source."
        />
      </AppShell>
    );
  }

  const {
    volunteerProfile,
    currentCrises,
    taskRequests,
    nearbyTasks,
    assignedTasks,
    completedTasks,
    certificates,
    markers,
    stats,
  } = dashboardData;

  return (
    <AppShell
      currentPath="/volunteer/dashboard"
      eyebrow="Volunteer Response"
      title="Your field-ready dashboard"
      description="Respond to task requests, manage accepted assignments, and track completed work and certificates from one volunteer console."
      actions={
        <>
          <Button
            type="button"
            onClick={handleEmergencyToggle}
            size="lg"
            disabled={isTogglingEmergency}
          >
            {isTogglingEmergency
              ? "Updating..."
              : volunteerProfile.emergencyAvailable
                ? "Emergency availability on"
                : "Emergency availability off"}
          </Button>
          <Button href="/volunteer/profile" variant="secondary" size="lg">
            Edit profile
          </Button>
          <Button href="/volunteer/opportunities" variant="secondary" size="lg">
            Opportunities
          </Button>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
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
          title="Volunteer dashboard warning"
          description={errorMessage}
        />
      ) : null}

      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Current crisis alerts
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-command">
              Crisis rooms visible to volunteers
            </h2>
            <p className="mt-3 text-sm leading-7 text-command-soft/78">
              Newly created NGO crisis rooms appear here automatically so volunteers can monitor active relief needs before tasks are published.
            </p>
          </div>
          <Badge tone="alert" caps={false}>
            {currentCrises.length} active
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
              title="No active crisis rooms"
              description="When an NGO creates a crisis, it will appear here for volunteer responders."
              className="xl:col-span-3"
            />
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Task requests
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Requests waiting for your response
              </h2>
            </div>
            <Badge tone="warn">{taskRequests.length} pending</Badge>
          </div>

          <div className="mt-6 space-y-5">
            {taskRequests.length > 0 ? (
              taskRequests.map(({ match, task }) => (
                <div
                  key={match.id}
                  className="rounded-[28px] border border-border bg-white/82 p-4"
                >
                  <TaskCard task={task} />
                  <div className="mt-4 rounded-[22px] border border-border bg-mist/40 p-4">
                    <p className="text-sm font-semibold text-command">Why you were matched</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.reasons.map((reason) => (
                        <Badge key={reason} tone="neutral">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      onClick={() => handleMatchResponse(match, task, "accepted")}
                      disabled={isRespondingMatchId === match.id}
                    >
                      {isRespondingMatchId === match.id ? "Updating..." : "Accept task"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleMatchResponse(match, task, "declined")}
                      disabled={isRespondingMatchId === match.id}
                    >
                      Decline task
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <FeedbackPanel
                state="empty"
                title="No pending task requests"
                description="New NGO task requests will appear here with accept and decline controls."
                className="rounded-[24px] shadow-none"
              />
            )}
          </div>
        </div>

        <MapPlaceholder
          title="Response radius"
          subtitle="Placeholder map of your active radius, task pins, and nearby coordination points."
          markers={markers}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Nearby tasks
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Opportunities around you
              </h2>
            </div>
            <Badge tone="safe">{volunteerProfile.emergencyRadiusKm ?? 25} km radius</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {nearbyTasks.length > 0 ? (
              nearbyTasks.map((task) => {
                const matchId = `${task.id}_${volunteerProfile.id}`;
                const canAccept = canAcceptTaskFromDashboard(task, volunteerProfile.id);

                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    actions={
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleNearbyTaskAccept(task)}
                          disabled={!canAccept || isRespondingMatchId === matchId}
                        >
                          {isRespondingMatchId === matchId
                            ? "Accepting..."
                            : getDashboardAcceptLabel(task, volunteerProfile.id)}
                        </Button>
                        <Button
                          href="/volunteer/opportunities"
                          variant="secondary"
                          size="sm"
                        >
                          Check fit
                        </Button>
                      </>
                    }
                  />
                );
              })
            ) : (
              <FeedbackPanel
                state="empty"
                title="No nearby tasks"
                description="Widen your emergency radius or switch emergency availability on to surface more response opportunities."
                className="rounded-[24px] shadow-none"
              />
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Assigned tasks
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Current commitments
              </h2>
            </div>
            <Badge tone="info">{assignedTasks.length} active</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {assignedTasks.length > 0 ? (
              assignedTasks.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <FeedbackPanel
                state="empty"
                title="No assigned tasks"
                description="Accepted task requests will appear here once you confirm them."
                className="rounded-[24px] shadow-none"
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Completed tasks
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Service history
              </h2>
            </div>
            <Badge tone="safe">{completedTasks.length} completed</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <TaskCard key={task.id} task={{ ...task, status: "completed" }} />
              ))
            ) : (
              <FeedbackPanel
                state="empty"
                title="No completed tasks yet"
                description="Completed volunteer work will be tracked here for certificates and impact records."
                className="rounded-[24px] shadow-none"
              />
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Certificates
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Issued contribution records
              </h2>
            </div>
            <Badge tone="safe">{certificates.length} issued</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {certificates.length > 0 ? (
              certificates.map((certificate) => (
                <div
                  key={certificate.id}
                  className="rounded-[24px] border border-border bg-white/85 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-command">
                      {certificate.ngoName}
                    </p>
                    <Badge tone="safe">{certificate.serviceHours} hrs</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    Certificate {certificate.certificateNumber} for{" "}
                    {certificate.volunteerName}.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {certificate.crisisTitle} - {certificate.taskTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    Issued on {new Date(certificate.issuedAt).toLocaleDateString("en-IN")}
                  </p>
                  <div className="mt-4">
                    <Button href={`/certificate/${certificate.id}`} variant="secondary" size="sm">
                      Open printable certificate
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <FeedbackPanel
                state="empty"
                title="No certificates yet"
                description="NGO-completed work will surface here automatically as certificate records."
                className="rounded-[24px] shadow-none"
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Profile snapshot
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Current volunteer profile
              </h2>
            </div>
            <Badge tone={volunteerProfile.verified ? "safe" : "warn"}>
              {volunteerProfile.verified ? "verified" : "verification pending"}
            </Badge>
          </div>
          <div className="mt-6">
            <VolunteerCard volunteer={volunteerProfile} />
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-[linear-gradient(145deg,rgba(17,36,58,0.96),rgba(31,64,96,0.95))] p-6 text-white shadow-[0_24px_72px_rgba(17,36,58,0.18)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/60">
                Emergency readiness
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {volunteerProfile.emergencyAvailable ? "Active" : "Standby"}
              </h2>
            </div>
            <Badge tone={volunteerProfile.emergencyAvailable ? "alert" : "neutral"}>
              {volunteerProfile.emergencyAvailable ? "Queue on" : "Queue off"}
            </Badge>
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-sm font-semibold text-white">Availability</p>
              <p className="mt-2 text-sm leading-6 text-white/78">
                {formatAvailabilityStatus(volunteerProfile.availability)} -{" "}
                {volunteerProfile.availableTime}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-sm font-semibold text-white">Response radius</p>
              <p className="mt-2 text-sm leading-6 text-white/78">
                {volunteerProfile.emergencyRadiusKm ?? 25} km around{" "}
                {volunteerProfile.location.address}
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
