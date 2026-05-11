export type Tone = "neutral" | "info" | "safe" | "warn" | "alert";

export type UserRole = "ngo" | "volunteer" | "donor" | "admin";
export type CrisisType = "fire" | "flood" | "landslide" | "earthquake" | "cyclone";
export type RiskLevel = "green" | "yellow" | "red";
export type TaskPriority = "critical" | "high" | "standard";
export type VolunteerAvailabilityStatus =
  | "available_now"
  | "limited"
  | "scheduled"
  | "unavailable";
export type TaskStatus =
  | "open"
  | "assigned"
  | "in-progress"
  | "completed"
  | "cancelled";
export type PledgeStatus = "pending" | "verified" | "fulfilled" | "cancelled";

export type CrisisStatus = "active" | "stabilizing" | "monitoring" | "resolved";
export type UserProfileStatus = "active" | "pending" | "suspended";
export type ResourceNeedStatus = "open" | "partially-fulfilled" | "fulfilled" | "closed";
export type VolunteerMatchStatus =
  | "suggested"
  | "assigned"
  | "accepted"
  | "declined"
  | "completed";
export type CertificateStatus = "pending" | "issued" | "revoked";
export type CrisisReportStatus = "submitted" | "reviewing" | "verified" | "rejected";
export type TaskState = TaskStatus;
export type Urgency = "critical" | "high" | "moderate";
export type DonorHelpType =
  | "money"
  | "food"
  | "clothes"
  | "medicine"
  | "shelter"
  | "vehicle"
  | "boat"
  | "other";

export interface Location {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
}

export interface NGOProfile {
  id: string;
  organizationName: string;
  registrationNumber: string;
  focusAreas: string[];
  contactName?: string;
  email?: string;
  phone?: string;
  verificationDocument?: string;
  location: Location;
  createdAt: string;
  updatedAt: string;
  status: UserProfileStatus;
  verified: boolean;
}

export interface VolunteerProfile {
  id: string;
  userId?: string;
  role: UserRole;
  name: string;
  roleTitle: string;
  email?: string;
  phone?: string;
  city?: string;
  location: Location;
  skills: string[];
  assets: string[];
  languages: string[];
  availability: VolunteerAvailabilityStatus;
  availableTime?: string;
  emergencyAvailable?: boolean;
  emergencyRadiusKm?: number;
  distanceKm?: number;
  responseRate?: string;
  completedTasks?: number;
  skillTags?: VolunteerSkillTag[];
  notificationPreferences?: VolunteerNotificationPreferences;
  createdAt: string;
  updatedAt: string;
  status: UserProfileStatus;
  verified: boolean;
}

export interface DonorProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  helpTypes: DonorHelpType[];
  preferredSupportAreas?: string[];
  totalPledges?: number;
  location: Location;
  createdAt: string;
  updatedAt: string;
  status: UserProfileStatus;
  verified: boolean;
}

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  location: Location;
  createdAt: string;
  updatedAt: string;
  status: UserProfileStatus;
  verified: boolean;
  ngoProfile?: NGOProfile | null;
  volunteerProfile?: VolunteerProfile | null;
  donorProfile?: DonorProfile | null;
}

export interface Crisis {
  id: string;
  title: string;
  type: CrisisType;
  summary: string;
  description?: string;
  location: Location;
  riskLevel: RiskLevel;
  needs: string[];
  urgentNeeds?: string[];
  requiredResources: string[];
  suggestedSkills: string[];
  familiesAffected: number;
  matchedVolunteers: number;
  openTasks: number;
  contactPerson: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  status: CrisisStatus;
  verified: boolean;
}

export interface ReliefTask {
  id: string;
  crisisId: string;
  title: string;
  description?: string;
  location: Location;
  locationLabel?: string;
  riskLevel: RiskLevel;
  requiredSkills: string[];
  requiredResources?: string[];
  requiredAssets: string[];
  volunteersNeeded: number;
  assignedCount: number;
  assignedVolunteers?: string[];
  assignedVolunteerIds?: string[];
  window: string;
  languagePreference?: string;
  priority?: TaskPriority;
  createdAt: string;
  updatedAt: string;
  status: TaskStatus;
  verified: boolean;
}

export interface ResourceNeed {
  id: string;
  crisisId: string;
  label: string;
  category?: string;
  location: Location;
  locationLabel?: string;
  quantityNeeded: number;
  quantityPledged: number;
  urgency: Urgency;
  deadline: string;
  providerHint: string;
  createdAt: string;
  updatedAt: string;
  status: ResourceNeedStatus;
  verified: boolean;
}

export interface ResourcePledge {
  id: string;
  crisisId: string;
  resourceNeedId: string;
  donorId: string;
  itemType: string;
  quantity?: number;
  amount?: number;
  note?: string;
  location: Location;
  createdAt: string;
  updatedAt: string;
  status: PledgeStatus;
  verified: boolean;
}

export interface VolunteerMatch {
  id: string;
  crisisId: string;
  taskId: string;
  volunteerId: string;
  score: number;
  reasons: string[];
  distanceKm?: number;
  location: Location;
  createdAt: string;
  updatedAt: string;
  status: VolunteerMatchStatus;
  verified: boolean;
}

export interface Certificate {
  id: string;
  volunteerId: string;
  taskId: string;
  crisisId: string;
  volunteerName: string;
  ngoName: string;
  crisisTitle: string;
  taskTitle: string;
  serviceDate: string;
  certificateId: string;
  certificateNumber: string;
  serviceHours: number;
  verificationQrPlaceholder: string;
  issuedAt: string;
  location: Location;
  createdAt: string;
  updatedAt: string;
  status: CertificateStatus;
  verified: boolean;
}

export interface CrisisReport {
  id: string;
  crisisId?: string;
  reporterName: string;
  reporterRole?: UserRole | "public";
  description: string;
  priority: Urgency;
  needs: string[];
  riskLevel: RiskLevel;
  location: Location;
  createdAt: string;
  updatedAt: string;
  status: CrisisReportStatus;
  verified: boolean;
}

export interface DashboardStat {
  label: string;
  value: string;
  change: string;
  helper: string;
  tone: Tone;
}

export interface MapMarker {
  label: string;
  x: number;
  y: number;
  tone: Tone;
}

export interface CrisisTypePanel {
  title: string;
  headline: string;
  description: string;
  tone: Tone;
}

export interface ResponsePillar {
  title: string;
  kicker: string;
  description: string;
  tone: Tone;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface CrisisFormValues {
  title: string;
  type: CrisisType;
  locationAddress: string;
  description: string;
  familiesAffected: string;
  urgentNeeds: string;
  requiredResources: string;
  riskLevel: RiskLevel;
  contactPerson: string;
}

export interface TaskFormValues {
  crisisType: CrisisType;
  needDescription: string;
  title: string;
  description: string;
  requiredSkills: string;
  requiredResources: string;
  requiredAssets: string;
  volunteersNeeded: string;
  location: string;
  timeWindow: string;
  riskLevel: RiskLevel;
  languagePreference: string;
  priority: TaskPriority;
}

export interface ResourceNeedFormValues {
  label: string;
  quantityNeeded: string;
  urgency: Urgency;
  location: string;
  deadline: string;
}

export interface ResourcePledgeFormValues {
  quantity: string;
  location: string;
  note: string;
}

export interface VolunteerProfileFormValues {
  helpDescription: string;
  skills: string;
  languages: string;
  availability: VolunteerAvailabilityStatus;
  availableTime: string;
  emergencyRadius: string;
  assets: string[];
  location: string;
  emergencyAvailable: boolean;
}

export interface NGORegistrationFields {
  ngoName: string;
  registrationNumber: string;
  focusAreas: string;
  verificationDocument: string;
}

export interface VolunteerRegistrationFields {
  skills: string;
  languages: string;
  availability: VolunteerAvailabilityStatus;
  assets: string;
  emergencyRadius: string;
  skillTags: VolunteerSkillTag[];
}

export interface DonorRegistrationFields {
  helpTypes: DonorHelpType[];
}

export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  role: UserRole;
  ngo: NGORegistrationFields;
  volunteer: VolunteerRegistrationFields;
  donor: DonorRegistrationFields;
}

export interface UserProfileData {
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  location: Location;
  createdAt?: string;
  updatedAt?: string;
  status: UserProfileStatus;
  verified: boolean;
  ngoProfile?: NGOProfile | null;
  volunteerProfile?: VolunteerProfile | null;
  donorProfile?: DonorProfile | null;
}

export interface CrisisCreateData {
  title: string;
  type: CrisisType;
  summary?: string;
  description: string;
  location: Location;
  riskLevel: RiskLevel;
  urgentNeeds: string[];
  requiredResources: string[];
  suggestedSkills: string[];
  familiesAffected: number;
  contactPerson: string;
  createdBy?: string;
  status?: CrisisStatus;
  verified?: boolean;
}

export interface TaskCreateData {
  crisisId: string;
  title: string;
  description: string;
  location: Location;
  riskLevel: RiskLevel;
  requiredSkills: string[];
  requiredResources?: string[];
  requiredAssets: string[];
  volunteersNeeded: number;
  window: string;
  languagePreference?: string;
  priority: TaskPriority;
  createdBy?: string;
  status?: TaskStatus;
  verified?: boolean;
}

export interface ResourceNeedCreateData {
  crisisId: string;
  label: string;
  category?: string;
  location: Location;
  quantityNeeded: number;
  urgency: Urgency;
  deadline: string;
  providerHint?: string;
  createdBy?: string;
  status?: ResourceNeedStatus;
  verified?: boolean;
}

export interface ResourcePledgeCreateData {
  resourceNeedId: string;
  donorId: string;
  itemType: string;
  quantity?: number;
  amount?: number;
  note?: string;
  location: Location;
  status?: PledgeStatus;
  verified?: boolean;
}

export interface MoneyDonationPledgeCreateData {
  crisisId: string;
  donorId: string;
  amount: number;
  note?: string;
  location: Location;
  itemType?: string;
  status?: PledgeStatus;
  verified?: boolean;
}

export interface AuthActionResult {
  success: boolean;
  message: string;
  redirectPath: string;
  role: UserRole;
  userName: string;
  isMock: boolean;
  profile: UserProfile | null;
}

export interface VolunteerProfileExtraction {
  skills: string[];
  languages: string[];
  assets: string[];
  availability: VolunteerAvailabilityStatus;
  riskComfort: "low" | "medium" | "high";
}

export interface ParsedNGONeed {
  crisisType: CrisisType | "unknown";
  requiredSkills: string[];
  requiredResources: string[];
  requiredAssets: string[];
  priority: "low" | "medium" | "high" | "critical";
  riskLevel: RiskLevel;
}

export interface CrisisReportClassification {
  category: CrisisType | "unknown";
  priority: "low" | "medium" | "high" | "critical";
  needs: string[];
  safetyWarning: string;
  requiresVerification: boolean;
}

// ---------------------------------------------------------------------------
// Impact Passport — Gamified user badges
// ---------------------------------------------------------------------------

export type BadgeType =
  | "first_donation"
  | "repeat_donor"
  | "crisis_responder"
  | "resource_hero"
  | "community_builder"
  | "milestone_10k"
  | "early_supporter";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export interface ImpactBadge {
  id: string;
  userId: string;
  type: BadgeType;
  crisisId?: string;
  title: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  earnedAt: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Donation Tracking — Follow Your Dollar
// ---------------------------------------------------------------------------

export type DonationType = "money" | "supply" | "service";

export type DonationTrackingStatus =
  | "received"
  | "purchasing"
  | "en_route"
  | "delivered";

export interface Donation {
  id: string;
  donorId: string;
  crisisId: string;
  amount: number;
  type: DonationType;
  optInWallOfHope: boolean;
  displayName?: string;
  status: PledgeStatus;
  timelineStatus: DonationTrackingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DonationTimelineStep {
  id: string;
  donationId: string;
  step: DonationTrackingStatus;
  title: string;
  description?: string;
  location?: Location;
  completedAt?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Wall of Hope — Public social proof feed (never stores amounts)
// ---------------------------------------------------------------------------

export interface WallOfHopeEntry {
  id: string;
  userId: string;
  displayName: string;
  role: "donor" | "volunteer";
  message?: string;
  crisisTitle?: string;
  avatarUrl?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Impact Hub — Crisis transparency metrics and stories
// ---------------------------------------------------------------------------

export interface CrisisImpactMetric {
  id: string;
  crisisId: string;
  label: string;
  value: number;
  unit: string;
  icon?: string;
  updatedAt: string;
}

export interface StorySpotlight {
  id: string;
  crisisId: string;
  personName: string;
  personAge?: number;
  narrative?: string;
  quote: string;
  imageUrl?: string;
  location?: Location;
  createdAt: string;
}

export interface ThankYouMedia {
  id: string;
  crisisId?: string;
  targetUserId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  message?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Volunteer Skill Tags — Skills-based matching enhancement
// ---------------------------------------------------------------------------

export type VolunteerSkillTag =
  | "doctor"
  | "nurse"
  | "logistics"
  | "carpenter"
  | "driver"
  | "cook"
  | "teacher"
  | "engineer"
  | "translator"
  | "counselor"
  | "electrician"
  | "plumber"
  | "paramedic"
  | "boat_operator"
  | "drone_operator";

export interface VolunteerNotificationPreferences {
  crisisTypes: CrisisType[];
  radius: number;
  enabled: boolean;
}

export const VOLUNTEER_SKILL_TAG_LABELS: Record<VolunteerSkillTag, string> = {
  doctor: "Doctor",
  nurse: "Nurse",
  logistics: "Logistics",
  carpenter: "Carpenter",
  driver: "Driver",
  cook: "Cook",
  teacher: "Teacher",
  engineer: "Engineer",
  translator: "Translator",
  counselor: "Counselor",
  electrician: "Electrician",
  plumber: "Plumber",
  paramedic: "Paramedic",
  boat_operator: "Boat Operator",
  drone_operator: "Drone Operator",
};

export const BADGE_TIER_ORDER: BadgeTier[] = ["bronze", "silver", "gold", "platinum"];

export const DONATION_TIMELINE_STEPS: DonationTrackingStatus[] = [
  "received",
  "purchasing",
  "en_route",
  "delivered",
];

export const DONATION_TIMELINE_LABELS: Record<DonationTrackingStatus, string> = {
  received: "Fund Received",
  purchasing: "Supplies Purchased",
  en_route: "En Route",
  delivered: "Delivered",
};
