import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import {
  assignLocalVolunteerToTask,
  createLocalCertificateRecord,
  createLocalCrisis,
  createLocalMoneyDonationPledge,
  createLocalResourceAcknowledgementCertificate,
  createLocalResourceNeed,
  createLocalResourcePledge,
  createLocalTask,
  createLocalUserProfile,
  createLocalVolunteerMatch,
  createLocalVolunteerNotificationPlaceholder,
  getLocalCertificate,
  getLocalCertificates,
  getLocalCertificatesForCrisis,
  getLocalCertificatesForVolunteer,
  getLocalCrisis,
  getLocalCrises,
  getLocalResourceNeed,
  getLocalResourceNeeds,
  getLocalResourceNeedsForCrisis,
  getLocalResourcePledges,
  getLocalResourcePledgesForCrisis,
  getLocalTasks,
  getLocalTasksForCrisis,
  getLocalUserProfile,
  getLocalVolunteerMatches,
  getLocalVolunteerMatchesForCrisis,
  getLocalVolunteerMatchesForVolunteer,
  getLocalVolunteerProfiles,
  updateLocalTaskWorkflowStatus,
  updateLocalCrisisWorkflowStatus,
  updateLocalResourceNeedWorkflowStatus,
  updateLocalVolunteerMatchStatus,
} from "@/lib/local-database";
import type {
  Certificate,
  Crisis,
  CrisisCreateData,
  CrisisStatus,
  MoneyDonationPledgeCreateData,
  ReliefTask,
  ResourceNeed,
  ResourceNeedCreateData,
  ResourceNeedStatus,
  ResourcePledge,
  ResourcePledgeCreateData,
  TaskCreateData,
  TaskStatus,
  UserProfile,
  UserProfileData,
  VolunteerMatch,
  VolunteerMatchStatus,
  VolunteerProfile,
} from "@/types";

const USER_COLLECTION = "users";
const CRISIS_COLLECTION = "crises";
const TASK_COLLECTION = "tasks";
const RESOURCE_NEED_COLLECTION = "resourceNeeds";
const RESOURCE_PLEDGE_COLLECTION = "resourcePledges";
const MATCH_COLLECTION = "matches";
const CERTIFICATE_COLLECTION = "certificates";
const NOTIFICATION_COLLECTION = "notifications";

function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}

function shouldUseLocalDatabase() {
  return !isFirebaseConfigured;
}

function shouldFallbackToLocalDatabase(error: unknown) {
  if (!isFirebaseConfigured || error instanceof FirebaseError) {
    return true;
  }

  return error instanceof Error && error.message.includes("Firebase is not configured");
}

function mapFirestoreError(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "permission-denied":
        return "Firestore denied the request. Check your Firestore security rules.";
      case "unavailable":
        return "Firestore is currently unavailable. Please try again in a moment.";
      default:
        return error.message || "Something went wrong while talking to Firestore.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown Firestore error occurred.";
}

function toCleanStringList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function createSummary(description: string, fallbackTitle: string) {
  const normalized = description.replace(/\s+/g, " ").trim();

  if (normalized.length > 0) {
    return normalized.slice(0, 160);
  }

  return `${fallbackTitle} relief coordination room`;
}

function buildProviderHint(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("food")) {
    return "Food banks, kitchens, and dry ration donors";
  }

  if (normalized.includes("medicine") || normalized.includes("sanitary")) {
    return "Pharmacies, health partners, and medical supply donors";
  }

  if (normalized.includes("boat")) {
    return "Boat owners and flood-response transport partners";
  }

  if (normalized.includes("vehicle") || normalized.includes("generator")) {
    return "Transport owners and equipment support partners";
  }

  if (normalized.includes("school")) {
    return "Education support groups and school supply donors";
  }

  if (normalized.includes("shelter") || normalized.includes("blanket")) {
    return "Shelter support networks and camp supply donors";
  }

  return "Community donors and verified supply partners";
}

function getResourceNeedStatus(quantityPledged: number, quantityNeeded: number) {
  if (quantityPledged <= 0) {
    return "open" as const;
  }

  if (quantityPledged >= quantityNeeded) {
    return "fulfilled" as const;
  }

  return "partially-fulfilled" as const;
}

function getAssignedVolunteerIds(task: ReliefTask) {
  return [
    ...(task.assignedVolunteerIds ?? []),
    ...((task.assignedVolunteers ?? []) as string[]),
  ].filter(Boolean);
}

function getTaskStatusAfterVolunteerUpdate(
  currentTask: ReliefTask,
  assignedVolunteerIds: string[],
) {
  if (currentTask.status === "completed" || currentTask.status === "cancelled") {
    return currentTask.status;
  }

  if (currentTask.status === "in-progress") {
    return "in-progress" as const;
  }

  if (assignedVolunteerIds.length === 0) {
    return "open" as const;
  }

  return "assigned" as const;
}

function buildVolunteerProfileFromUserProfile(
  uid: string,
  userProfile: UserProfile,
): VolunteerProfile {
  const fallbackLocation = userProfile.location;
  const volunteerProfile = userProfile.volunteerProfile;

  return {
    id: volunteerProfile?.id || `volunteer-${uid}`,
    userId: volunteerProfile?.userId || uid,
    role: "volunteer",
    name: volunteerProfile?.name || userProfile.name,
    roleTitle: volunteerProfile?.roleTitle || "Volunteer responder",
    email: volunteerProfile?.email || userProfile.email,
    phone: volunteerProfile?.phone || userProfile.phone,
    city:
      volunteerProfile?.city ||
      volunteerProfile?.location.city ||
      fallbackLocation.city ||
      fallbackLocation.address,
    location: volunteerProfile?.location || fallbackLocation,
    skills: volunteerProfile?.skills ?? [],
    assets: volunteerProfile?.assets ?? [],
    languages: volunteerProfile?.languages ?? [],
    availability: volunteerProfile?.availability ?? "available_now",
    availableTime: volunteerProfile?.availableTime ?? "Flexible this week",
    emergencyAvailable: volunteerProfile?.emergencyAvailable ?? false,
    emergencyRadiusKm: volunteerProfile?.emergencyRadiusKm ?? 25,
    distanceKm: volunteerProfile?.distanceKm,
    responseRate: volunteerProfile?.responseRate,
    completedTasks: volunteerProfile?.completedTasks,
    createdAt: volunteerProfile?.createdAt || userProfile.createdAt,
    updatedAt: volunteerProfile?.updatedAt || userProfile.updatedAt,
    status: volunteerProfile?.status || userProfile.status,
    verified: volunteerProfile?.verified ?? userProfile.verified,
  };
}

function getReferenceLocation(task: ReliefTask, crisis: Crisis) {
  if (task.location.lat !== 0 || task.location.lng !== 0) {
    return task.location;
  }

  return crisis.location;
}

function calculateDistanceKm(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) {
  if (
    (origin.lat === 0 && origin.lng === 0) ||
    (destination.lat === 0 && destination.lng === 0)
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const startLatitude = toRadians(origin.lat);
  const endLatitude = toRadians(destination.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(earthRadiusKm * arc * 10) / 10;
}

export async function createUserProfile(uid: string, data: UserProfileData) {
  if (shouldUseLocalDatabase()) {
    return createLocalUserProfile(uid, data);
  }

  try {
    const database = getFirestoreDb();
    const documentRef = doc(database, USER_COLLECTION, uid);
    const existingSnapshot = await getDoc(documentRef);
    const now = new Date().toISOString();

    const profile: UserProfile = {
      uid,
      ...data,
      createdAt: existingSnapshot.exists()
        ? ((existingSnapshot.data() as Partial<UserProfile>).createdAt ?? now)
        : now,
      updatedAt: now,
    };

    await setDoc(documentRef, profile, { merge: true });

    return profile;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalUserProfile(uid, data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getUserProfile(uid: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalUserProfile(uid);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDoc(doc(database, USER_COLLECTION, uid));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as UserProfile;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalUserProfile(uid);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getVolunteerProfiles() {
  if (shouldUseLocalDatabase()) {
    return getLocalVolunteerProfiles();
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(
      query(collection(database, USER_COLLECTION), where("role", "==", "volunteer")),
    );

    return snapshot.docs
      .map((document) =>
        buildVolunteerProfileFromUserProfile(
          document.id,
          document.data() as UserProfile,
        ),
      )
      .sort((left, right) => {
        if (left.verified !== right.verified) {
          return Number(right.verified) - Number(left.verified);
        }

        return left.name.localeCompare(right.name);
      });
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalVolunteerProfiles();
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createCrisis(data: CrisisCreateData) {
  if (shouldUseLocalDatabase()) {
    return createLocalCrisis(data);
  }

  try {
    const title = data.title.trim();
    const address = data.location.address.trim();
    const contactPerson = data.contactPerson.trim();

    if (!title || !address || !contactPerson) {
      throw new Error("Please complete the title, location, and contact person fields.");
    }

    const database = getFirestoreDb();
    const documentRef = doc(collection(database, CRISIS_COLLECTION));
    const now = new Date().toISOString();
    const urgentNeeds = toCleanStringList(data.urgentNeeds);
    const requiredResources = toCleanStringList(data.requiredResources);
    const suggestedSkills = toCleanStringList(data.suggestedSkills);

    const crisis: Crisis = {
      id: documentRef.id,
      title,
      type: data.type,
      summary: data.summary?.trim() || createSummary(data.description, title),
      description: data.description.trim(),
      location: {
        lat: data.location.lat,
        lng: data.location.lng,
        address,
        city: data.location.city?.trim() || undefined,
        state: data.location.state?.trim() || undefined,
      },
      riskLevel: data.riskLevel,
      needs: urgentNeeds,
      urgentNeeds,
      requiredResources,
      suggestedSkills,
      familiesAffected: Math.max(0, data.familiesAffected),
      matchedVolunteers: 0,
      openTasks: 0,
      contactPerson,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
      status: data.status ?? "active",
      verified: data.verified ?? false,
    };

    await setDoc(documentRef, crisis);

    return crisis;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalCrisis(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getCrisis(id: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalCrisis(id);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDoc(doc(database, CRISIS_COLLECTION, id));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as Crisis;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalCrisis(id);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getAllCrises() {
  if (shouldUseLocalDatabase()) {
    return getLocalCrises();
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(collection(database, CRISIS_COLLECTION));

    return snapshot.docs
      .map((document) => document.data() as Crisis)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalCrises();
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function updateCrisisWorkflowStatus(
  crisis: Crisis,
  status: CrisisStatus,
) {
  if (shouldUseLocalDatabase()) {
    return updateLocalCrisisWorkflowStatus(crisis, status);
  }

  try {
    const database = getFirestoreDb();
    const now = new Date().toISOString();
    const crisisRef = doc(database, CRISIS_COLLECTION, crisis.id);
    const crisisSnapshot = await getDoc(crisisRef);
    const currentCrisis = crisisSnapshot.exists()
      ? (crisisSnapshot.data() as Crisis)
      : crisis;
    const updatedCrisis: Crisis = {
      ...currentCrisis,
      status,
      openTasks: status === "resolved" ? 0 : currentCrisis.openTasks,
      updatedAt: now,
    };

    await setDoc(crisisRef, updatedCrisis, { merge: true });

    if (status === "resolved") {
      const [tasksSnapshot, resourcesSnapshot, matchesSnapshot, pledgesSnapshot] =
        await Promise.all([
          getDocs(
            query(collection(database, TASK_COLLECTION), where("crisisId", "==", crisis.id)),
          ),
          getDocs(
            query(
              collection(database, RESOURCE_NEED_COLLECTION),
              where("crisisId", "==", crisis.id),
            ),
          ),
          getDocs(
            query(collection(database, MATCH_COLLECTION), where("crisisId", "==", crisis.id)),
          ),
          getDocs(
            query(
              collection(database, RESOURCE_PLEDGE_COLLECTION),
              where("crisisId", "==", crisis.id),
            ),
          ),
        ]);

      await Promise.all([
        ...tasksSnapshot.docs.map((taskDocument) => {
          const task = taskDocument.data() as ReliefTask;

          return setDoc(
            taskDocument.ref,
            {
              ...task,
              status:
                task.status === "cancelled" || task.status === "completed"
                  ? task.status
                  : "completed",
              updatedAt: now,
            } satisfies ReliefTask,
            { merge: true },
          );
        }),
        ...resourcesSnapshot.docs.map((needDocument) => {
          const need = needDocument.data() as ResourceNeed;

          return setDoc(
            needDocument.ref,
            {
              ...need,
              status:
                need.status === "fulfilled" || need.status === "closed"
                  ? need.status
                  : "closed",
              updatedAt: now,
            } satisfies ResourceNeed,
            { merge: true },
          );
        }),
        ...matchesSnapshot.docs.map((matchDocument) => {
          const match = matchDocument.data() as VolunteerMatch;

          return setDoc(
            matchDocument.ref,
            {
              ...match,
              status:
                match.status === "accepted" || match.status === "assigned"
                  ? "completed"
                  : match.status,
              updatedAt: now,
            } satisfies VolunteerMatch,
            { merge: true },
          );
        }),
        ...pledgesSnapshot.docs.map((pledgeDocument) => {
          const pledge = pledgeDocument.data() as ResourcePledge;

          return setDoc(
            pledgeDocument.ref,
            {
              ...pledge,
              status:
                pledge.status === "pending" || pledge.status === "verified"
                  ? "fulfilled"
                  : pledge.status,
              updatedAt: now,
            } satisfies ResourcePledge,
            { merge: true },
          );
        }),
      ]);
    }

    return {
      crisis: updatedCrisis,
      tasks: await getTasksForCrisis(crisis.id),
      resourceNeeds: await getResourceNeedsForCrisis(crisis.id),
      resourcePledges: await getResourcePledgesForCrisis(crisis.id),
      matches: await getVolunteerMatchesForCrisis(crisis.id),
    };
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return updateLocalCrisisWorkflowStatus(crisis, status);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createTask(data: TaskCreateData) {
  if (shouldUseLocalDatabase()) {
    return createLocalTask(data);
  }

  try {
    const title = data.title.trim();
    const address = data.location.address.trim();
    const window = data.window.trim();
    const description = data.description.trim();

    if (!data.crisisId || !title || !address || !window) {
      throw new Error("Please complete the task title, location, and time window.");
    }

    const database = getFirestoreDb();
    const documentRef = doc(collection(database, TASK_COLLECTION));
    const now = new Date().toISOString();

    const task: ReliefTask = {
      id: documentRef.id,
      crisisId: data.crisisId,
      title,
      description,
      location: {
        lat: data.location.lat,
        lng: data.location.lng,
        address,
        city: data.location.city?.trim() || undefined,
        state: data.location.state?.trim() || undefined,
      },
      locationLabel: address,
      riskLevel: data.riskLevel,
      requiredSkills: toCleanStringList(data.requiredSkills),
      requiredResources: data.requiredResources
        ? toCleanStringList(data.requiredResources)
        : [],
      requiredAssets: toCleanStringList(data.requiredAssets),
      volunteersNeeded: Math.max(1, data.volunteersNeeded),
      assignedCount: 0,
      assignedVolunteers: [],
      assignedVolunteerIds: [],
      window,
      languagePreference: data.languagePreference?.trim() || undefined,
      priority: data.priority,
      createdAt: now,
      updatedAt: now,
      status: data.status ?? "open",
      verified: data.verified ?? false,
    };

    await setDoc(documentRef, task);

    const crisisRef = doc(database, CRISIS_COLLECTION, data.crisisId);
    const crisisSnapshot = await getDoc(crisisRef);

    if (crisisSnapshot.exists()) {
      await updateDoc(crisisRef, {
        openTasks: increment(1),
        updatedAt: now,
      });
    }

    return task;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalTask(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getTasksForCrisis(crisisId: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalTasksForCrisis(crisisId);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(
      query(collection(database, TASK_COLLECTION), where("crisisId", "==", crisisId)),
    );

    return snapshot.docs
      .map((document) => document.data() as ReliefTask)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalTasksForCrisis(crisisId);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getAllTasks() {
  if (shouldUseLocalDatabase()) {
    return getLocalTasks();
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(collection(database, TASK_COLLECTION));

    return snapshot.docs
      .map((document) => document.data() as ReliefTask)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalTasks();
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createResourceNeed(data: ResourceNeedCreateData) {
  if (shouldUseLocalDatabase()) {
    return createLocalResourceNeed(data);
  }

  try {
    const label = data.label.trim();
    const address = data.location.address.trim();
    const deadline = data.deadline.trim();

    if (!data.crisisId || !label || !address || !deadline) {
      throw new Error("Please complete the need label, location, and deadline.");
    }

    const database = getFirestoreDb();
    const documentRef = doc(collection(database, RESOURCE_NEED_COLLECTION));
    const now = new Date().toISOString();

    const need: ResourceNeed = {
      id: documentRef.id,
      crisisId: data.crisisId,
      label,
      category: data.category?.trim() || label.toLowerCase(),
      location: {
        lat: data.location.lat,
        lng: data.location.lng,
        address,
        city: data.location.city?.trim() || undefined,
        state: data.location.state?.trim() || undefined,
      },
      locationLabel: address,
      quantityNeeded: Math.max(1, data.quantityNeeded),
      quantityPledged: 0,
      urgency: data.urgency,
      deadline,
      providerHint: data.providerHint?.trim() || buildProviderHint(label),
      createdAt: now,
      updatedAt: now,
      status: data.status ?? "open",
      verified: data.verified ?? false,
    };

    await setDoc(documentRef, need);

    return need;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalResourceNeed(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getResourceNeed(id: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalResourceNeed(id);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDoc(doc(database, RESOURCE_NEED_COLLECTION, id));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as ResourceNeed;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalResourceNeed(id);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getResourceNeedsForCrisis(crisisId: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalResourceNeedsForCrisis(crisisId);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(
      query(
        collection(database, RESOURCE_NEED_COLLECTION),
        where("crisisId", "==", crisisId),
      ),
    );

    return snapshot.docs
      .map((document) => document.data() as ResourceNeed)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalResourceNeedsForCrisis(crisisId);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getAllResourceNeeds() {
  if (shouldUseLocalDatabase()) {
    return getLocalResourceNeeds();
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(collection(database, RESOURCE_NEED_COLLECTION));

    return snapshot.docs
      .map((document) => document.data() as ResourceNeed)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalResourceNeeds();
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function updateResourceNeedWorkflowStatus(
  resourceNeed: ResourceNeed,
  status: ResourceNeedStatus,
) {
  if (shouldUseLocalDatabase()) {
    return updateLocalResourceNeedWorkflowStatus(resourceNeed, status);
  }

  try {
    const database = getFirestoreDb();
    const now = new Date().toISOString();
    const needRef = doc(database, RESOURCE_NEED_COLLECTION, resourceNeed.id);
    const needSnapshot = await getDoc(needRef);
    const currentNeed = needSnapshot.exists()
      ? (needSnapshot.data() as ResourceNeed)
      : resourceNeed;
    const updatedNeed: ResourceNeed = {
      ...currentNeed,
      quantityPledged:
        status === "fulfilled"
          ? Math.max(currentNeed.quantityPledged, currentNeed.quantityNeeded)
          : currentNeed.quantityPledged,
      status,
      updatedAt: now,
    };

    await setDoc(needRef, updatedNeed, { merge: true });

    if (status === "fulfilled" || status === "closed") {
      const pledgeSnapshot = await getDocs(
        query(
          collection(database, RESOURCE_PLEDGE_COLLECTION),
          where("resourceNeedId", "==", resourceNeed.id),
        ),
      );

      await Promise.all(
        pledgeSnapshot.docs.map((pledgeDocument) => {
          const pledge = pledgeDocument.data() as ResourcePledge;

          return setDoc(
            pledgeDocument.ref,
            {
              ...pledge,
              status: "fulfilled",
              updatedAt: now,
            } satisfies ResourcePledge,
            { merge: true },
          );
        }),
      );
    }

    return {
      resourceNeed: updatedNeed,
      resourcePledges: await getResourcePledgesForCrisis(updatedNeed.crisisId),
    };
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return updateLocalResourceNeedWorkflowStatus(resourceNeed, status);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createResourcePledge(
  data: ResourcePledgeCreateData & { resourceNeed: ResourceNeed },
) {
  if (shouldUseLocalDatabase()) {
    return createLocalResourcePledge(data);
  }

  try {
    const database = getFirestoreDb();
    const now = new Date().toISOString();
    const quantity = data.quantity ?? 0;
    const amount = data.amount ?? 0;

    if (quantity <= 0 && amount <= 0) {
      throw new Error("Please enter a valid pledge quantity or amount.");
    }

    const resourceNeedRef = doc(database, RESOURCE_NEED_COLLECTION, data.resourceNeed.id);
    const needSnapshot = await getDoc(resourceNeedRef);
    const currentNeed = needSnapshot.exists()
      ? (needSnapshot.data() as ResourceNeed)
      : data.resourceNeed;
    const nextQuantityPledged = currentNeed.quantityPledged + quantity;
    const updatedNeed: ResourceNeed = {
      ...currentNeed,
      providerHint: currentNeed.providerHint || buildProviderHint(currentNeed.label),
      quantityPledged: nextQuantityPledged,
      status: getResourceNeedStatus(nextQuantityPledged, currentNeed.quantityNeeded),
      updatedAt: now,
    };

    await setDoc(resourceNeedRef, updatedNeed, { merge: true });

    const pledgeRef = doc(collection(database, RESOURCE_PLEDGE_COLLECTION));
    const pledge: ResourcePledge = {
      id: pledgeRef.id,
      crisisId: updatedNeed.crisisId,
      resourceNeedId: updatedNeed.id,
      donorId: data.donorId,
      itemType: data.itemType.trim(),
      quantity: quantity > 0 ? quantity : undefined,
      amount: amount > 0 ? amount : undefined,
      note: data.note?.trim() || undefined,
      location: data.location,
      createdAt: now,
      updatedAt: now,
      status: data.status ?? "pending",
      verified: data.verified ?? false,
    };

    await setDoc(pledgeRef, pledge);

    return {
      pledge,
      resourceNeed: updatedNeed,
    };
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalResourcePledge(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createMoneyDonationPledge(data: MoneyDonationPledgeCreateData) {
  if (shouldUseLocalDatabase()) {
    return createLocalMoneyDonationPledge(data);
  }

  try {
    const amount = Number(data.amount);

    if (!data.crisisId || amount <= 0) {
      throw new Error("Please enter a valid donation amount before continuing.");
    }

    const database = getFirestoreDb();
    const pledgeRef = doc(collection(database, RESOURCE_PLEDGE_COLLECTION));
    const now = new Date().toISOString();
    const pledge: ResourcePledge = {
      id: pledgeRef.id,
      crisisId: data.crisisId,
      resourceNeedId: `campaign-${data.crisisId}`,
      donorId: data.donorId,
      itemType: data.itemType?.trim() || "money donation",
      amount,
      note: data.note?.trim() || undefined,
      location: data.location,
      createdAt: now,
      updatedAt: now,
      status: data.status ?? "pending",
      verified: data.verified ?? false,
    };

    await setDoc(pledgeRef, pledge);

    return pledge;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalMoneyDonationPledge(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getAllVolunteerMatches() {
  if (shouldUseLocalDatabase()) {
    return getLocalVolunteerMatches();
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(collection(database, MATCH_COLLECTION));

    return snapshot.docs
      .map((document) => document.data() as VolunteerMatch)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalVolunteerMatches();
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getVolunteerMatchesForCrisis(crisisId: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalVolunteerMatchesForCrisis(crisisId);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(
      query(collection(database, MATCH_COLLECTION), where("crisisId", "==", crisisId)),
    );

    return snapshot.docs
      .map((document) => document.data() as VolunteerMatch)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalVolunteerMatchesForCrisis(crisisId);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getVolunteerMatchesForVolunteer(volunteerId: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalVolunteerMatchesForVolunteer(volunteerId);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(
      query(collection(database, MATCH_COLLECTION), where("volunteerId", "==", volunteerId)),
    );

    return snapshot.docs
      .map((document) => document.data() as VolunteerMatch)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalVolunteerMatchesForVolunteer(volunteerId);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getAllCertificates() {
  if (shouldUseLocalDatabase()) {
    return getLocalCertificates();
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(collection(database, CERTIFICATE_COLLECTION));

    return snapshot.docs
      .map((document) => document.data() as Certificate)
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalCertificates();
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getCertificatesForCrisis(crisisId: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalCertificatesForCrisis(crisisId);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(
      query(
        collection(database, CERTIFICATE_COLLECTION),
        where("crisisId", "==", crisisId),
      ),
    );

    return snapshot.docs
      .map((document) => document.data() as Certificate)
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalCertificatesForCrisis(crisisId);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getCertificate(id: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalCertificate(id);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDoc(doc(database, CERTIFICATE_COLLECTION, id));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as Certificate;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalCertificate(id);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getCertificatesForVolunteer(volunteerId: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalCertificatesForVolunteer(volunteerId);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(
      query(
        collection(database, CERTIFICATE_COLLECTION),
        where("volunteerId", "==", volunteerId),
      ),
    );

    return snapshot.docs
      .map((document) => document.data() as Certificate)
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalCertificatesForVolunteer(volunteerId);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getResourcePledgesForCrisis(crisisId: string) {
  if (shouldUseLocalDatabase()) {
    return getLocalResourcePledgesForCrisis(crisisId);
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(
      query(
        collection(database, RESOURCE_PLEDGE_COLLECTION),
        where("crisisId", "==", crisisId),
      ),
    );

    return snapshot.docs
      .map((document) => document.data() as ResourcePledge)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalResourcePledgesForCrisis(crisisId);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function getAllResourcePledges() {
  if (shouldUseLocalDatabase()) {
    return getLocalResourcePledges();
  }

  try {
    const database = getFirestoreDb();
    const snapshot = await getDocs(collection(database, RESOURCE_PLEDGE_COLLECTION));

    return snapshot.docs
      .map((document) => document.data() as ResourcePledge)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return getLocalResourcePledges();
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function assignVolunteerToTask(
  task: ReliefTask,
  volunteerId: string,
) {
  if (shouldUseLocalDatabase()) {
    return assignLocalVolunteerToTask(task, volunteerId);
  }

  try {
    const database = getFirestoreDb();
    const now = new Date().toISOString();
    const documentRef = doc(database, TASK_COLLECTION, task.id);
    const snapshot = await getDoc(documentRef);
    const currentTask = snapshot.exists() ? (snapshot.data() as ReliefTask) : task;
    const currentAssignedVolunteerIds =
      currentTask.assignedVolunteerIds ?? currentTask.assignedVolunteers ?? [];

    if (currentAssignedVolunteerIds.includes(volunteerId)) {
      throw new Error("This volunteer is already assigned to the task.");
    }

    const nextAssignedVolunteerIds = [...currentAssignedVolunteerIds, volunteerId];
    const nextAssignedCount = Math.max(
      currentTask.assignedCount + 1,
      nextAssignedVolunteerIds.length,
    );

    const nextTask: ReliefTask = {
      ...currentTask,
      assignedVolunteers: nextAssignedVolunteerIds,
      assignedVolunteerIds: nextAssignedVolunteerIds,
      assignedCount: nextAssignedCount,
      status:
        nextAssignedCount >= currentTask.volunteersNeeded ? "assigned" : currentTask.status,
      updatedAt: now,
    };

    await setDoc(documentRef, nextTask, { merge: true });

    return nextTask;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return assignLocalVolunteerToTask(task, volunteerId);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function updateVolunteerMatchStatus(data: {
  match: VolunteerMatch;
  task: ReliefTask;
  status: VolunteerMatchStatus;
}) {
  if (shouldUseLocalDatabase()) {
    return updateLocalVolunteerMatchStatus(data);
  }

  try {
    const database = getFirestoreDb();
    const now = new Date().toISOString();
    const matchRef = doc(database, MATCH_COLLECTION, data.match.id);
    const taskRef = doc(database, TASK_COLLECTION, data.task.id);
    const [matchSnapshot, taskSnapshot] = await Promise.all([
      getDoc(matchRef),
      getDoc(taskRef),
    ]);
    const currentMatch = matchSnapshot.exists()
      ? (matchSnapshot.data() as VolunteerMatch)
      : data.match;
    const currentTask = taskSnapshot.exists()
      ? (taskSnapshot.data() as ReliefTask)
      : data.task;
    const currentAssignedVolunteerIds = getAssignedVolunteerIds(currentTask);
    const nextAssignedVolunteerIds =
      data.status === "accepted"
        ? Array.from(new Set([...currentAssignedVolunteerIds, currentMatch.volunteerId]))
        : data.status === "declined"
          ? currentAssignedVolunteerIds.filter(
              (volunteerId) => volunteerId !== currentMatch.volunteerId,
            )
          : currentAssignedVolunteerIds;

    const updatedTask: ReliefTask = {
      ...currentTask,
      assignedVolunteers: nextAssignedVolunteerIds,
      assignedVolunteerIds: nextAssignedVolunteerIds,
      assignedCount: nextAssignedVolunteerIds.length,
      status: getTaskStatusAfterVolunteerUpdate(currentTask, nextAssignedVolunteerIds),
      updatedAt: now,
    };

    const updatedMatch: VolunteerMatch = {
      ...currentMatch,
      status: data.status,
      updatedAt: now,
    };

    await Promise.all([
      setDoc(matchRef, updatedMatch, { merge: true }),
      setDoc(taskRef, updatedTask, { merge: true }),
    ]);

    return {
      match: updatedMatch,
      task: updatedTask,
    };
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return updateLocalVolunteerMatchStatus(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function updateTaskWorkflowStatus(task: ReliefTask, status: TaskStatus) {
  if (shouldUseLocalDatabase()) {
    return updateLocalTaskWorkflowStatus(task, status);
  }

  try {
    const database = getFirestoreDb();
    const taskRef = doc(database, TASK_COLLECTION, task.id);
    const taskSnapshot = await getDoc(taskRef);
    const currentTask = taskSnapshot.exists()
      ? (taskSnapshot.data() as ReliefTask)
      : task;
    const now = new Date().toISOString();
    const updatedTask: ReliefTask = {
      ...currentTask,
      status,
      updatedAt: now,
    };

    await setDoc(taskRef, updatedTask, { merge: true });

    return updatedTask;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return updateLocalTaskWorkflowStatus(task, status);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createCertificateRecord(data: {
  task: ReliefTask;
  crisis: Crisis;
  volunteer: VolunteerProfile;
  ngoName: string;
  serviceHours?: number;
}) {
  if (shouldUseLocalDatabase()) {
    return createLocalCertificateRecord(data);
  }

  try {
    const database = getFirestoreDb();
    const documentRef = doc(
      database,
      CERTIFICATE_COLLECTION,
      `${data.task.id}_${data.volunteer.id}`,
    );
    const existingSnapshot = await getDoc(documentRef);
    const now = new Date().toISOString();
    const volunteerToken = data.volunteer.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
    const dateToken = now.slice(0, 10).replace(/-/g, "");
    const certificateId = `${dateToken}-${volunteerToken || "VOL"}`;
    const certificate: Certificate = {
      id: documentRef.id,
      volunteerId: data.volunteer.id,
      taskId: data.task.id,
      crisisId: data.crisis.id,
      volunteerName: data.volunteer.name,
      ngoName: data.ngoName,
      crisisTitle: data.crisis.title,
      taskTitle: data.task.title,
      serviceDate: now.slice(0, 10),
      certificateId,
      certificateNumber: certificateId,
      serviceHours: Math.max(2, data.serviceHours ?? 4),
      verificationQrPlaceholder: `Verification QR placeholder for ${certificateId}`,
      issuedAt: now,
      location: data.task.location,
      createdAt: existingSnapshot.exists()
        ? ((existingSnapshot.data() as Certificate).createdAt ?? now)
        : now,
      updatedAt: now,
      status: "issued",
      verified: data.volunteer.verified,
    };

    await setDoc(documentRef, certificate, { merge: true });

    return certificate;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalCertificateRecord(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createResourceAcknowledgementCertificate(data: {
  crisis: Crisis;
  resourceNeed: ResourceNeed;
  pledge: ResourcePledge;
  ngoName: string;
}) {
  if (shouldUseLocalDatabase()) {
    return createLocalResourceAcknowledgementCertificate(data);
  }

  try {
    const database = getFirestoreDb();
    const documentRef = doc(
      database,
      CERTIFICATE_COLLECTION,
      `${data.resourceNeed.id}_${data.pledge.id}`,
    );
    const existingSnapshot = await getDoc(documentRef);
    const now = new Date().toISOString();
    const helperName = data.pledge.donorId
      .replace(/^donor[-_]/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (value) => value.toUpperCase());
    const helperToken = data.pledge.donorId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6)
      .toUpperCase();
    const dateToken = now.slice(0, 10).replace(/-/g, "");
    const certificateId = `RSRC-${dateToken}-${helperToken || "HELP"}`;
    const contribution = data.pledge.quantity
      ? `${data.pledge.quantity} ${data.pledge.itemType}`
      : `Rs ${data.pledge.amount ?? 0} support`;
    const certificate: Certificate = {
      id: documentRef.id,
      volunteerId: data.pledge.donorId,
      taskId: data.resourceNeed.id,
      crisisId: data.crisis.id,
      volunteerName: helperName || data.pledge.donorId,
      ngoName: data.ngoName,
      crisisTitle: data.crisis.title,
      taskTitle: `Resource support: ${data.resourceNeed.label} (${contribution})`,
      serviceDate: now.slice(0, 10),
      certificateId,
      certificateNumber: certificateId,
      serviceHours: 0,
      verificationQrPlaceholder: `Verification QR placeholder for ${certificateId}`,
      issuedAt: now,
      location: data.resourceNeed.location,
      createdAt: existingSnapshot.exists()
        ? ((existingSnapshot.data() as Certificate).createdAt ?? now)
        : now,
      updatedAt: now,
      status: "issued",
      verified: data.pledge.verified,
    };
    const pledgeRef = doc(database, RESOURCE_PLEDGE_COLLECTION, data.pledge.id);

    await Promise.all([
      setDoc(documentRef, certificate, { merge: true }),
      setDoc(
        pledgeRef,
        {
          ...data.pledge,
          status: "fulfilled",
          updatedAt: now,
        } satisfies ResourcePledge,
        { merge: true },
      ),
    ]);

    return certificate;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalResourceAcknowledgementCertificate(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createVolunteerMatch(data: {
  crisis: Crisis;
  task: ReliefTask;
  volunteer: VolunteerProfile;
  score: number;
  reasons: string[];
}) {
  if (shouldUseLocalDatabase()) {
    return createLocalVolunteerMatch(data);
  }

  try {
    const database = getFirestoreDb();
    const documentRef = doc(
      database,
      MATCH_COLLECTION,
      `${data.task.id}_${data.volunteer.id}`,
    );
    const now = new Date().toISOString();
    const referenceLocation = getReferenceLocation(data.task, data.crisis);
    const distanceKm = calculateDistanceKm(referenceLocation, data.volunteer.location);

    const match: VolunteerMatch = {
      id: documentRef.id,
      crisisId: data.crisis.id,
      taskId: data.task.id,
      volunteerId: data.volunteer.id,
      score: data.score,
      reasons: data.reasons,
      distanceKm: distanceKm ?? undefined,
      location: referenceLocation,
      createdAt: now,
      updatedAt: now,
      status: "assigned",
      verified: data.volunteer.verified,
    };

    await setDoc(documentRef, match);

    return match;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalVolunteerMatch(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}

export async function createVolunteerNotificationPlaceholder(data: {
  crisis: Crisis;
  task: ReliefTask;
  volunteer: VolunteerProfile;
}) {
  if (shouldUseLocalDatabase()) {
    return createLocalVolunteerNotificationPlaceholder(data);
  }

  try {
    const database = getFirestoreDb();
    const documentRef = doc(collection(database, NOTIFICATION_COLLECTION));
    const now = new Date().toISOString();

    const notification = {
      id: documentRef.id,
      type: "task_assignment",
      recipientUserId: data.volunteer.userId ?? data.volunteer.id,
      volunteerId: data.volunteer.id,
      crisisId: data.crisis.id,
      taskId: data.task.id,
      title: `New assignment: ${data.task.title}`,
      message: `You have been assigned to ${data.task.title} for ${data.crisis.title}.`,
      status: "pending-send",
      placeholder: true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(documentRef, notification);

    return notification;
  } catch (error) {
    if (shouldFallbackToLocalDatabase(error)) {
      return createLocalVolunteerNotificationPlaceholder(data);
    }

    throw new Error(mapFirestoreError(error));
  }
}
