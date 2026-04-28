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
