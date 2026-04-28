"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CrisisImpactDashboard } from "@/components/CrisisImpactDashboard";
import { CrisisMap, type CrisisMapPoint } from "@/components/CrisisMap";
import { useToast } from "@/components/ToastProvider";
import { ResourceCard } from "@/components/ResourceCard";
import { TaskCard } from "@/components/TaskCard";
import { VolunteerMatchCard } from "@/components/VolunteerMatchCard";
import {
  getCertificatesByCrisisId,
  getNGOProfileByCrisisId,
  getResourcePledgesByCrisisId,
  getResourcesByCrisisId,
  getTasksByCrisisId,
  getVolunteerMatchesByCrisisId,
  getVolunteersByCrisisId,
} from "@/data/mock-data";
import { requestNGONeedParsing } from "@/lib/ai-client";
import { getCurrentUser } from "@/lib/auth";
import { getTemplateByCrisisType } from "@/lib/disasterTemplates";
import {
  assignVolunteerToTask,
  getCertificatesForCrisis,
  createResourceNeed,
  createVolunteerMatch,
  createVolunteerNotificationPlaceholder,
  createTask,
  getCrisis as getFirestoreCrisis,
  getResourcePledgesForCrisis,
  getResourceNeedsForCrisis,
  getTasksForCrisis,
  getVolunteerMatchesForCrisis,
  getVolunteerProfiles,
} from "@/lib/firestore";
import {
  calculateDistanceKm,
  rankVolunteersForTask,
  type RankedVolunteerMatch,
} from "@/lib/matching";
import {
  formatLocationLabel,
  toneFromCrisisType,
  toneFromTaskStatus,
} from "@/lib/utils";
import type {
  Certificate,
  Crisis,
  CrisisType,
  ReliefTask,
  ResourceNeed,
  ResourcePledge,
  ResourceNeedFormValues,
  TaskFormValues,
  TaskPriority,
  Urgency,
  VolunteerMatch,
} from "@/types";

interface CrisisDetailViewProps {
  crisisId: string;
  initialCrisis: Crisis | null;
}

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-border bg-white/92 px-4 py-3 text-sm text-command shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition placeholder:text-command-soft/60 focus:border-command/45 focus:bg-white focus:ring-4 focus:ring-command/10";

const priorityOptions: Array<{
  value: TaskPriority;
  label: string;
  helper: string;
}> = [
  {
    value: "critical",
    label: "Critical",
    helper: "Immediate response task with highest urgency.",
  },
  {
    value: "high",
    label: "High",
    helper: "Important operational task for the next response window.",
  },
  {
    value: "standard",
    label: "Standard",
    helper: "Useful supporting task that can queue behind urgent work.",
  },
];

const taskCrisisTypeOptions: Array<{
  value: CrisisType;
  label: string;
  helper: string;
}> = [
  {
    value: "fire",
    label: "Fire",
    helper: "Shelter, medicine, and food movement.",
  },
  {
    value: "flood",
    label: "Flood",
    helper: "Boat routes, life jackets, and dry ration.",
  },
  {
    value: "landslide",
    label: "Landslide",
    helper: "Off-road access, ropes, and local guides.",
  },
  {
    value: "earthquake",
    label: "Earthquake",
    helper: "Medical support, structural checks, and shelters.",
  },
  {
    value: "cyclone",
    label: "Cyclone",
    helper: "Water, shelter, medicines, and power backup.",
  },
];

const resourceNeedOptions = [
  "food packets",
  "clothes",
  "blankets",
  "medicine",
  "water",
  "shelter",
  "vehicle",
  "boat",
  "generator",
  "sanitary kits",
  "school kits",
  "other",
] as const;

const resourceUrgencyOptions: Array<{
  value: Urgency;
  label: string;
  helper: string;
}> = [
  {
    value: "critical",
    label: "Critical",
    helper: "Immediate supply gap with major response impact.",
  },
  {
    value: "high",
    label: "High",
    helper: "Needs donor action in the next response window.",
  },
  {
    value: "moderate",
    label: "Moderate",
    helper: "Useful support that can queue behind urgent deliveries.",
  },
];

function hasUsableCoordinates(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}

function getReferenceLocationForTask(task: ReliefTask, crisis: Crisis) {
  if (hasUsableCoordinates(task.location.lat, task.location.lng)) {
    return task.location;
  }

  return crisis.location;
}

function getVolunteerDistanceLabel(
  task: ReliefTask,
  volunteerLocation: ReliefTask["location"],
  crisis: Crisis,
) {
  const referenceLocation = getReferenceLocationForTask(task, crisis);

  if (
    !hasUsableCoordinates(referenceLocation.lat, referenceLocation.lng) ||
    !hasUsableCoordinates(volunteerLocation.lat, volunteerLocation.lng)
  ) {
    return "Distance unavailable";
  }

  return `${calculateDistanceKm(
    referenceLocation.lat,
    referenceLocation.lng,
    volunteerLocation.lat,
    volunteerLocation.lng,
  ).toFixed(1)} km`;
}

function getDefaultTaskFormValues(crisisType: CrisisType): TaskFormValues {
  const template = getTemplateByCrisisType(crisisType);

  return {
    crisisType,
    needDescription: "",
    title: "",
    description: "",
    requiredSkills: template.suggestedSkills.join(", "),
    requiredResources: template.suggestedResources.join(", "),
    requiredAssets: template.priorityAssets.join(", "),
    volunteersNeeded: "",
    location: "",
    timeWindow: "",
    riskLevel: "yellow",
    languagePreference: "",
    priority: "high",
  };
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapAiPriorityToTaskPriority(priority: "low" | "medium" | "high" | "critical") {
  if (priority === "critical") {
    return "critical";
  }

  if (priority === "high") {
    return "high";
  }

  return "standard";
}

function getDefaultResourceNeedFormValues(crisis: Crisis | null): ResourceNeedFormValues {
  return {
    label: "food packets",
    quantityNeeded: "",
    urgency: "high",
    location: crisis?.location.address ?? "",
    deadline: "",
  };
}

export function CrisisDetailView({
  crisisId,
  initialCrisis,
}: CrisisDetailViewProps) {
  const { pushToast } = useToast();
  const [crisis, setCrisis] = useState<Crisis | null>(initialCrisis);
  const [isLoading, setIsLoading] = useState(!initialCrisis);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firestoreTasks, setFirestoreTasks] = useState<ReliefTask[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [taskLoadError, setTaskLoadError] = useState<string | null>(null);
  const [firestoreResourceNeeds, setFirestoreResourceNeeds] = useState<ResourceNeed[]>([]);
  const [isResourceNeedsLoading, setIsResourceNeedsLoading] = useState(false);
  const [resourceLoadError, setResourceLoadError] = useState<string | null>(null);
  const [firestoreVolunteerMatches, setFirestoreVolunteerMatches] = useState<
    VolunteerMatch[]
  >([]);
  const [firestoreResourcePledges, setFirestoreResourcePledges] = useState<
    ResourcePledge[]
  >([]);
  const [firestoreCertificates, setFirestoreCertificates] = useState<Certificate[]>([]);
  const [isImpactLoading, setIsImpactLoading] = useState(false);
  const [impactLoadError, setImpactLoadError] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormValues>(() =>
    getDefaultTaskFormValues(initialCrisis?.type ?? "fire"),
  );
  const [resourceNeedForm, setResourceNeedForm] = useState<ResourceNeedFormValues>(() =>
    getDefaultResourceNeedFormValues(initialCrisis),
  );
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [taskSuccessMessage, setTaskSuccessMessage] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [resourceFormError, setResourceFormError] = useState<string | null>(null);
  const [resourceSuccessMessage, setResourceSuccessMessage] = useState<string | null>(
    null,
  );
  const [isCreatingResourceNeed, setIsCreatingResourceNeed] = useState(false);
  const [isParsingTaskNeed, setIsParsingTaskNeed] = useState(false);
  const [taskAiMessage, setTaskAiMessage] = useState<string | null>(null);
  const [matchesByTaskId, setMatchesByTaskId] = useState<
    Record<string, RankedVolunteerMatch[]>
  >({});
  const [matchErrorsByTaskId, setMatchErrorsByTaskId] = useState<Record<string, string>>(
    {},
  );
  const [matchSuccessByTaskId, setMatchSuccessByTaskId] = useState<
    Record<string, string>
  >({});
  const [loadingMatchesTaskId, setLoadingMatchesTaskId] = useState<string | null>(null);
  const [assigningMatchKey, setAssigningMatchKey] = useState<string | null>(null);
  const [activeMatchTaskId, setActiveMatchTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (initialCrisis) {
      return;
    }

    let isActive = true;

    async function loadCrisis() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextCrisis = await getFirestoreCrisis(crisisId);

        if (!isActive) {
          return;
        }

        setCrisis(nextCrisis);

        if (nextCrisis) {
          setTaskForm(getDefaultTaskFormValues(nextCrisis.type));
          setResourceNeedForm(getDefaultResourceNeedFormValues(nextCrisis));
        } else {
          setErrorMessage(
            "This crisis room could not be found in mock data or Firestore.",
          );
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load this crisis room right now.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCrisis();

    return () => {
      isActive = false;
    };
  }, [crisisId, initialCrisis]);

  useEffect(() => {
    if (!crisis) {
      return;
    }

    const currentCrisisId = crisis.id;
    let isActive = true;

    async function loadTasks() {
      setIsTasksLoading(true);
      setTaskLoadError(null);

      try {
        const nextTasks = await getTasksForCrisis(currentCrisisId);

        if (!isActive) {
          return;
        }

        setFirestoreTasks(nextTasks);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setTaskLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load Firestore tasks for this crisis room.",
        );
      } finally {
        if (isActive) {
          setIsTasksLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      isActive = false;
    };
  }, [crisis]);

  useEffect(() => {
    if (!crisis) {
      return;
    }

    const currentCrisisId = crisis.id;
    let isActive = true;

    async function loadImpactData() {
      setIsImpactLoading(true);
      setImpactLoadError(null);
      setFirestoreVolunteerMatches([]);
      setFirestoreResourcePledges([]);
      setFirestoreCertificates([]);

      const [matchesResult, pledgesResult, certificatesResult] = await Promise.allSettled([
        getVolunteerMatchesForCrisis(currentCrisisId),
        getResourcePledgesForCrisis(currentCrisisId),
        getCertificatesForCrisis(currentCrisisId),
      ]);

      if (!isActive) {
        return;
      }

      const nextErrors: string[] = [];

      if (matchesResult.status === "fulfilled") {
        setFirestoreVolunteerMatches(matchesResult.value);
      } else {
        nextErrors.push(
          matchesResult.reason instanceof Error
            ? matchesResult.reason.message
            : "Unable to sync volunteer matches.",
        );
      }

      if (pledgesResult.status === "fulfilled") {
        setFirestoreResourcePledges(pledgesResult.value);
      } else {
        nextErrors.push(
          pledgesResult.reason instanceof Error
            ? pledgesResult.reason.message
            : "Unable to sync resource pledges.",
        );
      }

      if (certificatesResult.status === "fulfilled") {
        setFirestoreCertificates(certificatesResult.value);
      } else {
        nextErrors.push(
          certificatesResult.reason instanceof Error
            ? certificatesResult.reason.message
            : "Unable to sync certificates.",
        );
      }

      setImpactLoadError(nextErrors.length > 0 ? nextErrors.join(" ") : null);
      setIsImpactLoading(false);
    }

    loadImpactData();

    return () => {
      isActive = false;
    };
  }, [crisis]);

  useEffect(() => {
    if (!crisis) {
      return;
    }

    const currentCrisisId = crisis.id;
    let isActive = true;

    async function loadResourceNeeds() {
      setIsResourceNeedsLoading(true);
      setResourceLoadError(null);

      try {
        const nextNeeds = await getResourceNeedsForCrisis(currentCrisisId);

        if (!isActive) {
          return;
        }

        setFirestoreResourceNeeds(nextNeeds);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setResourceLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load Firestore resource needs for this crisis room.",
        );
      } finally {
        if (isActive) {
          setIsResourceNeedsLoading(false);
        }
      }
    }

    loadResourceNeeds();

    return () => {
      isActive = false;
    };
  }, [crisis]);

  function updateTaskField<K extends keyof TaskFormValues>(
    field: K,
    value: TaskFormValues[K],
  ) {
    setTaskFormError(null);
    setTaskSuccessMessage(null);
    setTaskAiMessage(null);
    setTaskForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateResourceNeedField<K extends keyof ResourceNeedFormValues>(
    field: K,
    value: ResourceNeedFormValues[K],
  ) {
    setResourceFormError(null);
    setResourceSuccessMessage(null);
    setResourceNeedForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyTaskTemplate() {
    const template = getTemplateByCrisisType(taskForm.crisisType);

    setTaskFormError(null);
    setTaskSuccessMessage(null);
    setTaskAiMessage(null);
    setTaskForm((current) => ({
      ...current,
      crisisType: current.crisisType,
      requiredSkills: template.suggestedSkills.join(", "),
      requiredResources: template.suggestedResources.join(", "),
      requiredAssets: template.priorityAssets.join(", "),
    }));
  }

  async function handleParseTaskNeed() {
    if (!crisis) {
      setTaskFormError("The crisis room is not loaded yet.");
      return;
    }

    if (!taskForm.needDescription.trim()) {
      setTaskFormError("Describe the relief need first so AI has context to parse.");
      return;
    }

    setIsParsingTaskNeed(true);
    setTaskFormError(null);
    setTaskSuccessMessage(null);
    setTaskAiMessage(null);

    try {
      const parsedNeed = await requestNGONeedParsing(taskForm.needDescription);

      setTaskForm((current) => {
        const nextCrisisType =
          parsedNeed.crisisType === "unknown"
            ? current.crisisType
            : parsedNeed.crisisType;

        return {
          ...current,
          crisisType: nextCrisisType,
          requiredSkills: parsedNeed.requiredSkills.join(", "),
          requiredResources: parsedNeed.requiredResources.join(", "),
          requiredAssets: parsedNeed.requiredAssets.join(", "),
          priority: mapAiPriorityToTaskPriority(parsedNeed.priority),
          riskLevel: parsedNeed.riskLevel,
        };
      });

      setTaskAiMessage(
        parsedNeed.crisisType !== "unknown" && parsedNeed.crisisType !== crisis.type
          ? `AI read this as a ${parsedNeed.crisisType} need, so the task drafting template was updated even though this room stays under ${crisis.type}.`
          : "AI parsed the relief need and updated the task fields.",
      );
      pushToast({
        title: "AI need parsing complete",
        description:
          parsedNeed.crisisType !== "unknown" && parsedNeed.crisisType !== crisis.type
            ? `Task drafting suggestions were refreshed using ${parsedNeed.crisisType} guidance.`
            : "Task requirements were autofilled from the need description.",
        tone: "safe",
      });
    } catch (error) {
      pushToast({
        title: "AI parsing unavailable",
        description:
          error instanceof Error
            ? error.message
            : "Unable to parse this relief need right now.",
        tone: "alert",
      });
      setTaskFormError(
        error instanceof Error
          ? error.message
          : "Unable to parse this relief need right now.",
      );
    } finally {
      setIsParsingTaskNeed(false);
    }
  }

  async function handleFindVolunteers(task: ReliefTask) {
    if (!crisis) {
      return;
    }

    setLoadingMatchesTaskId(task.id);
    setActiveMatchTaskId(task.id);
    setMatchErrorsByTaskId((current) => ({
      ...current,
      [task.id]: "",
    }));
    setMatchSuccessByTaskId((current) => ({
      ...current,
      [task.id]: "",
    }));

    try {
      const volunteers = await getVolunteerProfiles();
      const rankedMatches = rankVolunteersForTask(task, volunteers, crisis);

      setMatchesByTaskId((current) => ({
        ...current,
        [task.id]: rankedMatches,
      }));
      pushToast({
        title: "Volunteer ranking ready",
        description:
          rankedMatches.length > 0
            ? `${rankedMatches.length} ranked volunteers are ready for review.`
            : "No volunteer profiles were available for this task yet.",
        tone: rankedMatches.length > 0 ? "safe" : "warn",
      });
    } catch (error) {
      pushToast({
        title: "Volunteer search unavailable",
        description:
          error instanceof Error
            ? error.message
            : "Unable to fetch volunteers for this task right now.",
        tone: "alert",
      });
      setMatchErrorsByTaskId((current) => ({
        ...current,
        [task.id]:
          error instanceof Error
            ? error.message
            : "Unable to fetch volunteers for this task right now.",
      }));
    } finally {
      setLoadingMatchesTaskId((current) => (current === task.id ? null : current));
    }
  }

  async function handleAssignVolunteer(
    task: ReliefTask,
    match: RankedVolunteerMatch,
  ) {
    if (!crisis) {
      return;
    }

    const matchKey = `${task.id}:${match.volunteer.id}`;

    setAssigningMatchKey(matchKey);
    setActiveMatchTaskId(task.id);
    setMatchErrorsByTaskId((current) => ({
      ...current,
      [task.id]: "",
    }));
    setMatchSuccessByTaskId((current) => ({
      ...current,
      [task.id]: "",
    }));

    try {
      const updatedTask = await assignVolunteerToTask(task, match.volunteer.id);

      await createVolunteerMatch({
        crisis,
        task: updatedTask,
        volunteer: match.volunteer,
        score: match.score,
        reasons: match.reasons,
      });

      await createVolunteerNotificationPlaceholder({
        crisis,
        task: updatedTask,
        volunteer: match.volunteer,
      });

      setFirestoreTasks((current) => {
        const remainingTasks = current.filter(
          (currentTask) => currentTask.id !== updatedTask.id,
        );

        return [updatedTask, ...remainingTasks];
      });

      setMatchSuccessByTaskId((current) => ({
        ...current,
        [task.id]: `${match.volunteer.name} assigned. Match record and notification placeholder created.`,
      }));
      pushToast({
        title: "Volunteer assigned",
        description: `${match.volunteer.name} is now attached to ${task.title}.`,
        tone: "safe",
      });
    } catch (error) {
      pushToast({
        title: "Assignment failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to assign this volunteer right now.",
        tone: "alert",
      });
      setMatchErrorsByTaskId((current) => ({
        ...current,
        [task.id]:
          error instanceof Error
            ? error.message
            : "Unable to assign this volunteer right now.",
      }));
    } finally {
      setAssigningMatchKey((current) => (current === matchKey ? null : current));
    }
  }

  async function handleTaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!crisis) {
      setTaskFormError("The crisis room is not loaded yet.");
      return;
    }

    setIsCreatingTask(true);
    setTaskFormError(null);
    setTaskSuccessMessage(null);

    try {
      const volunteersNeeded = Number.parseInt(taskForm.volunteersNeeded, 10);
      const requiredSkills = parseList(taskForm.requiredSkills);
      const requiredResources = parseList(taskForm.requiredResources);
      const requiredAssets = parseList(taskForm.requiredAssets);

      if (Number.isNaN(volunteersNeeded) || volunteersNeeded < 1) {
        throw new Error("Volunteers needed must be a valid number.");
      }

      if (
        requiredSkills.length === 0 ||
        requiredResources.length === 0 ||
        requiredAssets.length === 0
      ) {
        throw new Error(
          "Required skills, resources, and assets should each include at least one item.",
        );
      }

      const createdTask = await createTask({
        crisisId: crisis.id,
        title: taskForm.title,
        description: taskForm.description,
        location: {
          lat: 0,
          lng: 0,
          address: taskForm.location,
        },
        riskLevel: taskForm.riskLevel,
        requiredSkills,
        requiredResources,
        requiredAssets,
        volunteersNeeded,
        window: taskForm.timeWindow,
        languagePreference: taskForm.languagePreference,
        priority: taskForm.priority,
        createdBy: getCurrentUser()?.uid,
      });

      setFirestoreTasks((current) => [createdTask, ...current]);
      setCrisis((current) =>
        current
          ? {
              ...current,
              openTasks: current.openTasks + 1,
              updatedAt: createdTask.updatedAt,
            }
          : current,
      );
      setTaskSuccessMessage("Task created and saved to Firestore.");
      setTaskForm(getDefaultTaskFormValues(crisis.type));
      setTaskAiMessage(null);
      pushToast({
        title: "Task created",
        description: "The relief task was added to the crisis room and matching queue.",
        tone: "safe",
      });
    } catch (error) {
      pushToast({
        title: "Task creation failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to create this task right now.",
        tone: "alert",
      });
      setTaskFormError(
        error instanceof Error
          ? error.message
          : "Unable to create this task right now.",
      );
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleResourceNeedSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!crisis) {
      setResourceFormError("The crisis room is not loaded yet.");
      return;
    }

    setIsCreatingResourceNeed(true);
    setResourceFormError(null);
    setResourceSuccessMessage(null);

    try {
      const quantityNeeded = Number.parseInt(resourceNeedForm.quantityNeeded, 10);

      if (Number.isNaN(quantityNeeded) || quantityNeeded < 1) {
        throw new Error("Quantity needed must be a valid number.");
      }

      const createdNeed = await createResourceNeed({
        crisisId: crisis.id,
        label: resourceNeedForm.label,
        category: resourceNeedForm.label,
        location: {
          lat: 0,
          lng: 0,
          address: resourceNeedForm.location,
        },
        quantityNeeded,
        urgency: resourceNeedForm.urgency,
        deadline: resourceNeedForm.deadline,
        createdBy: getCurrentUser()?.uid,
        verified: crisis.verified,
      });

      setFirestoreResourceNeeds((current) => [createdNeed, ...current]);
      setResourceNeedForm(getDefaultResourceNeedFormValues(crisis));
      setResourceSuccessMessage("Resource need posted to Firestore and added to the donor board.");
      pushToast({
        title: "Resource need posted",
        description: `${createdNeed.label} is now visible on the donor board.`,
        tone: "safe",
      });
    } catch (error) {
      pushToast({
        title: "Resource post failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to create this resource need right now.",
        tone: "alert",
      });
      setResourceFormError(
        error instanceof Error
          ? error.message
          : "Unable to create this resource need right now.",
      );
    } finally {
      setIsCreatingResourceNeed(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell
        currentPath={`/crisis/${crisisId}`}
        eyebrow="Crisis Room"
        title="Loading crisis room"
        description="Fetching the latest crisis record so the operations view can open cleanly."
      >
        <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm leading-7 text-command-soft/78">
            Pulling this crisis room from the current data source.
          </p>
        </section>
      </AppShell>
    );
  }

  if (!crisis) {
    return (
      <AppShell
        currentPath={`/crisis/${crisisId}`}
        eyebrow="Crisis Room"
        title="Crisis room unavailable"
        description="The requested incident record is missing or not accessible yet."
        actions={<Button href="/ngo/dashboard">Back to NGO dashboard</Button>}
      >
        <section className="rounded-[32px] border border-alert/20 bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm font-semibold text-alert">Unable to open this room</p>
          <p className="mt-3 text-sm leading-7 text-command-soft/78">
            {errorMessage ??
              "Try returning to the dashboard and opening the crisis again after Firestore finishes syncing."}
          </p>
        </section>
      </AppShell>
    );
  }

  const selectedTaskTemplate = getTemplateByCrisisType(taskForm.crisisType);
  const mockTasks = getTasksByCrisisId(crisis.id);
  const relatedTasks = [
    ...firestoreTasks,
    ...mockTasks.filter(
      (task) => !firestoreTasks.some((firestoreTask) => firestoreTask.id === task.id),
    ),
  ];
  const mockResources = getResourcesByCrisisId(crisis.id);
  const relatedResources = [
    ...firestoreResourceNeeds,
    ...mockResources.filter(
      (need) =>
        !firestoreResourceNeeds.some((firestoreNeed) => firestoreNeed.id === need.id),
    ),
  ];
  const mockVolunteerMatches = getVolunteerMatchesByCrisisId(crisis.id);
  const relatedVolunteerMatches = [
    ...firestoreVolunteerMatches,
    ...mockVolunteerMatches.filter(
      (match) =>
        !firestoreVolunteerMatches.some(
          (firestoreMatch) => firestoreMatch.id === match.id,
        ),
    ),
  ];
  const mockResourcePledges = getResourcePledgesByCrisisId(crisis.id);
  const relatedResourcePledges = [
    ...firestoreResourcePledges,
    ...mockResourcePledges.filter(
      (pledge) =>
        !firestoreResourcePledges.some(
          (firestorePledge) => firestorePledge.id === pledge.id,
        ),
    ),
  ];
  const mockCertificates = getCertificatesByCrisisId(crisis.id);
  const relatedCertificates = [
    ...firestoreCertificates,
    ...mockCertificates.filter(
      (certificate) =>
        !firestoreCertificates.some(
          (firestoreCertificate) => firestoreCertificate.id === certificate.id,
        ),
    ),
  ];
  const ngoProfile = getNGOProfileByCrisisId(crisis.id);
  const volunteerMapPoints: CrisisMapPoint[] = getVolunteersByCrisisId(crisis.id).map(
    (volunteer) => ({
    id: `volunteer-${volunteer.id}`,
    label: volunteer.name,
    location: volunteer.location,
    tone: "safe" as const,
    detail: volunteer.availableTime || "Volunteer responder",
  }),
  );
  const resourceDonorMapPoints: CrisisMapPoint[] = relatedResources.slice(0, 6).map((need) => ({
    id: `resource-${need.id}`,
    label: need.label,
    location: need.location,
    tone: need.urgency === "critical" ? "alert" : need.urgency === "high" ? "warn" : "info",
    detail: need.providerHint,
  }));
  const taskMapPoints: CrisisMapPoint[] = relatedTasks.slice(0, 8).map((task) => ({
    id: `task-${task.id}`,
    label: task.title,
    location: getReferenceLocationForTask(task, crisis),
    tone: toneFromTaskStatus(task.status),
    detail: task.window,
  }));
  const activeMatchTask = activeMatchTaskId
    ? relatedTasks.find((task) => task.id === activeMatchTaskId) ?? null
    : null;
  const activeTaskMatches = activeMatchTask ? matchesByTaskId[activeMatchTask.id] ?? [] : [];

  return (
    <AppShell
      currentPath={`/crisis/${crisis.id}`}
      eyebrow="Crisis Room"
      title={crisis.title}
      description={crisis.summary}
      actions={
        <>
          <Button href={`/crisis/${crisis.id}#task-creator`} variant="secondary">
            Create task
          </Button>
          <Button href="/donor">Open donor board</Button>
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="alert">{crisis.type}</Badge>
            <Badge
              tone={
                crisis.riskLevel === "red"
                  ? "alert"
                  : crisis.riskLevel === "yellow"
                    ? "warn"
                    : "safe"
              }
            >
              {crisis.riskLevel} risk
            </Badge>
            <Badge tone="neutral">{crisis.status}</Badge>
            <Badge tone={crisis.verified ? "safe" : "warn"}>
              {crisis.verified ? "verified" : "pending verification"}
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/85 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                Families affected
              </p>
              <p className="mt-2 text-3xl font-semibold text-command">
                {crisis.familiesAffected}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/85 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                Open tasks
              </p>
              <p className="mt-2 text-3xl font-semibold text-command">
                {crisis.openTasks}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/85 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                Contact person
              </p>
              <p className="mt-2 text-lg font-semibold text-command">
                {crisis.contactPerson}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-border bg-white/85 p-4">
            <p className="text-sm font-semibold text-command">Situation summary</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">
              {crisis.description || crisis.summary}
            </p>
            <p className="mt-3 text-sm leading-6 text-command-soft/70">
              Location: {formatLocationLabel(crisis.location)}
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-white/85 p-4">
              <p className="text-sm font-semibold text-command">Urgent needs</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(crisis.urgentNeeds ?? crisis.needs).map((need) => (
                  <Badge key={need} tone="warn">
                    {need}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-white/85 p-4">
              <p className="text-sm font-semibold text-command">Required resources</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {crisis.requiredResources.map((resource) => (
                  <Badge key={resource} tone="info">
                    {resource}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-border bg-white/85 p-4">
            <p className="text-sm font-semibold text-command">Suggested skills</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {crisis.suggestedSkills.map((skill) => (
                <Badge key={skill} tone="safe">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-border bg-white/85 p-4">
            <p className="text-sm font-semibold text-command">Safety note</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">
              RahatSetu AI supports relief coordination and safe volunteer
              mobilization. It does not replace fire brigade, ambulance, police,
              NDRF, SDRF, or official emergency authorities.
            </p>
          </div>
        </div>

        <CrisisMap
          title="Crisis map placeholder"
          subtitle={`${formatLocationLabel(crisis.location)} with affected area, NGO hub, volunteer positions, donor supply points, and task markers.`}
          affectedArea={{
            id: `affected-${crisis.id}`,
            label: crisis.title,
            location: crisis.location,
            tone: toneFromCrisisType(crisis.type),
            detail: `${crisis.familiesAffected} families affected`,
          }}
          ngoCenters={[
            {
              id: `ngo-${crisis.id}`,
              label: ngoProfile?.organizationName || crisis.contactPerson,
              location: ngoProfile?.location || crisis.location,
              tone: "neutral",
              detail: "NGO coordination center",
            },
          ]}
          volunteers={volunteerMapPoints}
          resourceDonors={resourceDonorMapPoints}
          tasks={taskMapPoints}
        />
      </section>

      <CrisisImpactDashboard
        crisis={crisis}
        ngoName={ngoProfile?.organizationName}
        tasks={relatedTasks}
        resourceNeeds={relatedResources}
        resourcePledges={relatedResourcePledges}
        volunteerMatches={relatedVolunteerMatches}
        certificates={relatedCertificates}
        isLoading={isImpactLoading}
        errorMessage={impactLoadError}
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section
            id="task-creator"
            className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Task creation
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  Publish a new relief task
                </h2>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={applyTaskTemplate}>
                Use {taskForm.crisisType} suggestions
              </Button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleTaskSubmit}>
              <div className="rounded-[24px] border border-border bg-mist/34 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-command">
                      Describe your relief need
                    </p>
                    <p className="mt-2 text-sm leading-6 text-command-soft/78">
                      Write the need in natural language and let AI prefill the
                      task draft with skills, resources, assets, priority, and risk.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleParseTaskNeed}
                    disabled={isParsingTaskNeed}
                  >
                    {isParsingTaskNeed ? "Parsing..." : "Parse need with AI"}
                  </Button>
                </div>

                <textarea
                  className={`${inputClassName} min-h-32 resize-y`}
                  placeholder="Need a supervised flood support team to move dry food, medicines, and life jackets to the riverside shelter before dark. Boat support and Malayalam speakers preferred."
                  value={taskForm.needDescription}
                  onChange={(event) =>
                    updateTaskField("needDescription", event.target.value)
                  }
                />
              </div>

              <div className="rounded-[24px] border border-border bg-white/85 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-command">
                      Crisis context for this task
                    </p>
                    <p className="mt-2 text-sm leading-6 text-command-soft/78">
                      This shapes AI parsing and template suggestions for the task draft.
                    </p>
                  </div>
                  <Badge tone={taskForm.crisisType === crisis.type ? "safe" : "warn"}>
                    {taskForm.crisisType === crisis.type
                      ? "Matches room"
                      : "Task-specific override"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {taskCrisisTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateTaskField("crisisType", option.value)}
                      className={`rounded-[22px] border px-4 py-3 text-left transition ${
                        taskForm.crisisType === option.value
                          ? "border-command bg-command text-white"
                          : "border-border bg-white/80 text-command hover:border-command/35"
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p
                        className={`mt-1 text-xs leading-5 ${
                          taskForm.crisisType === option.value
                            ? "text-white/76"
                            : "text-command-soft/75"
                        }`}
                      >
                        {option.helper}
                      </p>
                    </button>
                  ))}
                </div>

                {taskForm.crisisType !== crisis.type ? (
                  <p className="mt-4 text-sm leading-6 text-command-soft/78">
                    The crisis room remains {crisis.type}, but the task drafting
                    template is currently using {taskForm.crisisType} assumptions.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-command sm:col-span-2">
                  Title
                  <input
                    className={inputClassName}
                    placeholder="Boat-supported medicine transfer"
                    value={taskForm.title}
                    onChange={(event) => updateTaskField("title", event.target.value)}
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command sm:col-span-2">
                  Description
                  <textarea
                    className={`${inputClassName} min-h-28 resize-y`}
                    placeholder="Explain what the team needs to do, what the route looks like, and any safety context."
                    value={taskForm.description}
                    onChange={(event) =>
                      updateTaskField("description", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Required skills
                  <textarea
                    className={`${inputClassName} min-h-24 resize-y`}
                    placeholder="first-aid, water rescue, local language support"
                    value={taskForm.requiredSkills}
                    onChange={(event) =>
                      updateTaskField("requiredSkills", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Required resources
                  <textarea
                    className={`${inputClassName} min-h-24 resize-y`}
                    placeholder="dry food, medicines, life jackets"
                    value={taskForm.requiredResources}
                    onChange={(event) =>
                      updateTaskField("requiredResources", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Required assets
                  <textarea
                    className={`${inputClassName} min-h-24 resize-y`}
                    placeholder="boat, rescue rope, medical kit"
                    value={taskForm.requiredAssets}
                    onChange={(event) =>
                      updateTaskField("requiredAssets", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Volunteers needed
                  <input
                    type="number"
                    min="1"
                    className={inputClassName}
                    placeholder="4"
                    value={taskForm.volunteersNeeded}
                    onChange={(event) =>
                      updateTaskField("volunteersNeeded", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Location
                  <input
                    className={inputClassName}
                    placeholder="Riverside supply corridor, Sector 3"
                    value={taskForm.location}
                    onChange={(event) => updateTaskField("location", event.target.value)}
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Time window
                  <input
                    className={inputClassName}
                    placeholder="6:00 PM to 9:00 PM"
                    value={taskForm.timeWindow}
                    onChange={(event) =>
                      updateTaskField("timeWindow", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Language preference
                  <input
                    className={inputClassName}
                    placeholder="Hindi, Malayalam, English"
                    value={taskForm.languagePreference}
                    onChange={(event) =>
                      updateTaskField("languagePreference", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                <div>
                  <p className="text-sm font-medium text-command">Risk level</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {(["green", "yellow", "red"] as const).map((riskLevel) => (
                      <button
                        key={riskLevel}
                        type="button"
                        onClick={() => updateTaskField("riskLevel", riskLevel)}
                        className={`rounded-[22px] border px-4 py-3 text-left transition ${
                          taskForm.riskLevel === riskLevel
                            ? "border-command bg-command text-white"
                            : "border-border bg-white/80 text-command hover:border-command/35"
                        }`}
                      >
                        <p className="text-sm font-semibold uppercase">{riskLevel}</p>
                        <p
                          className={`mt-1 text-xs leading-5 ${
                            taskForm.riskLevel === riskLevel
                              ? "text-white/76"
                              : "text-command-soft/75"
                          }`}
                        >
                          {riskLevel === "green"
                            ? "Low-risk support"
                            : riskLevel === "yellow"
                              ? "Supervised field work"
                              : "High-risk responder task"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-command">Priority</p>
                  <div className="mt-2 grid gap-3">
                    {priorityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateTaskField("priority", option.value)}
                        className={`rounded-[22px] border px-4 py-3 text-left transition ${
                          taskForm.priority === option.value
                            ? "border-command bg-command text-white"
                            : "border-border bg-white/80 text-command hover:border-command/35"
                        }`}
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p
                          className={`mt-1 text-xs leading-5 ${
                            taskForm.priority === option.value
                              ? "text-white/76"
                              : "text-command-soft/75"
                          }`}
                        >
                          {option.helper}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {taskForm.riskLevel === "red" ? (
                <div className="rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                  <p className="text-sm font-semibold text-alert">
                    Only verified/trained responders should be assigned.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    Keep red-risk tasks tightly controlled and reserve them for
                    trained responders with verified assets, experience, and NGO oversight.
                  </p>
                </div>
              ) : null}

              <div className="rounded-[24px] border border-border bg-white/85 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-command">
                    Suggested for {taskForm.crisisType}
                  </p>
                  <Badge tone="safe">Template-assisted</Badge>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-command-soft/65">
                      Skill suggestions
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTaskTemplate.suggestedSkills.map((skill) => (
                        <Badge key={skill} tone="neutral">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-command-soft/65">
                      Resource suggestions
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTaskTemplate.suggestedResources.map((resource) => (
                        <Badge key={resource} tone="info">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-command-soft/65">
                      Asset suggestions
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTaskTemplate.priorityAssets.map((asset) => (
                        <Badge key={asset} tone="warn">
                          {asset}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {taskAiMessage ? (
                <div className="rounded-[24px] border border-safe/25 bg-safe/8 p-4">
                  <p className="text-sm font-semibold text-command">AI draft applied</p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {taskAiMessage}
                  </p>
                </div>
              ) : null}

              {taskFormError ? (
                <div className="rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                  <p className="text-sm font-semibold text-alert">Task creation failed</p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {taskFormError}
                  </p>
                </div>
              ) : null}

              {taskSuccessMessage ? (
                <div className="rounded-[24px] border border-safe/25 bg-safe/8 p-4">
                  <p className="text-sm font-semibold text-command">Task created</p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {taskSuccessMessage}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" size="lg" disabled={isCreatingTask}>
                  {isCreatingTask ? "Saving task..." : "Create task"}
                </Button>
                <Button type="button" variant="secondary" size="lg" onClick={applyTaskTemplate}>
                  Refill suggestions
                </Button>
              </div>
            </form>
          </section>

          <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Task board
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  Open and assigned work
                </h2>
              </div>
              <Badge tone="info">Live matching</Badge>
            </div>

            {taskLoadError ? (
              <div className="mt-6 rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                <p className="text-sm font-semibold text-alert">Task feed warning</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  {taskLoadError}
                </p>
              </div>
            ) : null}

            {isTasksLoading ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-border bg-white/80 p-5">
                <p className="text-sm font-semibold text-command">Loading tasks</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  Pulling any Firestore tasks linked to this crisis room.
                </p>
              </div>
            ) : null}

            <div className="mt-6 space-y-5">
              {relatedTasks.length > 0 ? (
                relatedTasks.map((task) => {
                  const taskMatches = matchesByTaskId[task.id] ?? [];
                  const taskError = matchErrorsByTaskId[task.id];
                  const taskSuccess = matchSuccessByTaskId[task.id];
                  const isLoadingMatches = loadingMatchesTaskId === task.id;
                  const hasStoredResults = Object.prototype.hasOwnProperty.call(
                    matchesByTaskId,
                    task.id,
                  );
                  const isMatchableTask = task.status === "open";

                  return (
                    <div key={task.id} className="space-y-4">
                      <TaskCard task={task} />

                      <div className="rounded-[28px] border border-border bg-white/84 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                              Volunteer matching
                            </p>
                            <p className="mt-2 text-sm leading-6 text-command-soft/78">
                              Uses distance, skills, assets, availability,
                              verification, and language or local context for this task.
                            </p>
                          </div>

                          {isMatchableTask ? (
                            <Button
                              variant="secondary"
                              onClick={() => handleFindVolunteers(task)}
                              disabled={isLoadingMatches}
                            >
                              {isLoadingMatches
                                ? "Finding volunteers..."
                                : hasStoredResults
                                  ? "Refresh volunteers"
                                  : "Find Volunteers"}
                            </Button>
                          ) : (
                            <Badge tone="safe">Task no longer open</Badge>
                          )}
                        </div>

                        {taskSuccess ? (
                          <div className="mt-4 rounded-[22px] border border-safe/25 bg-safe/8 p-4">
                            <p className="text-sm font-semibold text-command">
                              Assignment updated
                            </p>
                            <p className="mt-2 text-sm leading-6 text-command-soft/78">
                              {taskSuccess}
                            </p>
                          </div>
                        ) : null}

                        {taskError ? (
                          <div className="mt-4 rounded-[22px] border border-alert/25 bg-alert/8 p-4">
                            <p className="text-sm font-semibold text-alert">
                              Matching unavailable
                            </p>
                            <p className="mt-2 text-sm leading-6 text-command-soft/78">
                              {taskError}
                            </p>
                          </div>
                        ) : null}

                        {isLoadingMatches ? (
                          <div className="mt-4 rounded-[22px] border border-dashed border-border bg-mist/34 p-4">
                            <p className="text-sm font-semibold text-command">
                              Ranking volunteers
                            </p>
                            <p className="mt-2 text-sm leading-6 text-command-soft/78">
                              Fetching volunteer profiles from Firestore and scoring
                              them against this task.
                            </p>
                          </div>
                        ) : null}

                        {!isLoadingMatches && isMatchableTask && taskMatches.length > 0 ? (
                          <div className="mt-5 grid gap-4">
                            {taskMatches.map((match) => {
                              const isAssigned = (
                                task.assignedVolunteerIds ??
                                task.assignedVolunteers ??
                                []
                              ).includes(match.volunteer.id);
                              const matchKey = `${task.id}:${match.volunteer.id}`;

                              return (
                                <VolunteerMatchCard
                                  key={match.volunteer.id}
                                  volunteer={match.volunteer}
                                  score={match.score}
                                  reasons={match.reasons}
                                  distanceLabel={getVolunteerDistanceLabel(
                                    task,
                                    match.volunteer.location,
                                    crisis,
                                  )}
                                  isAssigned={isAssigned}
                                  isAssigning={assigningMatchKey === matchKey}
                                  onAssign={() => handleAssignVolunteer(task, match)}
                                />
                              );
                            })}
                          </div>
                        ) : null}

                        {!isLoadingMatches &&
                        isMatchableTask &&
                        hasStoredResults &&
                        taskMatches.length === 0 &&
                        !taskError ? (
                          <div className="mt-4 rounded-[22px] border border-dashed border-border bg-mist/34 p-4">
                            <p className="text-sm font-semibold text-command">
                              No volunteer profiles found yet
                            </p>
                            <p className="mt-2 text-sm leading-6 text-command-soft/78">
                              Firestore does not have volunteer profiles ready for this
                              task yet. Ask volunteers to finish their profile so they
                              can enter the ranking pool.
                            </p>
                          </div>
                        ) : null}

                        {!isMatchableTask ? (
                          <div className="mt-4 rounded-[22px] border border-border bg-mist/34 p-4">
                            <p className="text-sm font-semibold text-command">
                              Matching locked for this task
                            </p>
                            <p className="mt-2 text-sm leading-6 text-command-soft/78">
                              This task is currently marked as {task.status}, so new
                              volunteer searches are hidden until it returns to open
                              status.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-white/80 p-5">
                  <p className="text-sm font-semibold text-command">No tasks yet</p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    This crisis room is ready for task publishing. Create the
                    first relief task above and it will appear here immediately.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Matching console
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Assignment status
              </h2>
            </div>
            <Badge tone={activeMatchTask ? "info" : "neutral"}>
              {activeMatchTask ? "Task selected" : "Waiting for search"}
            </Badge>
          </div>
          <div className="mt-6 space-y-4">
            {activeMatchTask ? (
              <>
                <div className="rounded-[24px] border border-border bg-white/85 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                    Focused task
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-command">
                    {activeMatchTask.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {activeMatchTask.locationLabel ?? activeMatchTask.location.address}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-command-soft/70">
                    Window {activeMatchTask.window}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-white/85 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                      Ranked volunteers
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-command">
                      {activeTaskMatches.length}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-white/85 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                      Assigned so far
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-command">
                      {activeMatchTask.assignedCount}/{activeMatchTask.volunteersNeeded}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-white/80 p-5">
                <p className="text-sm font-semibold text-command">
                  Pick an open task to begin matching
                </p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  Use the Find Volunteers button on any open task to fetch profiles
                  from Firestore and rank them for assignment.
                </p>
              </div>
            )}

            <div className="rounded-[24px] border border-border bg-white/85 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                Ranking formula
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="info">30% distance</Badge>
                <Badge tone="neutral">25% skill match</Badge>
                <Badge tone="warn">20% asset match</Badge>
                <Badge tone="safe">10% availability</Badge>
                <Badge tone="safe">10% verification</Badge>
                <Badge tone="neutral">5% language and local match</Badge>
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-white/85 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                Assignment writes
              </p>
              <p className="mt-3 text-sm leading-6 text-command-soft/78">
                Each assignment creates a match document, updates the task assignment
                volunteer list, and writes a volunteer notification placeholder for
                the next communication step.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Resource needs
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-command">
              Current pledge gaps
            </h2>
          </div>
          <Button href="/donor" variant="secondary">
            Open donor view
          </Button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="rounded-[28px] border border-border bg-white/84 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                  NGO posting
                </p>
                <h3 className="mt-2 text-xl font-semibold text-command">
                  Post a resource need
                </h3>
              </div>
              <Badge tone="info">Donor board sync</Badge>
            </div>

            <form className="mt-5 space-y-5" onSubmit={handleResourceNeedSubmit}>
              <label className="block text-sm font-medium text-command">
                Resource type
                <select
                  className={inputClassName}
                  value={resourceNeedForm.label}
                  onChange={(event) => updateResourceNeedField("label", event.target.value)}
                >
                  {resourceNeedOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-command">
                  Quantity needed
                  <input
                    type="number"
                    min="1"
                    className={inputClassName}
                    placeholder="200"
                    value={resourceNeedForm.quantityNeeded}
                    onChange={(event) =>
                      updateResourceNeedField("quantityNeeded", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Deadline
                  <input
                    className={inputClassName}
                    placeholder="Within 24 hours"
                    value={resourceNeedForm.deadline}
                    onChange={(event) =>
                      updateResourceNeedField("deadline", event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-command">
                Location
                <input
                  className={inputClassName}
                  placeholder="Camp warehouse gate"
                  value={resourceNeedForm.location}
                  onChange={(event) => updateResourceNeedField("location", event.target.value)}
                  required
                />
              </label>

              <div>
                <p className="text-sm font-medium text-command">Urgency</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {resourceUrgencyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateResourceNeedField("urgency", option.value)}
                      className={`rounded-[22px] border px-4 py-3 text-left transition ${
                        resourceNeedForm.urgency === option.value
                          ? "border-command bg-command text-white"
                          : "border-border bg-white/80 text-command hover:border-command/35"
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p
                        className={`mt-1 text-xs leading-5 ${
                          resourceNeedForm.urgency === option.value
                            ? "text-white/76"
                            : "text-command-soft/75"
                        }`}
                      >
                        {option.helper}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {resourceFormError ? (
                <div className="rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                  <p className="text-sm font-semibold text-alert">Need post failed</p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {resourceFormError}
                  </p>
                </div>
              ) : null}

              {resourceSuccessMessage ? (
                <div className="rounded-[24px] border border-safe/25 bg-safe/8 p-4">
                  <p className="text-sm font-semibold text-command">Need posted</p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {resourceSuccessMessage}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" size="lg" disabled={isCreatingResourceNeed}>
                  {isCreatingResourceNeed ? "Posting..." : "Post resource need"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setResourceNeedForm(getDefaultResourceNeedFormValues(crisis))}
                >
                  Reset form
                </Button>
              </div>
            </form>
          </div>

          <div>
            {resourceLoadError ? (
              <div className="rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                <p className="text-sm font-semibold text-alert">Resource board warning</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  {resourceLoadError}
                </p>
              </div>
            ) : null}

            {isResourceNeedsLoading ? (
              <div className="rounded-[24px] border border-dashed border-border bg-white/80 p-5">
                <p className="text-sm font-semibold text-command">Loading resource needs</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  Pulling Firestore needs for this crisis room.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {relatedResources.length > 0 ? (
                relatedResources.map((need) => (
                  <ResourceCard
                    key={need.id}
                    need={need}
                    actionHref={`/donor/pledge/${need.id}`}
                    actionLabel="Open pledge page"
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-white/80 p-5 lg:col-span-2">
                  <p className="text-sm font-semibold text-command">
                    No resource pledges linked yet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    Add resource needs next and donor pledges will surface here for
                    this crisis room.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
