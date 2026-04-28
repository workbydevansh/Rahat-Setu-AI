import type {
  CrisisStatus,
  CrisisType,
  Location,
  RiskLevel,
  ResourceNeedStatus,
  TaskState,
  Tone,
  Urgency,
  VolunteerAvailabilityStatus,
} from "@/types";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function progressPercentage(current: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / total) * 100));
}

export function distanceBetweenLocations(
  origin: Pick<Location, "lat" | "lng">,
  destination: Pick<Location, "lat" | "lng">,
) {
  if (
    origin.lat === 0 ||
    origin.lng === 0 ||
    destination.lat === 0 ||
    destination.lng === 0
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const destinationLatitude = toRadians(destination.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(earthRadiusKm * arc * 10) / 10;
}

export function formatLocationLabel(location: Pick<Location, "address" | "city" | "state">) {
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }

  if (location.city) {
    return location.city;
  }

  return location.address;
}

export function formatAvailabilityStatus(status: VolunteerAvailabilityStatus) {
  switch (status) {
    case "available_now":
      return "Available now";
    case "limited":
      return "Limited";
    case "scheduled":
      return "Scheduled";
    case "unavailable":
      return "Unavailable";
    default:
      return status;
  }
}

function titleCaseWords(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function humanizeLabel(value: string) {
  return titleCaseWords(value.replace(/[-_]+/g, " "));
}

export function riskLevelLabel(riskLevel: RiskLevel) {
  switch (riskLevel) {
    case "green":
      return "safe public help";
    case "yellow":
      return "NGO supervised";
    case "red":
      return "trained responders only";
    default:
      return riskLevel;
  }
}

export function riskLevelDescription(riskLevel: RiskLevel) {
  switch (riskLevel) {
    case "green":
      return "Open to safe public coordination and broad volunteer support.";
    case "yellow":
      return "Requires NGO supervision, tighter coordination, or controlled access.";
    case "red":
      return "Restrict to verified, trained, or specialized responders only.";
    default:
      return "Use NGO judgment before assigning public responders.";
  }
}

export function toneFromRiskLevel(riskLevel: RiskLevel): Tone {
  if (riskLevel === "red") {
    return "alert";
  }

  if (riskLevel === "yellow") {
    return "warn";
  }

  return "safe";
}

export function toneFromUrgency(urgency: Urgency): Tone {
  if (urgency === "critical") {
    return "alert";
  }

  if (urgency === "high") {
    return "warn";
  }

  return "neutral";
}

export function toneFromCrisisType(type: CrisisType): Tone {
  if (type === "fire") {
    return "alert";
  }

  if (type === "flood") {
    return "safe";
  }

  if (type === "landslide") {
    return "warn";
  }

  return "info";
}

export function toneFromStatus(status: CrisisStatus): Tone {
  if (status === "active") {
    return "alert";
  }

  if (status === "stabilizing") {
    return "warn";
  }

  return "neutral";
}

export function toneFromTaskStatus(status: TaskState): Tone {
  if (status === "open") {
    return "warn";
  }

  if (status === "assigned") {
    return "info";
  }

  return "safe";
}

export function formatCrisisStatusLabel(status: CrisisStatus) {
  return humanizeLabel(status);
}

export function formatTaskStatusLabel(status: TaskState) {
  return humanizeLabel(status);
}

export function formatResourceStatusLabel(status: ResourceNeedStatus) {
  return humanizeLabel(status);
}

export const markerToneClasses: Record<Tone, string> = {
  neutral: "bg-white text-command",
  info: "bg-command text-white",
  safe: "bg-safe text-white",
  warn: "bg-warn text-command",
  alert: "bg-alert text-white",
};
