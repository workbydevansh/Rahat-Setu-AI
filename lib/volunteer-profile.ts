import { volunteers } from "@/data/mock-data";
import { createUserProfile, getCurrentUser, getUserProfile } from "@/lib/auth";
import type {
  UserProfile,
  UserProfileData,
  VolunteerAvailabilityStatus,
  VolunteerProfile,
  VolunteerProfileFormValues,
} from "@/types";

const DEMO_VOLUNTEER_STORAGE_KEY = "rahatsetu-demo-volunteer-profile";

export const volunteerAssetOptions = [
  "bike",
  "car",
  "pickup truck",
  "4x4 vehicle",
  "tractor",
  "boat",
  "shelter space",
  "medical kit",
  "generator",
  "drone",
] as const;

export const volunteerAvailabilityOptions: Array<{
  value: VolunteerAvailabilityStatus;
  label: string;
  helper: string;
}> = [
  {
    value: "available_now",
    label: "Available now",
    helper: "Ready for immediate dispatch if a suitable task appears.",
  },
  {
    value: "limited",
    label: "Limited",
    helper: "Available for selected tasks or short response windows only.",
  },
  {
    value: "scheduled",
    label: "Scheduled",
    helper: "Available in specific time windows you define below.",
  },
  {
    value: "unavailable",
    label: "Unavailable",
    helper: "Do not include in active volunteer matching right now.",
  },
];

export interface VolunteerProfileSource {
  mode: "firestore" | "demo";
  userProfile: UserProfile | null;
  volunteerProfile: VolunteerProfile;
}

function getNowIso() {
  return new Date().toISOString();
}

function cloneLocation(profile: VolunteerProfile) {
  return {
    lat: profile.location.lat,
    lng: profile.location.lng,
    address: profile.location.address,
    city: profile.location.city,
    state: profile.location.state,
  };
}

export function parseCommaSeparatedList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function hydrateVolunteerProfile(
  profile: VolunteerProfile,
  userProfile?: UserProfile | null,
) {
  const now = getNowIso();
  const location = cloneLocation(profile);

  return {
    ...profile,
    id:
      profile.id ||
      (userProfile?.uid
        ? `volunteer-${userProfile.uid}`
        : `volunteer-${profile.email?.toLowerCase() ?? "demo"}`),
    userId: profile.userId ?? userProfile?.uid,
    role: "volunteer" as const,
    name: profile.name || userProfile?.name || "Volunteer responder",
    roleTitle: profile.roleTitle || "Volunteer responder",
    email: profile.email || userProfile?.email || undefined,
    phone: profile.phone || userProfile?.phone || undefined,
    city: profile.city || location.city || location.address,
    location,
    skills: [...profile.skills],
    assets: [...profile.assets],
    languages: [...profile.languages],
    availability: profile.availability ?? "available_now",
    availableTime: profile.availableTime ?? "Flexible this week",
    emergencyAvailable: profile.emergencyAvailable ?? false,
    emergencyRadiusKm: profile.emergencyRadiusKm ?? 25,
    createdAt: profile.createdAt || userProfile?.createdAt || now,
    updatedAt: profile.updatedAt || userProfile?.updatedAt || now,
    status: profile.status || userProfile?.status || "active",
    verified: profile.verified ?? userProfile?.verified ?? false,
  };
}

function getFallbackVolunteerProfile() {
  return hydrateVolunteerProfile(volunteers[0]);
}

function buildVolunteerProfileFromUserProfile(userProfile: UserProfile) {
  if (userProfile.volunteerProfile) {
    return hydrateVolunteerProfile(userProfile.volunteerProfile, userProfile);
  }

  return hydrateVolunteerProfile(
    {
      id: `volunteer-${userProfile.uid}`,
      userId: userProfile.uid,
      role: "volunteer",
      name: userProfile.name,
      roleTitle: "Volunteer responder",
      email: userProfile.email,
      phone: userProfile.phone,
      city: userProfile.location.city ?? userProfile.location.address,
      location: userProfile.location,
      skills: [],
      assets: [],
      languages: [],
      availability: "available_now",
      availableTime: "Flexible this week",
      emergencyAvailable: false,
      emergencyRadiusKm: 25,
      createdAt: userProfile.createdAt,
      updatedAt: userProfile.updatedAt,
      status: userProfile.status,
      verified: userProfile.verified,
    },
    userProfile,
  );
}

function loadDemoVolunteerProfileFromStorage() {
  const fallback = getFallbackVolunteerProfile();

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(DEMO_VOLUNTEER_STORAGE_KEY);

    if (!stored) {
      return fallback;
    }

    return hydrateVolunteerProfile(
      JSON.parse(stored) as VolunteerProfile,
    );
  } catch {
    return fallback;
  }
}

function saveDemoVolunteerProfileToStorage(profile: VolunteerProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DEMO_VOLUNTEER_STORAGE_KEY,
    JSON.stringify(profile),
  );
}

function buildUserProfileData(
  userProfile: UserProfile | null,
  volunteerProfile: VolunteerProfile,
): UserProfileData {
  const baseLocation = volunteerProfile.location;

  return {
    role: "volunteer",
    name: userProfile?.name || volunteerProfile.name,
    email: userProfile?.email || volunteerProfile.email || "",
    phone: userProfile?.phone || volunteerProfile.phone || "",
    location: baseLocation,
    createdAt: userProfile?.createdAt || volunteerProfile.createdAt,
    updatedAt: volunteerProfile.updatedAt,
    status: userProfile?.status || volunteerProfile.status,
    verified: userProfile?.verified ?? volunteerProfile.verified,
    ngoProfile: userProfile?.ngoProfile ?? null,
    volunteerProfile,
    donorProfile: userProfile?.donorProfile ?? null,
  };
}

export function getVolunteerProfileFormDefaults(
  profile: VolunteerProfile,
): VolunteerProfileFormValues {
  return {
    helpDescription: "",
    skills: profile.skills.join(", "),
    languages: profile.languages.join(", "),
    availability: profile.availability,
    availableTime: profile.availableTime ?? "",
    emergencyRadius: String(profile.emergencyRadiusKm ?? 25),
    assets: [...profile.assets],
    location: profile.location.address,
    emergencyAvailable: profile.emergencyAvailable ?? false,
  };
}

export function buildVolunteerProfileFromForm(
  currentProfile: VolunteerProfile,
  form: VolunteerProfileFormValues,
) {
  const trimmedLocation = form.location.trim();
  const nextLocation = {
    ...currentProfile.location,
    address: trimmedLocation,
    city: currentProfile.location.city ?? currentProfile.city ?? trimmedLocation,
  };

  return hydrateVolunteerProfile({
    ...currentProfile,
    skills: parseCommaSeparatedList(form.skills),
    languages: parseCommaSeparatedList(form.languages),
    availability: form.availability,
    availableTime: form.availableTime.trim(),
    emergencyRadiusKm: Number.parseInt(form.emergencyRadius, 10) || 0,
    assets: [...form.assets],
    city: nextLocation.city ?? trimmedLocation,
    location: nextLocation,
    emergencyAvailable: form.emergencyAvailable,
    updatedAt: getNowIso(),
  });
}

export async function loadVolunteerProfileSource(): Promise<VolunteerProfileSource> {
  const currentUser = getCurrentUser();

  if (currentUser) {
    try {
      const userProfile = await getUserProfile(currentUser.uid);

      if (userProfile && (userProfile.role === "volunteer" || userProfile.volunteerProfile)) {
        return {
          mode: "firestore",
          userProfile,
          volunteerProfile: buildVolunteerProfileFromUserProfile(userProfile),
        };
      }
    } catch {
      // Fall back to demo mode if Firestore is unavailable.
    }
  }

  return {
    mode: "demo",
    userProfile: null,
    volunteerProfile: loadDemoVolunteerProfileFromStorage(),
  };
}

export async function saveVolunteerProfileSource(
  source: VolunteerProfileSource,
  volunteerProfile: VolunteerProfile,
): Promise<VolunteerProfileSource> {
  const hydratedProfile = hydrateVolunteerProfile(
    volunteerProfile,
    source.userProfile,
  );

  if (source.mode === "firestore") {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      throw new Error("You are no longer signed in. Please log in again.");
    }

    const savedUserProfile = await createUserProfile(
      currentUser.uid,
      buildUserProfileData(source.userProfile, hydratedProfile),
    );

    return {
      mode: "firestore",
      userProfile: savedUserProfile,
      volunteerProfile: buildVolunteerProfileFromUserProfile(savedUserProfile),
    };
  }

  saveDemoVolunteerProfileToStorage(hydratedProfile);

  return {
    mode: "demo",
    userProfile: null,
    volunteerProfile: hydratedProfile,
  };
}
