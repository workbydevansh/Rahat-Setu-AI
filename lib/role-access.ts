import type { UserRole } from "@/types";

export type RoleAudience = "public" | UserRole;

export interface RoleAwareNavigationItem {
  href: string;
  label: string;
  kicker?: string;
  audiences: RoleAudience[];
}

export function canShowForRole(
  audiences: RoleAudience[],
  role: UserRole | null,
) {
  if (!role) {
    return audiences.includes("public");
  }

  if (role === "admin") {
    return true;
  }

  return audiences.includes(role);
}

export const topNavigationItems: RoleAwareNavigationItem[] = [
  { href: "/", label: "Home", audiences: ["public", "ngo", "volunteer", "donor", "admin"] },
  {
    href: "/dashboard",
    label: "Dashboard",
    audiences: ["public", "ngo", "volunteer", "donor", "admin"],
  },
  { href: "/profile", label: "Profile", audiences: ["ngo", "volunteer", "donor", "admin"] },
  { href: "/tasks", label: "Tasks", audiences: ["public", "ngo", "volunteer", "admin"] },
  { href: "/impact-hub", label: "Impact Hub", audiences: ["public", "ngo", "volunteer", "donor", "admin"] },
  { href: "/database", label: "Database", audiences: ["ngo", "volunteer", "donor", "admin"] },
  { href: "/ngo/dashboard", label: "NGO", audiences: ["public", "ngo", "admin"] },
  {
    href: "/volunteer/dashboard",
    label: "Volunteer",
    audiences: ["public", "volunteer", "admin"],
  },
  {
    href: "/volunteer/opportunities",
    label: "Opportunities",
    audiences: ["volunteer", "admin"],
  },
  { href: "/donor", label: "Donor", audiences: ["public", "donor", "admin"] },
  { href: "/admin", label: "Admin", audiences: ["admin"] },
];

export const sidebarNavigationItems: RoleAwareNavigationItem[] = [
  {
    href: "/",
    label: "Home",
    kicker: "Opportunity hub",
    audiences: ["public", "ngo", "volunteer", "donor", "admin"],
  },
  {
    href: "/dashboard",
    label: "Mission Dashboard",
    kicker: "Role-aware home",
    audiences: ["public", "ngo", "volunteer", "donor", "admin"],
  },
  {
    href: "/profile",
    label: "My Profile",
    kicker: "Account monitor",
    audiences: ["ngo", "volunteer", "donor", "admin"],
  },
  {
    href: "/tasks",
    label: "Task Board",
    kicker: "Dispatch work lanes",
    audiences: ["public", "ngo", "volunteer", "admin"],
  },
  {
    href: "/database",
    label: "Database",
    kicker: "History and pledges",
    audiences: ["ngo", "volunteer", "donor", "admin"],
  },
  {
    href: "/impact-hub",
    label: "Impact Hub",
    kicker: "Transparency & past work",
    audiences: ["public", "ngo", "volunteer", "donor", "admin"],
  },
  {
    href: "/ngo/dashboard",
    label: "NGO Dashboard",
    kicker: "Manage crises",
    audiences: ["public", "ngo", "admin"],
  },
  {
    href: "/ngo/crisis/new",
    label: "New Crisis",
    kicker: "Open incident room",
    audiences: ["ngo", "admin"],
  },
  {
    href: "/volunteer/dashboard",
    label: "Volunteer",
    kicker: "See field tasks",
    audiences: ["public", "volunteer", "admin"],
  },
  {
    href: "/volunteer/opportunities",
    label: "Opportunities",
    kicker: "Eligibility and accept",
    audiences: ["volunteer", "admin"],
  },
  {
    href: "/volunteer/profile",
    label: "Volunteer Profile",
    kicker: "Update readiness",
    audiences: ["volunteer", "admin"],
  },
  {
    href: "/donor",
    label: "Donor Board",
    kicker: "Track supply gaps",
    audiences: ["public", "donor", "admin"],
  },
  {
    href: "/admin",
    label: "Admin",
    kicker: "Trust and safety",
    audiences: ["admin"],
  },
  {
    href: "/crisis/vikas-nagar-fire-relief",
    label: "Crisis Detail",
    kicker: "Incident room",
    audiences: ["public", "ngo", "donor", "admin"],
  },
];
