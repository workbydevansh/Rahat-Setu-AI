import {
  activeCrises,
  certificates as seedCertificates,
  getAllNGOProfiles,
  ngoRecentMatches,
  resourceNeeds as seedResourceNeeds,
  resourcePledges as seedResourcePledges,
  tasks as seedTasks,
  volunteers as seedVolunteers,
} from "@/data/mock-data";
import type {
  Certificate,
  Crisis,
  CrisisCreateData,
  CrisisStatus,
  DashboardStat,
  Location,
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

const DATABASE_KEY = "rahatsetu.local.database.v2";
const SESSION_KEY = "rahatsetu.local.session.v1";
const DATABASE_UPDATED_EVENT = "rahatsetu-database-updated";

export interface LocalDatabaseEvent {
  id: string;
  collection: string;
  action: string;
  title: string;
  description: string;
  actor?: string;
  crisisId?: string;
  recordId?: string;
  resourceNeedId?: string;
  quantity?: number;
  amount?: number;
  createdAt: string;
  tone: DashboardStat["tone"];
}

export interface LocalDatabaseSnapshot {
  users: UserProfile[];
  volunteers: VolunteerProfile[];
  crises: Crisis[];
  tasks: ReliefTask[];
  resourceNeeds: ResourceNeed[];
  resourcePledges: ResourcePledge[];
  matches: VolunteerMatch[];
  certificates: Certificate[];
  activityLog: LocalDatabaseEvent[];
  authAccounts: Array<{
    uid: string;
    email: string;
    password: string;
  }>;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  const cryptoLike = globalThis.crypto;

  if (cryptoLike && "randomUUID" in cryptoLike) {
    return `${prefix}-${cryptoLike.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function byUpdatedAt<T extends { updatedAt?: string; createdAt?: string }>(
  left: T,
  right: T,
) {
  return (right.updatedAt ?? right.createdAt ?? "").localeCompare(
    left.updatedAt ?? left.createdAt ?? "",
  );
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  return [item, ...items.filter((entry) => entry.id !== item.id)];
}

function list(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function createSummary(description: string, fallbackTitle: string) {
  const normalized = description.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 160) : `${fallbackTitle} relief coordination room`;
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

function makeLocation(location: Location) {
  return {
    lat: location.lat,
    lng: location.lng,
    address: location.address.trim(),
    city: location.city?.trim() || undefined,
    state: location.state?.trim() || undefined,
  };
}

function seedUsers(): UserProfile[] {
  const ngoUsers = getAllNGOProfiles().map((ngo) => ({
    uid: `seed-user-${ngo.id}`,
    role: "ngo" as const,
    name: ngo.contactName ?? ngo.organizationName,
    email: ngo.email ?? `${ngo.id}@demo.local`,
    phone: ngo.phone ?? "",
    location: ngo.location,
    createdAt: ngo.createdAt,
    updatedAt: ngo.updatedAt,
    status: ngo.status,
    verified: ngo.verified,
    ngoProfile: ngo,
    volunteerProfile: null,
    donorProfile: null,
  }));

  const volunteerUsers = seedVolunteers.map((volunteer) => ({
    uid: `seed-user-${volunteer.id}`,
    role: "volunteer" as const,
    name: volunteer.name,
    email: volunteer.email ?? `${volunteer.id}@demo.local`,
    phone: volunteer.phone ?? "",
    location: volunteer.location,
    createdAt: volunteer.createdAt,
    updatedAt: volunteer.updatedAt,
    status: volunteer.status,
    verified: volunteer.verified,
    ngoProfile: null,
    volunteerProfile: volunteer,
    donorProfile: null,
  }));

  return [
    ...ngoUsers,
    ...volunteerUsers,
    {
      uid: "seed-user-demo-admin",
      role: "admin",
      name: "Demo Admin",
      email: "admin@demo.local",
      phone: "+91 90000 00000",
      location: {
        lat: 0,
        lng: 0,
        address: "Demo operations desk",
        city: "Demo City",
      },
      createdAt: "2026-04-20T00:00:00.000Z",
      updatedAt: "2026-04-20T00:00:00.000Z",
      status: "active",
      verified: true,
      ngoProfile: null,
      volunteerProfile: null,
      donorProfile: null,
    },
  ];
}

function seedActivity(): LocalDatabaseEvent[] {
  const crisisEvents = activeCrises.map((crisis) => ({
    id: `seed-event-crisis-${crisis.id}`,
    collection: "crises",
    action: "Crisis room opened",
    title: crisis.title,
    description: `${crisis.familiesAffected} families affected near ${crisis.location.address}.`,
    actor: crisis.contactPerson,
    crisisId: crisis.id,
    recordId: crisis.id,
    createdAt: crisis.createdAt,
    tone: "alert" as const,
  }));

  const pledgeEvents = seedResourcePledges.map((pledge) => ({
    id: `seed-event-pledge-${pledge.id}`,
    collection: "resourcePledges",
    action: pledge.amount ? "Money pledge recorded" : "Resource pledge recorded",
    title: pledge.itemType,
    description: pledge.amount
      ? `Demo donation pledge of ${pledge.amount} recorded for campaign history.`
      : `${pledge.quantity ?? 0} ${pledge.itemType} pledged by ${pledge.donorId}.`,
    actor: pledge.donorId,
    crisisId: pledge.crisisId,
    recordId: pledge.id,
    resourceNeedId: pledge.resourceNeedId,
    quantity: pledge.quantity,
    amount: pledge.amount,
    createdAt: pledge.createdAt,
    tone: pledge.status === "fulfilled" ? ("safe" as const) : ("warn" as const),
  }));

  const taskEvents = seedTasks.map((task) => ({
    id: `seed-event-task-${task.id}`,
    collection: "tasks",
    action: "Task published",
    title: task.title,
    description: `${task.assignedCount}/${task.volunteersNeeded} volunteers assigned for ${task.location.address}.`,
    crisisId: task.crisisId,
    recordId: task.id,
    createdAt: task.createdAt,
    tone: task.riskLevel === "red" ? ("alert" as const) : ("info" as const),
  }));

  return [...crisisEvents, ...pledgeEvents, ...taskEvents].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function createSeedDatabase(): LocalDatabaseSnapshot {
  return {
    users: seedUsers(),
    volunteers: clone(seedVolunteers),
    crises: clone(activeCrises),
    tasks: clone(seedTasks),
    resourceNeeds: clone(seedResourceNeeds),
    resourcePledges: clone(seedResourcePledges),
    matches: clone(ngoRecentMatches),
    certificates: clone(seedCertificates),
    activityLog: seedActivity(),
    authAccounts: [
      {
        uid: "seed-user-demo-admin",
        email: "admin@demo.local",
        password: "demo123",
      },
    ],
  };
}

function readDatabase() {
  const seed = createSeedDatabase();

  if (!isBrowser()) {
    return seed;
  }

  const raw = window.localStorage.getItem(DATABASE_KEY);

  if (!raw) {
    window.localStorage.setItem(DATABASE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDatabaseSnapshot>;

    return {
      ...seed,
      ...parsed,
      users: parsed.users ?? seed.users,
      volunteers: parsed.volunteers ?? seed.volunteers,
      crises: parsed.crises ?? seed.crises,
      tasks: parsed.tasks ?? seed.tasks,
      resourceNeeds: parsed.resourceNeeds ?? seed.resourceNeeds,
      resourcePledges: parsed.resourcePledges ?? seed.resourcePledges,
      matches: parsed.matches ?? seed.matches,
      certificates: parsed.certificates ?? seed.certificates,
      activityLog: parsed.activityLog ?? seed.activityLog,
      authAccounts: parsed.authAccounts ?? seed.authAccounts,
    };
  } catch {
    window.localStorage.setItem(DATABASE_KEY, JSON.stringify(seed));
    return seed;
  }
}

function writeDatabase(database: LocalDatabaseSnapshot) {
  if (isBrowser()) {
    window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
    window.dispatchEvent(new Event(DATABASE_UPDATED_EVENT));
  }

  return database;
}

export function subscribeToLocalDatabaseChanges(callback: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === DATABASE_KEY) {
      callback();
    }
  };

  window.addEventListener(DATABASE_UPDATED_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(DATABASE_UPDATED_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function recordEvent(
  database: LocalDatabaseSnapshot,
  event: Omit<LocalDatabaseEvent, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
) {
  const entry: LocalDatabaseEvent = {
    ...event,
    id: event.id ?? createId("event"),
    createdAt: event.createdAt ?? nowIso(),
  };

  database.activityLog = [entry, ...database.activityLog].slice(0, 200);
}

export function getLocalDatabaseSnapshot() {
  return clone(readDatabase());
}

export function resetLocalDatabase() {
  const database = createSeedDatabase();
  writeDatabase(database);
  return clone(database);
}

export function createLocalAuthSession(user: Pick<UserProfile, "uid" | "email" | "name" | "role">) {
  if (isBrowser()) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("rahatsetu-auth-updated"));
  }

  return user;
}

export function getLocalAuthSession() {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Pick<UserProfile, "uid" | "email" | "name" | "role">;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearLocalAuthSession() {
  if (isBrowser()) {
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("rahatsetu-auth-updated"));
  }
}

export async function createLocalUserProfile(
  uid: string,
  data: UserProfileData,
  password?: string,
) {
  const database = readDatabase();
  const now = nowIso();
  const existingProfile = database.users.find((user) => user.uid === uid);
  const profile: UserProfile = {
    uid,
    ...data,
    createdAt: existingProfile?.createdAt ?? data.createdAt ?? now,
    updatedAt: now,
  };

  database.users = [
    profile,
    ...database.users.filter((user) => user.uid !== uid && user.email !== profile.email),
  ];

  if (profile.volunteerProfile) {
    database.volunteers = upsertById(database.volunteers, profile.volunteerProfile);
  }

  if (password) {
    database.authAccounts = [
      { uid, email: profile.email.toLowerCase(), password },
      ...database.authAccounts.filter(
        (account) => account.uid !== uid && account.email !== profile.email.toLowerCase(),
      ),
    ];
  }

  recordEvent(database, {
    collection: "users",
    action: "Profile saved",
    title: profile.name,
    description: `${profile.role.toUpperCase()} profile stored in the local demo database.`,
    actor: profile.email,
    recordId: profile.uid,
    tone: "safe",
  });

  writeDatabase(database);
  return profile;
}

export async function loginLocalUser(email: string, password: string) {
  const database = readDatabase();
  const account = database.authAccounts.find(
    (entry) => entry.email.toLowerCase() === email.trim().toLowerCase(),
  );

  if (!account || account.password !== password) {
    throw new Error(
      "No matching local demo account was found. Register once first, or use admin@demo.local with password demo123.",
    );
  }

  const profile = database.users.find((user) => user.uid === account.uid);

  if (!profile) {
    throw new Error("The local demo account exists, but its profile is missing.");
  }

  createLocalAuthSession(profile);
  return profile;
}

export async function getLocalUserProfile(uid: string) {
  return readDatabase().users.find((user) => user.uid === uid) ?? null;
}

export async function getLocalVolunteerProfiles() {
  const database = readDatabase();
  const fromUsers = database.users
    .map((user) => user.volunteerProfile)
    .filter((profile): profile is VolunteerProfile => Boolean(profile));
  const merged = [...database.volunteers, ...fromUsers];
  const seen = new Set<string>();

  return merged
    .filter((profile) => {
      if (seen.has(profile.id)) {
        return false;
      }

      seen.add(profile.id);
      return true;
    })
    .sort((left, right) => {
      if (left.verified !== right.verified) {
        return Number(right.verified) - Number(left.verified);
      }

      return left.name.localeCompare(right.name);
    });
}

export async function createLocalCrisis(data: CrisisCreateData) {
  const title = data.title.trim();
  const address = data.location.address.trim();
  const contactPerson = data.contactPerson.trim();

  if (!title || !address || !contactPerson) {
    throw new Error("Please complete the title, location, and contact person fields.");
  }

  const database = readDatabase();
  const now = nowIso();
  const crisis: Crisis = {
    id: createId("crisis"),
    title,
    type: data.type,
    summary: data.summary?.trim() || createSummary(data.description, title),
    description: data.description.trim(),
    location: makeLocation(data.location),
    riskLevel: data.riskLevel,
    needs: list(data.urgentNeeds),
    urgentNeeds: list(data.urgentNeeds),
    requiredResources: list(data.requiredResources),
    suggestedSkills: list(data.suggestedSkills),
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

  database.crises = upsertById(database.crises, crisis);
  recordEvent(database, {
    collection: "crises",
    action: "Crisis room opened",
    title: crisis.title,
    description: `${crisis.familiesAffected} families affected at ${crisis.location.address}.`,
    actor: crisis.contactPerson,
    crisisId: crisis.id,
    recordId: crisis.id,
    tone: "alert",
  });

  writeDatabase(database);
  return crisis;
}

export async function getLocalCrisis(id: string) {
  return readDatabase().crises.find((crisis) => crisis.id === id) ?? null;
}

export async function getLocalCrises() {
  return readDatabase().crises.sort(byUpdatedAt);
}

export async function createLocalTask(data: TaskCreateData) {
  const title = data.title.trim();
  const address = data.location.address.trim();
  const windowLabel = data.window.trim();

  if (!data.crisisId || !title || !address || !windowLabel) {
    throw new Error("Please complete the task title, location, and time window.");
  }

  const database = readDatabase();
  const now = nowIso();
  const task: ReliefTask = {
    id: createId("task"),
    crisisId: data.crisisId,
    title,
    description: data.description.trim(),
    location: makeLocation(data.location),
    locationLabel: address,
    riskLevel: data.riskLevel,
    requiredSkills: list(data.requiredSkills),
    requiredResources: data.requiredResources ? list(data.requiredResources) : [],
    requiredAssets: list(data.requiredAssets),
    volunteersNeeded: Math.max(1, data.volunteersNeeded),
    assignedCount: 0,
    assignedVolunteers: [],
    assignedVolunteerIds: [],
    window: windowLabel,
    languagePreference: data.languagePreference?.trim() || undefined,
    priority: data.priority,
    createdAt: now,
    updatedAt: now,
    status: data.status ?? "open",
    verified: data.verified ?? false,
  };

  database.tasks = upsertById(database.tasks, task);
  database.crises = database.crises.map((crisis) =>
    crisis.id === data.crisisId
      ? {
          ...crisis,
          openTasks: crisis.openTasks + 1,
          updatedAt: now,
        }
      : crisis,
  );
  recordEvent(database, {
    collection: "tasks",
    action: "Task published",
    title: task.title,
    description: `${task.volunteersNeeded} volunteers requested for ${task.location.address}.`,
    crisisId: task.crisisId,
    recordId: task.id,
    tone: task.riskLevel === "red" ? "alert" : "info",
  });

  writeDatabase(database);
  return task;
}

export async function getLocalTasksForCrisis(crisisId: string) {
  return readDatabase()
    .tasks.filter((task) => task.crisisId === crisisId)
    .sort(byUpdatedAt);
}

export async function getLocalTasks() {
  return readDatabase().tasks.sort(byUpdatedAt);
}

export async function createLocalResourceNeed(data: ResourceNeedCreateData) {
  const label = data.label.trim();
  const address = data.location.address.trim();
  const deadline = data.deadline.trim();

  if (!data.crisisId || !label || !address || !deadline) {
    throw new Error("Please complete the need label, location, and deadline.");
  }

  const database = readDatabase();
  const now = nowIso();
  const need: ResourceNeed = {
    id: createId("need"),
    crisisId: data.crisisId,
    label,
    category: data.category?.trim() || label.toLowerCase(),
    location: makeLocation(data.location),
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

  database.resourceNeeds = upsertById(database.resourceNeeds, need);
  recordEvent(database, {
    collection: "resourceNeeds",
    action: "Need raised",
    title: need.label,
    description: `${need.quantityNeeded} requested for ${need.deadline}.`,
    crisisId: need.crisisId,
    recordId: need.id,
    quantity: need.quantityNeeded,
    tone: need.urgency === "critical" ? "alert" : "warn",
  });

  writeDatabase(database);
  return need;
}

export async function getLocalResourceNeed(id: string) {
  return readDatabase().resourceNeeds.find((need) => need.id === id) ?? null;
}

export async function getLocalResourceNeedsForCrisis(crisisId: string) {
  return readDatabase()
    .resourceNeeds.filter((need) => need.crisisId === crisisId)
    .sort(byUpdatedAt);
}

export async function getLocalResourceNeeds() {
  return readDatabase().resourceNeeds.sort(byUpdatedAt);
}

export async function updateLocalResourceNeedWorkflowStatus(
  resourceNeed: ResourceNeed,
  status: ResourceNeedStatus,
) {
  const database = readDatabase();
  const now = nowIso();
  const currentNeed =
    database.resourceNeeds.find((need) => need.id === resourceNeed.id) ?? resourceNeed;
  const updatedNeed: ResourceNeed = {
    ...currentNeed,
    quantityPledged:
      status === "fulfilled"
        ? Math.max(currentNeed.quantityPledged, currentNeed.quantityNeeded)
        : currentNeed.quantityPledged,
    status,
    updatedAt: now,
  };

  database.resourceNeeds = upsertById(database.resourceNeeds, updatedNeed);

  if (status === "fulfilled" || status === "closed") {
    database.resourcePledges = database.resourcePledges.map((pledge) =>
      pledge.resourceNeedId === updatedNeed.id
        ? {
            ...pledge,
            status: "fulfilled",
            updatedAt: now,
          }
        : pledge,
    );
  }

  recordEvent(database, {
    collection: "resourceNeeds",
    action: status === "fulfilled" ? "Resource fulfilled" : "Resource need closed",
    title: updatedNeed.label,
    description:
      status === "fulfilled"
        ? `${updatedNeed.label} is fulfilled and no longer required.`
        : `${updatedNeed.label} is closed for this crisis.`,
    crisisId: updatedNeed.crisisId,
    recordId: updatedNeed.id,
    tone: "safe",
  });

  writeDatabase(database);
  return {
    resourceNeed: updatedNeed,
    resourcePledges: database.resourcePledges.filter(
      (pledge) => pledge.resourceNeedId === updatedNeed.id,
    ),
  };
}

export async function createLocalResourcePledge(
  data: ResourcePledgeCreateData & { resourceNeed: ResourceNeed },
) {
  const quantity = data.quantity ?? 0;
  const amount = data.amount ?? 0;

  if (quantity <= 0 && amount <= 0) {
    throw new Error("Please enter a valid pledge quantity or amount.");
  }

  const database = readDatabase();
  const now = nowIso();
  const currentNeed =
    database.resourceNeeds.find((need) => need.id === data.resourceNeed.id) ??
    data.resourceNeed;
  const nextQuantityPledged = currentNeed.quantityPledged + quantity;
  const updatedNeed: ResourceNeed = {
    ...currentNeed,
    providerHint: currentNeed.providerHint || buildProviderHint(currentNeed.label),
    quantityPledged: nextQuantityPledged,
    status: getResourceNeedStatus(nextQuantityPledged, currentNeed.quantityNeeded),
    updatedAt: now,
  };
  const pledge: ResourcePledge = {
    id: createId("pledge"),
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

  database.resourceNeeds = upsertById(database.resourceNeeds, updatedNeed);
  database.resourcePledges = upsertById(database.resourcePledges, pledge);
  recordEvent(database, {
    collection: "resourcePledges",
    action: "Resource pledge recorded",
    title: pledge.itemType,
    description: `${pledge.quantity ?? 0} ${pledge.itemType} pledged by ${pledge.donorId}.`,
    actor: pledge.donorId,
    crisisId: pledge.crisisId,
    recordId: pledge.id,
    resourceNeedId: pledge.resourceNeedId,
    quantity: pledge.quantity,
    amount: pledge.amount,
    tone: "safe",
  });

  writeDatabase(database);
  return {
    pledge,
    resourceNeed: updatedNeed,
  };
}

export async function createLocalMoneyDonationPledge(
  data: MoneyDonationPledgeCreateData,
) {
  const amount = Number(data.amount);

  if (!data.crisisId || amount <= 0) {
    throw new Error("Please enter a valid donation amount before continuing.");
  }

  const database = readDatabase();
  const now = nowIso();
  const pledge: ResourcePledge = {
    id: createId("money-pledge"),
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

  database.resourcePledges = upsertById(database.resourcePledges, pledge);
  recordEvent(database, {
    collection: "resourcePledges",
    action: "Money pledge recorded",
    title: pledge.itemType,
    description: `Demo donation pledge of ${amount} recorded for campaign history.`,
    actor: pledge.donorId,
    crisisId: pledge.crisisId,
    recordId: pledge.id,
    amount,
    tone: "safe",
  });

  writeDatabase(database);
  return pledge;
}

export async function getLocalResourcePledgesForCrisis(crisisId: string) {
  return readDatabase()
    .resourcePledges.filter((pledge) => pledge.crisisId === crisisId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getLocalResourcePledges() {
  return readDatabase().resourcePledges.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function getLocalVolunteerMatches() {
  return readDatabase().matches.sort(byUpdatedAt);
}

export async function getLocalVolunteerMatchesForCrisis(crisisId: string) {
  return readDatabase()
    .matches.filter((match) => match.crisisId === crisisId)
    .sort(byUpdatedAt);
}

export async function getLocalVolunteerMatchesForVolunteer(volunteerId: string) {
  return readDatabase()
    .matches.filter((match) => match.volunteerId === volunteerId)
    .sort(byUpdatedAt);
}

export async function getLocalCertificates() {
  return readDatabase().certificates.sort((left, right) =>
    right.issuedAt.localeCompare(left.issuedAt),
  );
}

export async function getLocalCertificatesForCrisis(crisisId: string) {
  return readDatabase()
    .certificates.filter((certificate) => certificate.crisisId === crisisId)
    .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));
}

export async function getLocalCertificate(id: string) {
  return readDatabase().certificates.find((certificate) => certificate.id === id) ?? null;
}

export async function getLocalCertificatesForVolunteer(volunteerId: string) {
  return readDatabase()
    .certificates.filter((certificate) => certificate.volunteerId === volunteerId)
    .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));
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

export async function assignLocalVolunteerToTask(
  task: ReliefTask,
  volunteerId: string,
) {
  const database = readDatabase();
  const now = nowIso();
  const currentTask = database.tasks.find((entry) => entry.id === task.id) ?? task;
  const currentAssignedVolunteerIds = getAssignedVolunteerIds(currentTask);

  if (currentAssignedVolunteerIds.includes(volunteerId)) {
    throw new Error("This volunteer is already assigned to the task.");
  }

  const nextAssignedVolunteerIds = [...currentAssignedVolunteerIds, volunteerId];
  const updatedTask: ReliefTask = {
    ...currentTask,
    assignedVolunteers: nextAssignedVolunteerIds,
    assignedVolunteerIds: nextAssignedVolunteerIds,
    assignedCount: nextAssignedVolunteerIds.length,
    status:
      nextAssignedVolunteerIds.length >= currentTask.volunteersNeeded
        ? "assigned"
        : currentTask.status,
    updatedAt: now,
  };

  database.tasks = upsertById(database.tasks, updatedTask);
  recordEvent(database, {
    collection: "tasks",
    action: "Volunteer assigned",
    title: updatedTask.title,
    description: `${volunteerId} assigned locally to ${updatedTask.title}.`,
    actor: volunteerId,
    crisisId: updatedTask.crisisId,
    recordId: updatedTask.id,
    tone: "safe",
  });

  writeDatabase(database);
  return updatedTask;
}

export async function updateLocalVolunteerMatchStatus(data: {
  match: VolunteerMatch;
  task: ReliefTask;
  status: VolunteerMatchStatus;
}) {
  const database = readDatabase();
  const now = nowIso();
  const currentMatch =
    database.matches.find((match) => match.id === data.match.id) ?? data.match;
  const currentTask =
    database.tasks.find((task) => task.id === data.task.id) ?? data.task;
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

  database.tasks = upsertById(database.tasks, updatedTask);
  database.matches = upsertById(database.matches, updatedMatch);
  recordEvent(database, {
    collection: "matches",
    action: `Volunteer ${data.status}`,
    title: updatedTask.title,
    description: `${currentMatch.volunteerId} marked ${data.status} for ${updatedTask.title}.`,
    actor: currentMatch.volunteerId,
    crisisId: updatedTask.crisisId,
    recordId: updatedMatch.id,
    tone: data.status === "declined" ? "warn" : "safe",
  });

  writeDatabase(database);
  return {
    match: updatedMatch,
    task: updatedTask,
  };
}

export async function updateLocalTaskWorkflowStatus(
  task: ReliefTask,
  status: TaskStatus,
) {
  const database = readDatabase();
  const now = nowIso();
  const currentTask = database.tasks.find((entry) => entry.id === task.id) ?? task;
  const updatedTask = {
    ...currentTask,
    status,
    updatedAt: now,
  };

  database.tasks = upsertById(database.tasks, updatedTask);
  recordEvent(database, {
    collection: "tasks",
    action: "Task status changed",
    title: updatedTask.title,
    description: `${updatedTask.title} moved to ${status}.`,
    crisisId: updatedTask.crisisId,
    recordId: updatedTask.id,
    tone: status === "completed" ? "safe" : "info",
  });

  writeDatabase(database);
  return updatedTask;
}

export async function updateLocalCrisisWorkflowStatus(
  crisis: Crisis,
  status: CrisisStatus,
) {
  const database = readDatabase();
  const now = nowIso();
  const currentCrisis =
    database.crises.find((entry) => entry.id === crisis.id) ?? crisis;
  const updatedCrisis: Crisis = {
    ...currentCrisis,
    status,
    updatedAt: now,
    openTasks:
      status === "resolved"
        ? 0
        : database.tasks.filter(
            (task) =>
              task.crisisId === currentCrisis.id &&
              task.status !== "completed" &&
              task.status !== "cancelled",
          ).length,
  };

  database.crises = upsertById(database.crises, updatedCrisis);

  if (status === "resolved") {
    database.resourceNeeds = database.resourceNeeds.map((need) =>
      need.crisisId === updatedCrisis.id &&
      need.status !== "fulfilled" &&
      need.status !== "closed"
        ? {
            ...need,
            status: "closed",
            updatedAt: now,
          }
        : need,
    );
    database.tasks = database.tasks.map((task) =>
      task.crisisId === updatedCrisis.id &&
      task.status !== "completed" &&
      task.status !== "cancelled"
        ? {
            ...task,
            status: "completed",
            updatedAt: now,
          }
        : task,
    );
    database.matches = database.matches.map((match) =>
      match.crisisId === updatedCrisis.id &&
      (match.status === "accepted" || match.status === "assigned")
        ? {
            ...match,
            status: "completed",
            updatedAt: now,
          }
        : match,
    );
    database.resourcePledges = database.resourcePledges.map((pledge) =>
      pledge.crisisId === updatedCrisis.id &&
      (pledge.status === "pending" || pledge.status === "verified")
        ? {
            ...pledge,
            status: "fulfilled",
            updatedAt: now,
          }
        : pledge,
    );
  }

  recordEvent(database, {
    collection: "crises",
    action: status === "resolved" ? "Crisis completed" : "Crisis status changed",
    title: updatedCrisis.title,
    description:
      status === "resolved"
        ? `${updatedCrisis.title} has been completed and removed from current crisis rooms.`
        : `${updatedCrisis.title} moved to ${status}.`,
    actor: updatedCrisis.contactPerson,
    crisisId: updatedCrisis.id,
    recordId: updatedCrisis.id,
    tone: status === "resolved" ? "safe" : "info",
  });

  writeDatabase(database);
  return {
    crisis: updatedCrisis,
    tasks: database.tasks.filter((task) => task.crisisId === updatedCrisis.id),
    resourceNeeds: database.resourceNeeds.filter(
      (need) => need.crisisId === updatedCrisis.id,
    ),
    resourcePledges: database.resourcePledges.filter(
      (pledge) => pledge.crisisId === updatedCrisis.id,
    ),
    matches: database.matches.filter((match) => match.crisisId === updatedCrisis.id),
  };
}

export async function createLocalCertificateRecord(data: {
  task: ReliefTask;
  crisis: Crisis;
  volunteer: VolunteerProfile;
  ngoName: string;
  serviceHours?: number;
}) {
  const database = readDatabase();
  const now = nowIso();
  const volunteerToken = data.volunteer.id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase();
  const dateToken = now.slice(0, 10).replace(/-/g, "");
  const certificateId = `${dateToken}-${volunteerToken || "VOL"}`;
  const certificate: Certificate = {
    id: `${data.task.id}_${data.volunteer.id}`,
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
    createdAt: now,
    updatedAt: now,
    status: "issued",
    verified: data.volunteer.verified,
  };

  database.certificates = upsertById(database.certificates, certificate);
  recordEvent(database, {
    collection: "certificates",
    action: "Certificate issued",
    title: certificate.certificateNumber,
    description: `${certificate.volunteerName} received a certificate for ${certificate.taskTitle}.`,
    actor: certificate.volunteerName,
    crisisId: certificate.crisisId,
    recordId: certificate.id,
    tone: "safe",
  });

  writeDatabase(database);
  return certificate;
}

export async function createLocalResourceAcknowledgementCertificate(data: {
  crisis: Crisis;
  resourceNeed: ResourceNeed;
  pledge: ResourcePledge;
  ngoName: string;
}) {
  const database = readDatabase();
  const now = nowIso();
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
    id: `${data.resourceNeed.id}_${data.pledge.id}`,
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
    createdAt: now,
    updatedAt: now,
    status: "issued",
    verified: data.pledge.verified,
  };

  database.certificates = upsertById(database.certificates, certificate);
  database.resourcePledges = database.resourcePledges.map((pledge) =>
    pledge.id === data.pledge.id
      ? {
          ...pledge,
          status: "fulfilled",
          updatedAt: now,
        }
      : pledge,
  );
  recordEvent(database, {
    collection: "certificates",
    action: "Resource helper certificate issued",
    title: certificate.certificateNumber,
    description: `${certificate.volunteerName} received a certificate for ${data.resourceNeed.label}.`,
    actor: certificate.volunteerName,
    crisisId: certificate.crisisId,
    recordId: certificate.id,
    resourceNeedId: data.resourceNeed.id,
    tone: "safe",
  });

  writeDatabase(database);
  return certificate;
}

export async function createLocalVolunteerMatch(data: {
  crisis: Crisis;
  task: ReliefTask;
  volunteer: VolunteerProfile;
  score: number;
  reasons: string[];
}) {
  const database = readDatabase();
  const now = nowIso();
  const match: VolunteerMatch = {
    id: `${data.task.id}_${data.volunteer.id}`,
    crisisId: data.crisis.id,
    taskId: data.task.id,
    volunteerId: data.volunteer.id,
    score: data.score,
    reasons: data.reasons,
    location:
      data.task.location.lat !== 0 || data.task.location.lng !== 0
        ? data.task.location
        : data.crisis.location,
    createdAt: now,
    updatedAt: now,
    status: "assigned",
    verified: data.volunteer.verified,
  };

  database.matches = upsertById(database.matches, match);
  recordEvent(database, {
    collection: "matches",
    action: "Volunteer match created",
    title: data.task.title,
    description: `${data.volunteer.name} matched to ${data.task.title} with score ${data.score}.`,
    actor: data.volunteer.name,
    crisisId: data.crisis.id,
    recordId: match.id,
    tone: "info",
  });

  writeDatabase(database);
  return match;
}

export async function createLocalVolunteerNotificationPlaceholder(data: {
  crisis: Crisis;
  task: ReliefTask;
  volunteer: VolunteerProfile;
}) {
  const database = readDatabase();
  const notification = {
    id: createId("notification"),
    type: "task_assignment",
    recipientUserId: data.volunteer.userId ?? data.volunteer.id,
    volunteerId: data.volunteer.id,
    crisisId: data.crisis.id,
    taskId: data.task.id,
    title: `New assignment: ${data.task.title}`,
    message: `You have been assigned to ${data.task.title} for ${data.crisis.title}.`,
    status: "pending-send",
    placeholder: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  recordEvent(database, {
    collection: "notifications",
    action: "Notification queued",
    title: notification.title,
    description: notification.message,
    actor: data.volunteer.name,
    crisisId: data.crisis.id,
    recordId: notification.id,
    tone: "info",
  });

  writeDatabase(database);
  return notification;
}
