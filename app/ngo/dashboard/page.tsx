"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CrisisCard } from "@/components/CrisisCard";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/components/ToastProvider";
import {
  subscribeToProfileSession,
  type CurrentProfileSession,
} from "@/lib/auth";
import {
  activeCrises,
  certificates as mockCertificates,
  getNGOProfileByCrisisId,
  ngoImpactHighlights,
  ngoImpactRows,
  ngoRecentMatches,
  resourceNeeds as mockResourceNeeds,
  tasks as mockTasks,
  volunteers as mockVolunteers,
} from "@/data/mock-data";
import {
  createCertificateRecord,
  createResourceAcknowledgementCertificate,
  getAllCertificates,
  getAllCrises,
  getAllResourcePledges,
  getAllResourceNeeds,
  getAllTasks,
  getAllVolunteerMatches,
  getVolunteerProfiles,
  updateCrisisWorkflowStatus,
  updateResourceNeedWorkflowStatus,
  updateTaskWorkflowStatus,
  updateVolunteerMatchStatus,
} from "@/lib/firestore";
import { subscribeToLocalDatabaseChanges } from "@/lib/local-database";
import { toneFromTaskStatus } from "@/lib/utils";
import type {
  Certificate,
  Crisis,
  CrisisStatus,
  DashboardStat,
  ReliefTask,
  ResourceNeed,
  ResourceNeedStatus,
  ResourcePledge,
  TaskStatus,
  VolunteerMatch,
  VolunteerProfile,
} from "@/types";

const ngoTaskStatusOptions: Array<{
  actionLabel: string;
  value: TaskStatus;
}> = [
  { actionLabel: "pending", value: "open" },
  { actionLabel: "in_progress", value: "in-progress" },
  { actionLabel: "completed", value: "completed" },
  { actionLabel: "cancelled", value: "cancelled" },
];

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

function matchTone(status: VolunteerMatch["status"]) {
  if (status === "completed") {
    return "safe" as const;
  }

  if (status === "accepted") {
    return "info" as const;
  }

  if (status === "assigned") {
    return "warn" as const;
  }

  if (status === "declined") {
    return "alert" as const;
  }

  return "neutral" as const;
}

function buildLocalCertificate(
  task: ReliefTask,
  crisis: Crisis,
  volunteer: VolunteerProfile,
  ngoName: string,
) {
  const now = new Date().toISOString();
  const volunteerToken = volunteer.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  const dateToken = now.slice(0, 10).replace(/-/g, "");
  const certificateId = `${dateToken}-${volunteerToken || "VOL"}`;

  return {
    id: `${task.id}_${volunteer.id}`,
    volunteerId: volunteer.id,
    taskId: task.id,
    crisisId: crisis.id,
    volunteerName: volunteer.name,
    ngoName,
    crisisTitle: crisis.title,
    taskTitle: task.title,
    serviceDate: now.slice(0, 10),
    certificateId,
    certificateNumber: certificateId,
    serviceHours: 4,
    verificationQrPlaceholder: `Verification QR placeholder for ${certificateId}`,
    issuedAt: now,
    location: task.location,
    createdAt: now,
    updatedAt: now,
    status: "issued" as const,
    verified: volunteer.verified,
  };
}

function crisisBelongsToSession(
  crisis: Crisis,
  session: CurrentProfileSession | null,
) {
  if (!session || session.role === "admin") {
    return true;
  }

  if (session.role !== "ngo") {
    return false;
  }

  const ngoProfile = session.profile?.ngoProfile;
  const possibleOwners = [
    session.uid,
    session.name,
    session.email,
    ngoProfile?.id,
    ngoProfile?.contactName,
    ngoProfile?.organizationName,
  ].filter(Boolean);

  return possibleOwners.some(
    (owner) => crisis.createdBy === owner || crisis.contactPerson === owner,
  );
}

function isActiveCrisisStatus(status: Crisis["status"]) {
  return status !== "resolved";
}

function isOpenResourceNeed(status: ResourceNeedStatus) {
  return status === "open" || status === "partially-fulfilled";
}

function getNgoNameForCrisis(crisis: Crisis) {
  return (
    getNGOProfileByCrisisId(crisis.id)?.organizationName ||
    `${crisis.contactPerson} response team`
  );
}

export default function NGODashboardPage() {
  const { pushToast } = useToast();
  const [currentSession, setCurrentSession] = useState<CurrentProfileSession | null>(null);
  const [crisisRecords, setCrisisRecords] = useState<Crisis[]>([]);
  const [taskRecords, setTaskRecords] = useState<ReliefTask[]>([]);
  const [matchRecords, setMatchRecords] = useState<VolunteerMatch[]>([]);
  const [volunteerRecords, setVolunteerRecords] = useState<VolunteerProfile[]>([]);
  const [resourceNeedRecords, setResourceNeedRecords] = useState<ResourceNeed[]>([]);
  const [resourcePledgeRecords, setResourcePledgeRecords] = useState<ResourcePledge[]>([]);
  const [certificateRecords, setCertificateRecords] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState<string | null>(null);
  const [isUpdatingResourceNeedId, setIsUpdatingResourceNeedId] = useState<string | null>(null);
  const [isResolvingCrisisId, setIsResolvingCrisisId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToProfileSession(setCurrentSession);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard(showLoading = false) {
      if (showLoading) {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const [
        crisesResult,
        tasksResult,
        matchesResult,
        volunteersResult,
        resourcesResult,
        pledgesResult,
        certificatesResult,
      ] = await Promise.allSettled([
        getAllCrises(),
        getAllTasks(),
        getAllVolunteerMatches(),
        getVolunteerProfiles(),
        getAllResourceNeeds(),
        getAllResourcePledges(),
        getAllCertificates(),
      ]);

      if (!isActive) {
        return;
      }

      setCrisisRecords(crisesResult.status === "fulfilled" ? crisesResult.value : []);
      setTaskRecords(tasksResult.status === "fulfilled" ? tasksResult.value : []);
      setMatchRecords(matchesResult.status === "fulfilled" ? matchesResult.value : []);
      setVolunteerRecords(
        volunteersResult.status === "fulfilled" ? volunteersResult.value : [],
      );
      setResourceNeedRecords(
        resourcesResult.status === "fulfilled" ? resourcesResult.value : [],
      );
      setResourcePledgeRecords(
        pledgesResult.status === "fulfilled" ? pledgesResult.value : [],
      );
      setCertificateRecords(
        certificatesResult.status === "fulfilled" ? certificatesResult.value : [],
      );

      if (
        crisesResult.status === "rejected" &&
        tasksResult.status === "rejected" &&
        matchesResult.status === "rejected" &&
        volunteersResult.status === "rejected" &&
        resourcesResult.status === "rejected" &&
        pledgesResult.status === "rejected" &&
        certificatesResult.status === "rejected"
      ) {
        setStatusMessage(
          "Firestore is unavailable, so the NGO workflow controls are running in demo mode for this session.",
        );
      }

      if (showLoading) {
        setIsLoading(false);
      }
    }

    loadDashboard(true).catch((error) => {
      if (!isActive) {
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
        : "Unable to load the NGO dashboard right now.",
      );
      setIsLoading(false);
    });

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
    if (statusMessage) {
      pushToast({
        title: "NGO workflow updated",
        description: statusMessage,
        tone: "safe",
      });
    }
  }, [pushToast, statusMessage]);

  useEffect(() => {
    if (errorMessage) {
      pushToast({
        title: "NGO dashboard warning",
        description: errorMessage,
        tone: "alert",
      });
    }
  }, [errorMessage, pushToast]);

  const dashboardData = useMemo(() => {
    const allCrises = mergeById([...crisisRecords, ...activeCrises]).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
    const visibleCrises = allCrises.filter((crisis) =>
      crisisBelongsToSession(crisis, currentSession),
    );
    const visibleCrisisIds = new Set(visibleCrises.map((crisis) => crisis.id));
    const tasks = mergeById([...taskRecords, ...mockTasks])
      .filter((task) => visibleCrisisIds.has(task.crisisId))
      .sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
    const matches = mergeById([...matchRecords, ...ngoRecentMatches])
      .filter((match) => visibleCrisisIds.has(match.crisisId))
      .sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
    const volunteers = mergeById([...volunteerRecords, ...mockVolunteers]).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    const resourceNeeds = mergeById([
      ...resourceNeedRecords,
      ...mockResourceNeeds,
    ])
      .filter((need) => visibleCrisisIds.has(need.crisisId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const resourcePledges = mergeById(resourcePledgeRecords)
      .filter((pledge) => visibleCrisisIds.has(pledge.crisisId))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const certificates = mergeById([
      ...certificateRecords,
      ...mockCertificates,
    ])
      .filter((certificate) => visibleCrisisIds.has(certificate.crisisId))
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));

    const activeResourceNeeds = resourceNeeds.filter((need) =>
      isOpenResourceNeed(need.status),
    );
    const completedResourceNeeds = resourceNeeds.filter(
      (need) => !isOpenResourceNeed(need.status),
    );
    const crisisById = new Map(visibleCrises.map((crisis) => [crisis.id, crisis]));
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const volunteerById = new Map(volunteers.map((volunteer) => [volunteer.id, volunteer]));

    const acceptedVolunteerRows = matches
      .filter((match) => match.status === "accepted" || match.status === "assigned")
      .map((match) => {
        const task = taskById.get(match.taskId);
        const crisis = crisisById.get(match.crisisId);
        const volunteer = volunteerById.get(match.volunteerId);

        if (!task || !crisis || !volunteer) {
          return null;
        }

        return { match, task, crisis, volunteer };
      })
      .filter(
        (
          row,
        ): row is {
          match: VolunteerMatch;
          task: ReliefTask;
          crisis: Crisis;
          volunteer: VolunteerProfile;
        } => Boolean(row),
      );
    const activeMembersByCrisis = visibleCrises
      .filter((crisis) => isActiveCrisisStatus(crisis.status))
      .map((crisis) => {
        const crisisTasks = tasks.filter((task) => task.crisisId === crisis.id);
        const activeRows = acceptedVolunteerRows.filter(
          (row) =>
            row.crisis.id === crisis.id &&
            row.task.status !== "completed" &&
            row.task.status !== "cancelled",
        );

        return {
          crisis,
          rows: activeRows,
          openTasks: crisisTasks.filter(
            (task) => task.status !== "completed" && task.status !== "cancelled",
          ).length,
        };
      });

    const stats: DashboardStat[] = [
      {
        label: "Active crises",
        value: String(
          visibleCrises.filter((crisis) => isActiveCrisisStatus(crisis.status)).length,
        ),
        change: "live rooms",
        helper: currentSession?.role === "ngo"
          ? "Current crisis rooms linked to your NGO profile."
          : "Crisis rooms remain visible here while NGOs coordinate tasks and pledges.",
        tone: "warn",
      },
      {
        label: "Open tasks",
        value: String(
          tasks.filter(
            (task) => task.status !== "completed" && task.status !== "cancelled",
          ).length,
        ),
        change: "workflow tracked",
        helper: "Task status now moves cleanly from pending to in-progress to completion.",
        tone: "alert",
      },
      {
        label: "Accepted volunteers",
        value: String(acceptedVolunteerRows.length),
        change: "ready to deploy",
        helper: "These volunteers have accepted assignments and are ready for NGO task-state updates.",
        tone: "safe",
      },
      {
        label: "Resource pledges",
        value: String(activeResourceNeeds.reduce((sum, need) => sum + need.quantityPledged, 0)),
        change: "quantity based",
        helper: "Only open resource needs remain in the active NGO resource board.",
        tone: "neutral",
      },
      {
        label: "Families helped",
        value: String(visibleCrises.reduce((sum, crisis) => sum + crisis.familiesAffected, 0)),
        change: "estimated reach",
        helper: "Families affected across currently loaded crisis rooms.",
        tone: "info",
      },
    ];

    return {
      crises: visibleCrises,
      tasks,
      matches,
      volunteers,
      resourceNeeds,
      activeResourceNeeds,
      completedResourceNeeds,
      resourcePledges,
      certificates,
      acceptedVolunteerRows,
      activeMembersByCrisis,
      crisisById,
      taskById,
      volunteerById,
      stats,
    };
  }, [
    certificateRecords,
    currentSession,
    crisisRecords,
    matchRecords,
    resourcePledgeRecords,
    resourceNeedRecords,
    taskRecords,
    volunteerRecords,
  ]);

  async function handleTaskStatusUpdate(task: ReliefTask, nextStatus: TaskStatus) {
    setIsUpdatingTaskId(task.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const crisis = dashboardData.crisisById.get(task.crisisId);

    if (!crisis) {
      setErrorMessage("The crisis record for this task could not be found.");
      setIsUpdatingTaskId(null);
      return;
    }

    const acceptedMatchesForTask = dashboardData.matches.filter(
      (match) => match.taskId === task.id && match.status === "accepted",
    );
    const acceptedVolunteersForTask = acceptedMatchesForTask
      .map((match) => dashboardData.volunteerById.get(match.volunteerId))
      .filter((volunteer): volunteer is VolunteerProfile => Boolean(volunteer));
    const ngoName =
      getNGOProfileByCrisisId(crisis.id)?.organizationName || `${crisis.contactPerson} response team`;
    const localUpdatedTask: ReliefTask = {
      ...task,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    const localCompletedMatches =
      nextStatus === "completed"
        ? acceptedMatchesForTask.map((match) => ({
            ...match,
            status: "completed" as const,
            updatedAt: new Date().toISOString(),
          }))
        : [];
    const localCertificates =
      nextStatus === "completed"
        ? acceptedVolunteersForTask.map((volunteer) =>
            buildLocalCertificate(task, crisis, volunteer, ngoName),
          )
        : [];

    try {
      const updatedTask = await updateTaskWorkflowStatus(task, nextStatus);
      let nextMatches = matchRecords;
      let nextCertificates = certificateRecords;

      if (nextStatus === "completed") {
        const completedMatches: VolunteerMatch[] = [];
        const issuedCertificates: Certificate[] = [];

        for (const match of acceptedMatchesForTask) {
          const matchResult = await updateVolunteerMatchStatus({
            match,
            task: updatedTask,
            status: "completed",
          });

          completedMatches.push(matchResult.match);

          const volunteer = dashboardData.volunteerById.get(match.volunteerId);

          if (volunteer) {
            const certificate = await createCertificateRecord({
              task: updatedTask,
              crisis,
              volunteer,
              ngoName,
              serviceHours: 4,
            });

            issuedCertificates.push(certificate);
          }
        }

        nextMatches = mergeById([...completedMatches, ...matchRecords]);
        nextCertificates = mergeById([...issuedCertificates, ...certificateRecords]);
      }

      setTaskRecords((current) => mergeById([updatedTask, ...current]));
      setMatchRecords(nextMatches);
      setCertificateRecords(nextCertificates);
      setStatusMessage(
        nextStatus === "completed"
          ? "Task completed and certificate records issued for accepted volunteers."
          : `Task moved to ${nextStatus === "in-progress" ? "in_progress" : nextStatus}.`,
      );
    } catch (error) {
      setTaskRecords((current) => mergeById([localUpdatedTask, ...current]));

      if (nextStatus === "completed") {
        setMatchRecords((current) => mergeById([...localCompletedMatches, ...current]));
        setCertificateRecords((current) => mergeById([...localCertificates, ...current]));
      }

      setStatusMessage(
        nextStatus === "completed"
          ? "Firestore was unavailable, so completion and certificate issuance were recorded in demo mode for this session."
          : `Firestore was unavailable, so the task was moved to ${
              nextStatus === "in-progress" ? "in_progress" : nextStatus
            } in demo mode for this session.`,
      );

      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsUpdatingTaskId(null);
    }
  }

  async function issueVolunteerCertificatesForRows(
    rows: Array<{
      match: VolunteerMatch;
      task: ReliefTask;
      crisis: Crisis;
      volunteer: VolunteerProfile;
    }>,
  ) {
    const issuedCertificates: Certificate[] = [];

    for (const row of rows) {
      const certificate = await createCertificateRecord({
        task: row.task,
        crisis: row.crisis,
        volunteer: row.volunteer,
        ngoName: getNgoNameForCrisis(row.crisis),
        serviceHours: 4,
      });

      issuedCertificates.push(certificate);
    }

    return issuedCertificates;
  }

  async function issueResourceCertificatesForPledges(
    crisis: Crisis,
    resourceNeeds: ResourceNeed[],
    pledges: ResourcePledge[],
  ) {
    const issuedCertificates: Certificate[] = [];
    const needById = new Map(resourceNeeds.map((need) => [need.id, need]));

    for (const pledge of pledges) {
      const resourceNeed = needById.get(pledge.resourceNeedId);

      if (!resourceNeed) {
        continue;
      }

      const certificate = await createResourceAcknowledgementCertificate({
        crisis,
        resourceNeed,
        pledge,
        ngoName: getNgoNameForCrisis(crisis),
      });

      issuedCertificates.push(certificate);
    }

    return issuedCertificates;
  }

  async function handleResourceNeedStatusUpdate(
    resourceNeed: ResourceNeed,
    nextStatus: ResourceNeedStatus,
  ) {
    setIsUpdatingResourceNeedId(resourceNeed.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const crisis = dashboardData.crisisById.get(resourceNeed.crisisId);

    if (!crisis) {
      setErrorMessage("The crisis record for this resource need could not be found.");
      setIsUpdatingResourceNeedId(null);
      return;
    }

    const pledgesForNeed = dashboardData.resourcePledges.filter(
      (pledge) => pledge.resourceNeedId === resourceNeed.id,
    );
    const localUpdatedNeed: ResourceNeed = {
      ...resourceNeed,
      quantityPledged:
        nextStatus === "fulfilled"
          ? Math.max(resourceNeed.quantityPledged, resourceNeed.quantityNeeded)
          : resourceNeed.quantityPledged,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await updateResourceNeedWorkflowStatus(resourceNeed, nextStatus);
      const issuedCertificates =
        nextStatus === "fulfilled" || nextStatus === "closed"
          ? await issueResourceCertificatesForPledges(crisis, [response.resourceNeed], pledgesForNeed)
          : [];

      setResourceNeedRecords((current) =>
        mergeById([response.resourceNeed, ...current]),
      );
      setResourcePledgeRecords((current) =>
        mergeById([...response.resourcePledges, ...current]),
      );
      setCertificateRecords((current) =>
        mergeById([...issuedCertificates, ...current]),
      );
      setStatusMessage(
        `${resourceNeed.label} marked ${nextStatus}. Helper certificates issued for ${issuedCertificates.length} contributor${issuedCertificates.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setResourceNeedRecords((current) => mergeById([localUpdatedNeed, ...current]));
      setStatusMessage(
        `${resourceNeed.label} was marked ${nextStatus} in demo mode for this session.`,
      );

      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsUpdatingResourceNeedId(null);
    }
  }

  async function handleCrisisStatusUpdate(crisis: Crisis, nextStatus: CrisisStatus) {
    setIsResolvingCrisisId(crisis.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const crisisTasks = dashboardData.tasks.filter((task) => task.crisisId === crisis.id);
    const crisisResourceNeeds = dashboardData.resourceNeeds.filter(
      (need) => need.crisisId === crisis.id,
    );
    const crisisPledges = dashboardData.resourcePledges.filter(
      (pledge) => pledge.crisisId === crisis.id,
    );
    const volunteerRows = dashboardData.matches
      .filter(
        (match) =>
          match.crisisId === crisis.id &&
          (match.status === "accepted" ||
            match.status === "assigned" ||
            match.status === "completed"),
      )
      .map((match) => {
        const task = dashboardData.taskById.get(match.taskId);
        const volunteer = dashboardData.volunteerById.get(match.volunteerId);

        if (!task || !volunteer) {
          return null;
        }

        return { match, task, crisis, volunteer };
      })
      .filter(
        (
          row,
        ): row is {
          match: VolunteerMatch;
          task: ReliefTask;
          crisis: Crisis;
          volunteer: VolunteerProfile;
        } => Boolean(row),
      );
    const localResolvedCrisis: Crisis = {
      ...crisis,
      status: nextStatus,
      openTasks: nextStatus === "resolved" ? 0 : crisis.openTasks,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await updateCrisisWorkflowStatus(crisis, nextStatus);
      const [volunteerCertificates, resourceCertificates] =
        nextStatus === "resolved"
          ? await Promise.all([
              issueVolunteerCertificatesForRows(volunteerRows),
              issueResourceCertificatesForPledges(
                response.crisis,
                response.resourceNeeds.length > 0
                  ? response.resourceNeeds
                  : crisisResourceNeeds,
                crisisPledges,
              ),
            ])
          : [[], []];

      setCrisisRecords((current) => mergeById([response.crisis, ...current]));
      setTaskRecords((current) => mergeById([...response.tasks, ...current]));
      setResourceNeedRecords((current) =>
        mergeById([...response.resourceNeeds, ...current]),
      );
      setResourcePledgeRecords((current) =>
        mergeById([...response.resourcePledges, ...current]),
      );
      setMatchRecords((current) => mergeById([...response.matches, ...current]));
      setCertificateRecords((current) =>
        mergeById([...volunteerCertificates, ...resourceCertificates, ...current]),
      );
      setStatusMessage(
        nextStatus === "resolved"
          ? `Crisis completed. It was removed from current rooms, resources were closed, and ${volunteerCertificates.length + resourceCertificates.length} acknowledgement certificate${volunteerCertificates.length + resourceCertificates.length === 1 ? "" : "s"} were issued.`
          : `Crisis moved to ${nextStatus}.`,
      );
    } catch (error) {
      setCrisisRecords((current) => mergeById([localResolvedCrisis, ...current]));
      setTaskRecords((current) =>
        mergeById([
          ...crisisTasks.map((task) => ({
            ...task,
            status:
              nextStatus === "resolved" &&
              task.status !== "completed" &&
              task.status !== "cancelled"
                ? ("completed" as const)
                : task.status,
            updatedAt: new Date().toISOString(),
          })),
          ...current,
        ]),
      );
      setResourceNeedRecords((current) =>
        mergeById([
          ...crisisResourceNeeds.map((need) => ({
            ...need,
            status:
              nextStatus === "resolved" && isOpenResourceNeed(need.status)
                ? ("closed" as const)
                : need.status,
            updatedAt: new Date().toISOString(),
          })),
          ...current,
        ]),
      );
      setStatusMessage(
        "The crisis was completed in demo mode for this session. Reload the dashboard to review the archived record.",
      );

      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsResolvingCrisisId(null);
    }
  }

  if (isLoading) {
    return (
      <AppShell
        currentPath="/ngo/dashboard"
        eyebrow="NGO Operations"
        title="Loading relief coordination dashboard"
        description="Preparing live crises, task workflow controls, and accepted volunteer activity."
      >
        <FeedbackPanel
          state="loading"
          title="Loading NGO operations"
          description="Pulling NGO operations data from the active source."
        />
      </AppShell>
    );
  }

  const {
    matches,
    certificates,
    activeResourceNeeds,
    completedResourceNeeds,
    acceptedVolunteerRows,
    activeMembersByCrisis,
    crisisById,
    taskById,
    volunteerById,
    stats,
  } = dashboardData;

  return (
    <AppShell
      currentPath="/ngo/dashboard"
      eyebrow="NGO Operations"
      title="Relief coordination dashboard"
      description="Track live crisis rooms, accepted volunteers, task workflow, resource gaps, and certificate-ready completions from one response console."
      actions={
        <>
          <Button href="/ngo/crisis/new" size="lg">
            Create crisis
          </Button>
          <Button href="/crisis/vikas-nagar-fire-relief" variant="secondary" size="lg">
            Open active room
          </Button>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      {statusMessage ? (
        <FeedbackPanel
          state="success"
          title="NGO workflow update"
          description={statusMessage}
        />
      ) : null}

      {errorMessage ? (
        <FeedbackPanel
          state="error"
          title="NGO dashboard warning"
          description={errorMessage}
        />
      ) : null}

      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Active crises
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-command">
              Current crisis cards
            </h2>
          </div>
          <Badge tone="safe">{activeMembersByCrisis.length} current rooms</Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {activeMembersByCrisis.length > 0 ? (
            activeMembersByCrisis.map(({ crisis, rows, openTasks }) => (
              <div key={crisis.id} className="space-y-4">
                <CrisisCard crisis={crisis} />
                <div className="rounded-[24px] border border-safe/20 bg-safe/8 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-command">
                        Complete this crisis
                      </p>
                      <p className="mt-2 text-sm leading-6 text-command-soft/78">
                        Resolves the room, closes listed resources, completes active work, and issues acknowledgement certificates.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isResolvingCrisisId === crisis.id}
                      onClick={() => handleCrisisStatusUpdate(crisis, "resolved")}
                    >
                      {isResolvingCrisisId === crisis.id
                        ? "Completing..."
                        : "Mark crisis completed"}
                    </Button>
                  </div>
                </div>
                <div className="rounded-[24px] border border-border bg-white/82 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-command">
                      Active members
                    </p>
                    <Badge tone={rows.length > 0 ? "safe" : "neutral"} caps={false}>
                      {rows.length} working
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {openTasks} open task{openTasks === 1 ? "" : "s"} in this crisis room.
                  </p>
                  <div className="mt-4 space-y-3">
                    {rows.length > 0 ? (
                      rows.slice(0, 4).map(({ match, task, volunteer }) => (
                        <div
                          key={`${crisis.id}-${match.id}`}
                          className="rounded-[18px] border border-border bg-mist/30 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-command">
                              {volunteer.name}
                            </p>
                            <Badge tone={matchTone(match.status)} caps={false}>
                              {match.status}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-command-soft/78">
                            {task.title}
                          </p>
                        </div>
                      ))
                    ) : (
                      <FeedbackPanel
                        state="empty"
                        title="No active members yet"
                        description="Volunteers will appear here as soon as they accept work for this crisis."
                        className="rounded-[18px] shadow-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <FeedbackPanel
              state="empty"
              title="No current crisis rooms for this NGO"
              description="Create a crisis room and it will show here immediately for your NGO and volunteer responders."
              className="xl:col-span-3"
            />
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Accepted volunteers
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-command">
              Accepted volunteers and task workflow
            </h2>
          </div>
          <Badge tone="info">{acceptedVolunteerRows.length} accepted</Badge>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[24px] border border-border bg-white/86">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-mist/55">
              <tr className="text-xs uppercase tracking-[0.18em] text-command-soft/70">
                <th className="px-4 py-4 font-medium">Volunteer</th>
                <th className="px-4 py-4 font-medium">Crisis</th>
                <th className="px-4 py-4 font-medium">Task</th>
                <th className="px-4 py-4 font-medium">Volunteer status</th>
                <th className="px-4 py-4 font-medium">Task status</th>
                <th className="px-4 py-4 font-medium">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm text-command-soft/85">
              {acceptedVolunteerRows.length > 0 ? (
                acceptedVolunteerRows.map(({ match, crisis, task, volunteer }) => (
                  <tr key={match.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-command">{volunteer.name}</p>
                      <p className="mt-1 text-xs text-command-soft/70">
                        {volunteer.roleTitle}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-command">{crisis.title}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-command">{task.title}</p>
                      <p className="mt-1 text-xs text-command-soft/70">{task.window}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={matchTone(match.status)}>{match.status}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={toneFromTaskStatus(task.status)}>{task.status}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {ngoTaskStatusOptions.map((option) => (
                          <Button
                            key={`${task.id}-${option.value}`}
                            type="button"
                            size="sm"
                            variant={
                              task.status === option.value ? "primary" : "secondary"
                            }
                            disabled={isUpdatingTaskId === task.id}
                            onClick={() => handleTaskStatusUpdate(task, option.value)}
                          >
                            {isUpdatingTaskId === task.id && task.status !== option.value
                              ? "Updating..."
                              : option.actionLabel}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6" colSpan={6}>
                    <p className="text-sm font-semibold text-command">
                      No accepted volunteers yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-command-soft/78">
                      As volunteers accept requests, this table will expose the task
                      workflow controls and certificate path.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Acknowledgements
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-command">
              Certificates issued for crisis help
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-command-soft/78">
              Volunteer task completions and fulfilled resource pledges create
              certificate records for the people or groups who helped.
            </p>
          </div>
          <Badge tone="safe" caps={false}>
            {certificates.length} issued
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {certificates.length > 0 ? (
            certificates.slice(0, 6).map((certificate) => (
              <div
                key={certificate.id}
                className="rounded-[24px] border border-border bg-white/86 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/65">
                      {certificate.certificateNumber}
                    </p>
                    <p className="mt-2 text-base font-semibold text-command">
                      {certificate.volunteerName}
                    </p>
                  </div>
                  <Badge tone={certificate.verified ? "safe" : "neutral"} caps={false}>
                    {certificate.verified ? "verified" : "issued"}
                  </Badge>
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-command-soft/78">
                  {certificate.taskTitle}
                </p>
                <p className="mt-2 text-xs font-semibold text-command-soft/70">
                  {certificate.crisisTitle}
                </p>
                <Button
                  href={`/certificate/${certificate.id}`}
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                >
                  View certificate
                </Button>
              </div>
            ))
          ) : (
            <FeedbackPanel
              state="empty"
              title="No certificates issued yet"
              description="When a task, resource need, or crisis is completed, acknowledgement certificates will appear here."
              className="md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Recent volunteer matches
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Recent volunteer matches
              </h2>
            </div>
            <Badge tone="warn">Merged live and demo data</Badge>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[24px] border border-border bg-white/86">
            <table className="min-w-full divide-y divide-border text-left">
              <thead className="bg-mist/55">
                <tr className="text-xs uppercase tracking-[0.18em] text-command-soft/70">
                  <th className="px-4 py-4 font-medium">Volunteer</th>
                  <th className="px-4 py-4 font-medium">Crisis</th>
                  <th className="px-4 py-4 font-medium">Task</th>
                  <th className="px-4 py-4 font-medium">Score</th>
                  <th className="px-4 py-4 font-medium">Distance</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-command-soft/85">
                {matches.map((match) => {
                  const volunteer = volunteerById.get(match.volunteerId);
                  const crisis = crisisById.get(match.crisisId);
                  const task = taskById.get(match.taskId);

                  return (
                    <tr key={match.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-command">
                          {volunteer?.name ?? "Volunteer"}
                        </p>
                        <p className="mt-1 text-xs text-command-soft/70">
                          {volunteer?.roleTitle ?? "Field responder"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-command">
                          {crisis?.title ?? "Crisis room"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-command">
                          {task?.title ?? "Assigned task"}
                        </p>
                        <p className="mt-1 text-xs text-command-soft/70">
                          {match.reasons[0]}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-command px-3 py-1 text-xs font-semibold text-white">
                          {match.score}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {match.distanceKm ? `${match.distanceKm} km` : "-"}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={matchTone(match.status)}>{match.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Impact summary
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Response highlights
              </h2>
            </div>
            <Badge tone="neutral">Workflow aware</Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {ngoImpactHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-border bg-white/86 p-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                  {item.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-command">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Resource needs board
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Active resource needs board
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="warn" caps={false}>
                {activeResourceNeeds.length} open
              </Badge>
              <Badge tone="safe" caps={false}>
                {completedResourceNeeds.length} finished
              </Badge>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[24px] border border-border bg-white/86">
            <table className="min-w-full divide-y divide-border text-left">
              <thead className="bg-mist/55">
                <tr className="text-xs uppercase tracking-[0.18em] text-command-soft/70">
                  <th className="px-4 py-4 font-medium">Need</th>
                  <th className="px-4 py-4 font-medium">Crisis</th>
                  <th className="px-4 py-4 font-medium">Needed</th>
                  <th className="px-4 py-4 font-medium">Pledged</th>
                  <th className="px-4 py-4 font-medium">Deadline</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-command-soft/85">
                {activeResourceNeeds.length > 0 ? (
                  activeResourceNeeds.map((need) => {
                  const crisis = crisisById.get(need.crisisId);

                  return (
                    <tr key={need.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-command">{need.label}</p>
                        <p className="mt-1 text-xs text-command-soft/70">
                          {need.location.address}
                        </p>
                      </td>
                      <td className="px-4 py-4">{crisis?.title ?? "Crisis room"}</td>
                      <td className="px-4 py-4">{need.quantityNeeded}</td>
                      <td className="px-4 py-4">{need.quantityPledged}</td>
                      <td className="px-4 py-4">{need.deadline}</td>
                      <td className="px-4 py-4">
                        <Badge tone={need.status === "open" ? "warn" : "safe"}>
                          {need.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isUpdatingResourceNeedId === need.id}
                            onClick={() =>
                              handleResourceNeedStatusUpdate(need, "fulfilled")
                            }
                          >
                            {isUpdatingResourceNeedId === need.id
                              ? "Updating..."
                              : "Mark fulfilled"}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={isUpdatingResourceNeedId === need.id}
                            onClick={() =>
                              handleResourceNeedStatusUpdate(need, "closed")
                            }
                          >
                            Not needed
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
                ) : (
                  <tr>
                    <td className="px-4 py-6" colSpan={7}>
                      <p className="text-sm font-semibold text-command">
                        No active resource needs
                      </p>
                      <p className="mt-2 text-sm leading-6 text-command-soft/78">
                        Fulfilled or closed resources are removed from this active board.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {completedResourceNeeds.length > 0 ? (
            <div className="mt-4 rounded-[24px] border border-safe/20 bg-safe/8 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-command">
                  Finished resource records
                </p>
                <Badge tone="safe" caps={false}>
                  {completedResourceNeeds.length} archived
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {completedResourceNeeds.slice(0, 6).map((need) => (
                  <Badge key={need.id} tone="safe" caps={false}>
                    {need.label}: {need.status}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Impact summary
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Crisis impact table
              </h2>
            </div>
            <Badge tone="info">Families helped</Badge>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[24px] border border-border bg-white/86">
            <table className="min-w-full divide-y divide-border text-left">
              <thead className="bg-mist/55">
                <tr className="text-xs uppercase tracking-[0.18em] text-command-soft/70">
                  <th className="px-4 py-4 font-medium">Crisis</th>
                  <th className="px-4 py-4 font-medium">Families</th>
                  <th className="px-4 py-4 font-medium">Volunteers</th>
                  <th className="px-4 py-4 font-medium">Tasks done</th>
                  <th className="px-4 py-4 font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-command-soft/85">
                {ngoImpactRows.map((row) => {
                  const crisis = crisisById.get(row.crisisId);

                  return (
                    <tr key={row.crisisId}>
                      <td className="px-4 py-4 font-semibold text-command">
                        {crisis?.title ?? "Crisis room"}
                      </td>
                      <td className="px-4 py-4">{row.familiesHelped}</td>
                      <td className="px-4 py-4">{row.volunteersActive}</td>
                      <td className="px-4 py-4">{row.tasksCompleted}</td>
                      <td className="px-4 py-4">{row.pledgedCoverage}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
