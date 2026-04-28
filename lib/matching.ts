import type { Crisis, ReliefTask, VolunteerProfile } from "@/types";

const DISTANCE_WEIGHT = 30;
const SKILL_WEIGHT = 25;
const ASSET_WEIGHT = 20;
const AVAILABILITY_WEIGHT = 10;
const VERIFICATION_WEIGHT = 10;
const LANGUAGE_WEIGHT = 5;
const DISTANCE_CUTOFF_KM = 50;

export interface RankedVolunteerMatch {
  volunteer: VolunteerProfile;
  score: number;
  reasons: string[];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMatchPairs(requiredValues: string[], availableValues: string[]) {
  const availableMap = new Map(
    availableValues.map((value) => [normalizeValue(value), value.trim()]),
  );

  return requiredValues
    .map((requiredValue) => {
      const normalizedRequiredValue = normalizeValue(requiredValue);

      if (!normalizedRequiredValue || !availableMap.has(normalizedRequiredValue)) {
        return null;
      }

      return {
        required: requiredValue.trim(),
        available: availableMap.get(normalizedRequiredValue) ?? requiredValue.trim(),
      };
    })
    .filter(Boolean) as Array<{ required: string; available: string }>;
}

function getLanguagePreferences(languagePreference?: string) {
  if (!languagePreference) {
    return [];
  }

  return languagePreference
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function hasUsableCoordinates(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}

function getReferenceLocation(task: ReliefTask, crisis: Crisis) {
  if (hasUsableCoordinates(task.location.lat, task.location.lng)) {
    return task.location;
  }

  return crisis.location;
}

function getDistanceScore(distanceKm: number | null) {
  if (distanceKm === null) {
    return 0.2;
  }

  return clampScore(1 - Math.min(distanceKm, DISTANCE_CUTOFF_KM) / DISTANCE_CUTOFF_KM);
}

function getLocalScore(task: ReliefTask, volunteer: VolunteerProfile, crisis: Crisis) {
  const referenceLocation = getReferenceLocation(task, crisis);
  const volunteerCity = normalizeValue(volunteer.location.city ?? volunteer.city ?? "");
  const volunteerState = normalizeValue(volunteer.location.state ?? "");
  const referenceCity = normalizeValue(referenceLocation.city ?? "");
  const referenceState = normalizeValue(referenceLocation.state ?? "");

  if (volunteerCity && referenceCity && volunteerCity === referenceCity) {
    return 1;
  }

  if (volunteerState && referenceState && volunteerState === referenceState) {
    return 0.6;
  }

  return 0;
}

function getDistanceReason(distanceKm: number | null) {
  if (distanceKm === null) {
    return null;
  }

  return `${distanceKm.toFixed(1)} km away`;
}

function getAvailabilityReason(volunteer: VolunteerProfile) {
  switch (volunteer.availability) {
    case "available_now":
      return "Available now";
    case "limited":
      return "Limited availability";
    case "scheduled":
      return volunteer.availableTime
        ? `Available during ${volunteer.availableTime}`
        : "Scheduled availability";
    case "unavailable":
      return null;
    default:
      return null;
  }
}

function getLocalReason(task: ReliefTask, volunteer: VolunteerProfile, crisis: Crisis) {
  const referenceLocation = getReferenceLocation(task, crisis);
  const volunteerCity = volunteer.location.city ?? volunteer.city;
  const volunteerState = volunteer.location.state;

  if (
    volunteerCity &&
    referenceLocation.city &&
    normalizeValue(volunteerCity) === normalizeValue(referenceLocation.city)
  ) {
    return `Local to ${referenceLocation.city}`;
  }

  if (
    volunteerState &&
    referenceLocation.state &&
    normalizeValue(volunteerState) === normalizeValue(referenceLocation.state)
  ) {
    return `Local to ${referenceLocation.state}`;
  }

  return null;
}

function getLanguageReasons(task: ReliefTask, volunteer: VolunteerProfile) {
  const preferences = getLanguagePreferences(task.languagePreference);
  const matches = getMatchPairs(preferences, volunteer.languages);

  return matches.map((match) => `Matches language: ${match.required}`);
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lng2 - lng1);
  const startLatitude = toRadians(lat1);
  const endLatitude = toRadians(lat2);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(earthRadiusKm * arc * 10) / 10;
}

export function calculateSkillScore(
  requiredSkills: string[],
  volunteerSkills: string[],
) {
  if (requiredSkills.length === 0) {
    return 1;
  }

  return clampScore(
    getMatchPairs(requiredSkills, volunteerSkills).length / requiredSkills.length,
  );
}

export function calculateAssetScore(
  requiredAssets: string[],
  volunteerAssets: string[],
) {
  if (requiredAssets.length === 0) {
    return 1;
  }

  return clampScore(
    getMatchPairs(requiredAssets, volunteerAssets).length / requiredAssets.length,
  );
}

export function calculateAvailabilityScore(
  task: ReliefTask,
  volunteer: VolunteerProfile,
) {
  const isImmediateTask = normalizeValue(task.window).includes("immediate");

  let baseScore = 0;

  switch (volunteer.availability) {
    case "available_now":
      baseScore = 1;
      break;
    case "limited":
      baseScore = isImmediateTask ? 0.45 : 0.6;
      break;
    case "scheduled":
      baseScore = isImmediateTask ? 0.35 : 0.75;
      break;
    case "unavailable":
      baseScore = 0;
      break;
    default:
      baseScore = 0;
      break;
  }

  if (volunteer.emergencyAvailable) {
    baseScore += 0.1;
  }

  if (task.riskLevel === "red" && !volunteer.emergencyAvailable) {
    baseScore *= 0.6;
  }

  return clampScore(baseScore);
}

export function calculateVerificationScore(volunteer: VolunteerProfile) {
  return volunteer.verified ? 1 : 0;
}

export function calculateLanguageScore(
  task: ReliefTask,
  volunteer: VolunteerProfile,
) {
  const preferences = getLanguagePreferences(task.languagePreference);

  if (preferences.length === 0) {
    return volunteer.languages.length > 0 ? 0.5 : 0;
  }

  return clampScore(
    getMatchPairs(preferences, volunteer.languages).length / preferences.length,
  );
}

export function rankVolunteersForTask(
  task: ReliefTask,
  volunteers: VolunteerProfile[],
  crisis: Crisis,
) {
  const referenceLocation = getReferenceLocation(task, crisis);

  return volunteers
    .map((volunteer): RankedVolunteerMatch & { distanceKm: number | null } => {
      const distanceKm =
        hasUsableCoordinates(referenceLocation.lat, referenceLocation.lng) &&
        hasUsableCoordinates(volunteer.location.lat, volunteer.location.lng)
          ? calculateDistanceKm(
              referenceLocation.lat,
              referenceLocation.lng,
              volunteer.location.lat,
              volunteer.location.lng,
            )
          : null;
      const skillMatches = getMatchPairs(task.requiredSkills, volunteer.skills);
      const assetMatches = getMatchPairs(task.requiredAssets, volunteer.assets);
      const languageReasons = getLanguageReasons(task, volunteer);
      const localScore = getLocalScore(task, volunteer, crisis);

      const distanceScore = getDistanceScore(distanceKm);
      const skillScore = calculateSkillScore(task.requiredSkills, volunteer.skills);
      const assetScore = calculateAssetScore(task.requiredAssets, volunteer.assets);
      const availabilityScore = calculateAvailabilityScore(task, volunteer);
      const verificationScore = calculateVerificationScore(volunteer);
      const languageScore = clampScore(
        calculateLanguageScore(task, volunteer) * 0.7 + localScore * 0.3,
      );

      const score =
        distanceScore * DISTANCE_WEIGHT +
        skillScore * SKILL_WEIGHT +
        assetScore * ASSET_WEIGHT +
        availabilityScore * AVAILABILITY_WEIGHT +
        verificationScore * VERIFICATION_WEIGHT +
        languageScore * LANGUAGE_WEIGHT;

      const reasons: string[] = [];
      const distanceReason = getDistanceReason(distanceKm);
      const availabilityReason = getAvailabilityReason(volunteer);
      const localReason = getLocalReason(task, volunteer, crisis);

      if (distanceReason) {
        reasons.push(distanceReason);
      }

      skillMatches.slice(0, 2).forEach((match) => {
        reasons.push(`Matches ${match.required} skill`);
      });

      assetMatches.slice(0, 2).forEach((match) => {
        reasons.push(`Has required asset: ${match.required}`);
      });

      if (availabilityReason) {
        reasons.push(availabilityReason);
      }

      if (volunteer.verified) {
        reasons.push("Verified volunteer");
      }

      languageReasons.slice(0, 1).forEach((reason) => {
        reasons.push(reason);
      });

      if (localReason) {
        reasons.push(localReason);
      }

      if (reasons.length === 0) {
        reasons.push("Can support as a nearby volunteer");
      }

      return {
        volunteer,
        score: Math.round(score * 10) / 10,
        reasons,
        distanceKm,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
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
    .map((match) => ({
      volunteer: match.volunteer,
      score: match.score,
      reasons: match.reasons,
    }));
}
