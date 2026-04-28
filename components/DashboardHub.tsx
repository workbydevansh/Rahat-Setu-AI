"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CrisisCard } from "@/components/CrisisCard";
import { ResourceCard } from "@/components/ResourceCard";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { TaskCard } from "@/components/TaskCard";
import {
  activeCrises,
  certificates,
  resourceNeeds,
  tasks,
  volunteers,
} from "@/data/mock-data";
import {
  subscribeToProfileSession,
  type CurrentProfileSession,
} from "@/lib/auth";
import { canShowForRole, type RoleAudience } from "@/lib/role-access";
import { progressPercentage } from "@/lib/utils";
import type { DashboardStat, Tone, UserRole } from "@/types";

interface DashboardHubProps {
  variant?: "home" | "dashboard";
}

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-500/15 bg-slate-900/5",
  info: "border-command/20 bg-command/8",
  safe: "border-safe/20 bg-safe/8",
  warn: "border-warn/25 bg-warn/10",
  alert: "border-alert/25 bg-alert/10",
};

const pageCards: Array<{
  href: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  tone: Tone;
  audiences: RoleAudience[];
}> = [
  {
    href: "/ngo/dashboard",
    label: "NGO Ops",
    title: "Coordinate crisis rooms",
    detail: "Open incidents, assign tasks, approve work, and track resource gaps.",
    metric: `${activeCrises.length} rooms`,
    tone: "alert",
    audiences: ["public", "ngo", "admin"],
  },
  {
    href: "/tasks",
    label: "Task Board",
    title: "Move work through lanes",
    detail: "See open, assigned, red-risk, and completed relief tasks in one place.",
    metric: `${tasks.length} tasks`,
    tone: "info",
    audiences: ["public", "ngo", "volunteer", "admin"],
  },
  {
    href: "/database",
    label: "Database",
    title: "Review pledge history",
    detail: "See what was raised, donated, assigned, verified, and recorded over time.",
    metric: "History",
    tone: "safe",
    audiences: ["ngo", "volunteer", "donor", "admin"],
  },
  {
    href: "/volunteer/dashboard",
    label: "Volunteer",
    title: "Respond to matched tasks",
    detail: "Accept requests, review nearby work, and manage certificate history.",
    metric: `${volunteers.length} responders`,
    tone: "safe",
    audiences: ["public", "volunteer", "admin"],
  },
  {
    href: "/volunteer/opportunities",
    label: "Opportunities",
    title: "Find eligible nearby work",
    detail: "Review tasks around you, see why you qualify, toggle availability, and accept suitable work.",
    metric: "Eligibility",
    tone: "info",
    audiences: ["volunteer", "admin"],
  },
  {
    href: "/donor",
    label: "Donor",
    title: "Back verified needs",
    detail: "Pledge supplies against transparent quantity gaps and deadlines.",
    metric: `${resourceNeeds.length} needs`,
    tone: "warn",
    audiences: ["public", "donor", "admin"],
  },
  {
    href: "/admin",
    label: "Admin",
    title: "Moderate trust and safety",
    detail: "Verify NGOs, review public reports, and gate high-risk tasks.",
    metric: "Review desk",
    tone: "neutral",
    audiences: ["admin"],
  },
  {
    href: "/ngo/crisis/new",
    label: "Create",
    title: "Open a new crisis room",
    detail: "Start a disaster-specific intake with template-driven needs.",
    metric: "New room",
    tone: "info",
    audiences: ["ngo", "admin"],
  },
  {
    href: "/volunteer/profile",
    label: "Profile",
    title: "Update response readiness",
    detail: "Keep your skills, assets, languages, and emergency radius current.",
    metric: "Volunteer",
    tone: "safe",
    audiences: ["volunteer", "admin"],
  },
  {
    href: "/profile",
    label: "My Profile",
    title: "Monitor my account",
    detail: "Review role status, pledge history, assignments, and certificates.",
    metric: "Account",
    tone: "neutral",
    audiences: ["ngo", "volunteer", "donor", "admin"],
  },
];

function getRoleCopy(role: UserRole | null) {
  if (role === "ngo") {
    return {
      badge: "NGO dashboard",
      title: "Your NGO operations control room.",
      description:
        "Create crisis rooms, publish tasks, monitor resource gaps, and review operational history without volunteer-only or donor-only clutter.",
    };
  }

  if (role === "volunteer") {
    return {
      badge: "Volunteer dashboard",
      title: "Your responder workspace.",
      description:
        "Focus on task requests, nearby assignments, profile readiness, certificates, and your personal relief history.",
    };
  }

  if (role === "donor") {
    return {
      badge: "Donor dashboard",
      title: "Your giving and impact workspace.",
      description:
        "Review verified campaigns, pledge supplies, track what was raised, and keep donor-facing history in one place.",
    };
  }

  if (role === "admin") {
    return {
      badge: "Admin dashboard",
      title: "Trust, safety, and operations oversight.",
      description:
        "Review all role surfaces, verify records, inspect activity, and monitor high-risk relief workflows.",
    };
  }

  return {
    badge: "Public overview",
    title: "One modern control room for relief coordination.",
    description:
      "Explore NGO operations, volunteer tasks, donor pledges, admin review, crisis rooms, and certificate flows from a single responsive dashboard.",
  };
}

function getStatsForRole(
  role: UserRole | null,
  totalFamilies: number,
  openTasks: number,
  coverage: number,
  totalPledged: number,
  totalNeeded: number,
): DashboardStat[] {
  if (role === "volunteer") {
    const assignedTasks = tasks.filter(
      (task) => task.status === "assigned" || task.status === "in-progress",
    ).length;

    return [
      {
        label: "Nearby tasks",
        value: String(openTasks),
        change: "available",
        helper: "Open tasks are available for volunteer matching and assignment requests.",
        tone: "info",
      },
      {
        label: "Assigned tasks",
        value: String(assignedTasks),
        change: "active work",
        helper: "Assigned and in-progress tasks are the work lanes that matter to responders.",
        tone: "warn",
      },
      {
        label: "Certificates",
        value: String(certificates.length),
        change: "issued",
        helper: "Completed relief work can become printable contribution records.",
        tone: "safe",
      },
      {
        label: "Responders",
        value: String(volunteers.length),
        change: "registry",
        helper: "Volunteer profile records feed skill, asset, and readiness matching.",
        tone: "neutral",
      },
    ];
  }

  if (role === "donor") {
    return [
      {
        label: "Verified campaigns",
        value: String(activeCrises.length),
        change: "active",
        helper: "Donor-facing campaigns are tied to crisis rooms and NGO-led needs.",
        tone: "safe",
      },
      {
        label: "Open needs",
        value: String(resourceNeeds.length),
        change: "pledge ready",
        helper: "Supply gaps are quantity-based so donors can respond clearly.",
        tone: "warn",
      },
      {
        label: "Coverage",
        value: `${coverage}%`,
        change: `${totalPledged}/${totalNeeded || 0}`,
        helper: "Resource coverage comes from pledged quantities across public needs.",
        tone: "info",
      },
      {
        label: "Families in scope",
        value: String(totalFamilies),
        change: "campaign reach",
        helper: "Families represented across active campaigns in the demo database.",
        tone: "alert",
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        label: "Active crises",
        value: String(activeCrises.length),
        change: "oversight",
        helper: "Admin can inspect every crisis room and workflow surface.",
        tone: "alert",
      },
      {
        label: "Open tasks",
        value: String(openTasks),
        change: "review lanes",
        helper: "Task records can be reviewed for risk, status, and assignment health.",
        tone: "info",
      },
      {
        label: "Pledges",
        value: String(resourceNeeds.length),
        change: "trust review",
        helper: "Donation and resource records remain visible in the database history.",
        tone: "warn",
      },
      {
        label: "Certificates",
        value: String(certificates.length),
        change: "issued",
        helper: "Contribution records remain inspectable for admin moderation.",
        tone: "safe",
      },
    ];
  }

  return [
    {
      label: "Active crises",
      value: String(activeCrises.length),
      change: "live rooms",
      helper: `${totalFamilies} families are represented across current demo crisis rooms.`,
      tone: "alert",
    },
    {
      label: "Open tasks",
      value: String(openTasks),
      change: "dispatch",
      helper: "Tasks are split by field risk, status, assets, and location fit.",
      tone: "info",
    },
    {
      label: "Resource coverage",
      value: `${coverage}%`,
      change: "pledged",
      helper: `${totalPledged} of ${totalNeeded} requested items have pledge coverage.`,
      tone: "warn",
    },
    {
      label: "Records",
      value: String(certificates.length),
      change: "certificates",
      helper: "Completed relief work can become printable contribution records.",
      tone: "safe",
    },
  ];
}

function getPrimaryActions(role: UserRole | null) {
  if (role === "ngo") {
    return [
      { href: "/ngo/dashboard", label: "Open NGO dashboard", variant: "primary" as const },
      { href: "/ngo/crisis/new", label: "Create crisis", variant: "ghost" as const },
      { href: "/tasks", label: "Task board", variant: "ghost" as const },
    ];
  }

  if (role === "volunteer") {
    return [
      { href: "/volunteer/opportunities", label: "Find opportunities", variant: "primary" as const },
      { href: "/volunteer/profile", label: "Edit readiness", variant: "ghost" as const },
      { href: "/volunteer/dashboard", label: "Volunteer dashboard", variant: "ghost" as const },
    ];
  }

  if (role === "donor") {
    return [
      { href: "/donor", label: "Open donor board", variant: "primary" as const },
      { href: "/database", label: "Donation history", variant: "ghost" as const },
      { href: "/profile", label: "My profile", variant: "ghost" as const },
    ];
  }

  if (role === "admin") {
    return [
      { href: "/admin", label: "Open admin", variant: "primary" as const },
      { href: "/database", label: "Audit database", variant: "ghost" as const },
      { href: "/tasks", label: "Task review", variant: "ghost" as const },
    ];
  }

  return [
    { href: "/dashboard", label: "Open dashboard", variant: "primary" as const },
    { href: "/tasks", label: "View task board", variant: "ghost" as const },
    { href: "/register", label: "Join network", variant: "ghost" as const },
  ];
}

export function DashboardHub({ variant = "home" }: DashboardHubProps) {
  const [session, setSession] = useState<CurrentProfileSession | null>(null);

  useEffect(() => subscribeToProfileSession(setSession), []);

  const currentRole = session?.role ?? null;
  const totalFamilies = activeCrises.reduce(
    (sum, crisis) => sum + crisis.familiesAffected,
    0,
  );
  const openTasks = tasks.filter(
    (task) => task.status !== "completed" && task.status !== "cancelled",
  ).length;
  const totalNeeded = resourceNeeds.reduce(
    (sum, need) => sum + need.quantityNeeded,
    0,
  );
  const totalPledged = resourceNeeds.reduce(
    (sum, need) => sum + need.quantityPledged,
    0,
  );
  const coverage = progressPercentage(totalPledged, totalNeeded);
  const visiblePageCards = pageCards.filter((card) =>
    canShowForRole(card.audiences, currentRole),
  );
  const stats = useMemo(
    () => getStatsForRole(currentRole, totalFamilies, openTasks, coverage, totalPledged, totalNeeded),
    [coverage, currentRole, openTasks, totalFamilies, totalNeeded, totalPledged],
  );
  const roleCopy = getRoleCopy(currentRole);
  const primaryActions = getPrimaryActions(currentRole);
  const volunteerOpportunityCount = tasks.filter(
    (task) => task.status === "open" || task.status === "assigned",
  ).length;
  const quickOpportunitySlides = [
    {
      label: "Volunteer opportunities",
      value: String(volunteerOpportunityCount),
      detail: "Open or NGO-assigned tasks ready for responders.",
      tone: "safe" as const,
      image: "/opportunity-stack.svg",
    },
    {
      label: "Nearby responders",
      value: String(volunteers.length),
      detail: "Profiles with skills, assets, radius, and readiness.",
      tone: "info" as const,
      image: "/response-team.svg",
    },
    {
      label: "Verified needs",
      value: String(resourceNeeds.length),
      detail: "Supply gaps donors and NGOs can act on.",
      tone: "warn" as const,
      image: "/opportunity-stack.svg",
    },
    {
      label: "Certificates issued",
      value: String(certificates.length),
      detail: "Volunteer impact records ready to view.",
      tone: "neutral" as const,
      image: "/response-team.svg",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:gap-7 lg:px-8">
      <Sidebar currentPath={variant === "dashboard" ? "/dashboard" : "/"} />
      <div className="min-w-0 flex-1 space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div className="surface-panel motion-card relative overflow-hidden rounded-[34px] p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0b5cff,#25c982,#ffc84d,#e5484d)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(11,92,255,0.09),transparent_42%,rgba(37,201,130,0.08))]" />
          <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="safe">response live</Badge>
            <Badge tone="info">{roleCopy.badge}</Badge>
            <Badge tone="warn">{coverage}% pledged</Badge>
          </div>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
            <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              RahatSetu AI
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              {roleCopy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-command-soft/78 sm:text-lg">
              {roleCopy.description}
            </p>
            </div>
            <div className="hidden lg:block">
              <Image
                src="/volunteer-hero.svg"
                alt="Volunteer opportunity dashboard preview"
                width={520}
                height={420}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {primaryActions.map((action) => (
              <Button
                key={action.href}
                href={action.href}
                variant={action.variant === "ghost" ? "secondary" : action.variant}
                size="lg"
              >
                {action.label}
              </Button>
            ))}
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ["Fast intake", "Template-led crisis setup"],
              ["Smart dispatch", "Skill, asset, and location fit"],
              ["Trusted help", "Verified needs and safer task gates"],
            ].map(([title, detail]) => (
              <div
                key={title}
                className="rounded-[24px] border border-command/10 bg-white/74 p-4 shadow-[0_12px_24px_rgba(23,32,51,0.05)]"
              >
                <p className="text-sm font-semibold text-command">{title}</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/72">{detail}</p>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="surface-panel motion-card rounded-[34px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                {session ? `${session.role} dashboard` : "Live dashboard"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Role-aware navigation
              </h2>
            </div>
            <Badge tone={variant === "dashboard" ? "safe" : "info"}>
              {variant === "dashboard" ? "dashboard" : "home"}
            </Badge>
          </div>

          <div className="mt-6 grid gap-3">
            {visiblePageCards.slice(0, 4).map((card, index) => (
              <Link
                key={card.href}
                href={card.href}
                className={`motion-card rounded-[24px] border p-4 ${toneClasses[card.tone]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/70">
                      0{index + 1} - {card.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {card.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-command-soft/78">
                      {card.detail}
                    </p>
                  </div>
                  <Badge tone={card.tone} caps={false}>
                    {card.metric}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="surface-panel overflow-hidden rounded-[34px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
              Volunteer opportunity stream
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-foreground">
              {volunteerOpportunityCount} opportunities moving through the network
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-command-soft/78">
              A sliding overview keeps the volunteer surface alive with open tasks,
              nearby responders, verified needs, and contribution records.
            </p>
          </div>
          <Button href="/volunteer/opportunities" variant="secondary" size="lg">
            View opportunities
          </Button>
        </div>

        <div className="opportunity-slider mt-6">
          <div className="opportunity-track flex w-max gap-4">
            {[...quickOpportunitySlides, ...quickOpportunitySlides].map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={`grid w-[280px] shrink-0 grid-cols-[78px_1fr] items-center gap-4 rounded-[28px] border p-4 sm:w-[340px] ${toneClasses[item.tone]}`}
              >
                <div className="flex h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-[24px] bg-white/82">
                  <Image
                    src={item.image}
                    alt=""
                    width={140}
                    height={110}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <Badge tone={item.tone} caps={false}>
                    {item.label}
                  </Badge>
                  <p className="mt-3 text-3xl font-semibold leading-none text-command">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[34px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
              Navigate by role
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-foreground">
              {session
                ? `Only ${session.role} relevant pages are shown`
                : "Different pages for different relief jobs"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-command-soft/78">
              {session
                ? "The dashboard removes unrelated role surfaces so each signed-in user sees the workflows that match their responsibilities."
                : "Each role has its own page, while the dashboard gives people a fast way to understand the operating surfaces before signing in."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {primaryActions.slice(0, 2).map((action) => (
              <Button
                key={`secondary-${action.href}`}
                href={action.href}
                variant={action.variant === "primary" ? "primary" : "secondary"}
                size="lg"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visiblePageCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`motion-card rounded-[28px] border p-5 ${toneClasses[card.tone]}`}
            >
              <div className="flex items-center justify-between gap-4">
                <Badge tone={card.tone}>{card.label}</Badge>
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-command-soft/60">
                  {card.metric}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-command-soft/78">
                {card.detail}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {currentRole === "volunteer" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="surface-panel rounded-[34px] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                  Volunteer queue
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Tasks you can respond to
                </h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button href="/volunteer/opportunities" variant="secondary" size="sm">
                  Opportunities
                </Button>
                <Button href="/volunteer/dashboard" variant="secondary" size="sm">
                  Volunteer dashboard
                </Button>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {tasks.slice(0, 3).map((task) => (
                <TaskCard key={task.id} task={task} compact />
              ))}
            </div>
          </div>

          <div className="surface-panel rounded-[34px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                  Contribution records
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Certificates and readiness
                </h2>
              </div>
              <Button href="/volunteer/profile" variant="secondary" size="sm">
                Edit profile
              </Button>
            </div>
            <div className="mt-6 space-y-4">
              {certificates.slice(0, 3).map((certificate) => (
                <div
                  key={certificate.id}
                  className="motion-card rounded-[24px] border border-border bg-white/84 p-4"
                >
                  <p className="text-sm font-semibold text-command">
                    Certificate {certificate.certificateNumber}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {certificate.crisisTitle} - {certificate.serviceHours} service hours
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : currentRole === "donor" ? (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-panel rounded-[34px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                  Verified campaigns
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Campaigns ready for support
                </h2>
              </div>
              <Button href="/donor" variant="secondary" size="sm">
                Donor board
              </Button>
            </div>
            <div className="mt-6 grid gap-4">
              {activeCrises.slice(0, 2).map((crisis) => (
                <CrisisCard key={crisis.id} crisis={crisis} />
              ))}
            </div>
          </div>

          <div className="surface-panel rounded-[34px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                  Pledge queue
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Supply gaps to back
                </h2>
              </div>
              <Badge tone="warn">{resourceNeeds.length} needs</Badge>
            </div>
            <div className="mt-6 space-y-4">
              {resourceNeeds.slice(0, 3).map((need) => (
                <ResourceCard
                  key={need.id}
                  need={need}
                  actionHref={`/donor/pledge/${need.id}`}
                  actionLabel="Pledge"
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-panel rounded-[34px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                  Active rooms
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Crisis rooms in motion
                </h2>
              </div>
              <Button href="/ngo/dashboard" variant="secondary" size="sm">
                NGO dashboard
              </Button>
            </div>
            <div className="mt-6 grid gap-4">
              {activeCrises.slice(0, 2).map((crisis) => (
                <CrisisCard key={crisis.id} crisis={crisis} />
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="surface-panel rounded-[34px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                    Dispatch lane
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    Priority tasks
                  </h2>
                </div>
                <Button href="/tasks" variant="secondary" size="sm">
                  All tasks
                </Button>
              </div>
              <div className="mt-6 space-y-4">
                {tasks.slice(0, 2).map((task) => (
                  <TaskCard key={task.id} task={task} compact />
                ))}
              </div>
            </div>

            <div className="surface-panel rounded-[34px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                    Resource lane
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    Supply gaps
                  </h2>
                </div>
                <Badge tone="warn">{resourceNeeds.length} needs</Badge>
              </div>
              <div className="mt-6 space-y-4">
                {resourceNeeds.slice(0, 2).map((need) => (
                  <ResourceCard key={need.id} need={need} compact />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
