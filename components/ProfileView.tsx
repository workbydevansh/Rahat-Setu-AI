"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { StatCard } from "@/components/StatCard";
import {
  logoutUser,
  subscribeToProfileSession,
  type CurrentProfileSession,
} from "@/lib/auth";
import {
  getLocalDatabaseSnapshot,
  subscribeToLocalDatabaseChanges,
  type LocalDatabaseSnapshot,
} from "@/lib/local-database";
import { formatAvailabilityStatus } from "@/lib/utils";
import type { DashboardStat } from "@/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

function profileOwnsCrisis(
  crisis: LocalDatabaseSnapshot["crises"][number],
  session: CurrentProfileSession,
) {
  const ngoProfile = session.profile?.ngoProfile;
  const possibleOwners = [
    session.uid,
    session.name,
    session.email,
    ngoProfile?.id,
    ngoProfile?.contactName,
    ngoProfile?.organizationName,
  ].filter(Boolean);

  return possibleOwners.some(
    (owner) => crisis.createdBy === owner || crisis.contactPerson === owner,
  );
}

export function ProfileView() {
  const [session, setSession] = useState<CurrentProfileSession | null>(null);
  const [database, setDatabase] = useState<LocalDatabaseSnapshot | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => subscribeToProfileSession(setSession), []);

  useEffect(() => {
    function refreshDatabase() {
      setDatabase(getLocalDatabaseSnapshot());
    }

    const handle = window.setTimeout(refreshDatabase, 0);
    const unsubscribeDatabase = subscribeToLocalDatabaseChanges(refreshDatabase);

    return () => {
      window.clearTimeout(handle);
      unsubscribeDatabase();
    };
  }, []);

  const profileData = useMemo(() => {
    if (!session || !database) {
      return null;
    }

    const profile = session.profile;
    const volunteerId = profile?.volunteerProfile?.id ?? session.uid;
    const donorIds = new Set(
      [session.uid, session.email, profile?.donorProfile?.id].filter(Boolean),
    );
    const donorPledges = database.resourcePledges.filter((pledge) =>
      donorIds.has(pledge.donorId),
    );
    const moneyPledged = donorPledges.reduce(
      (sum, pledge) => sum + (pledge.amount ?? 0),
      0,
    );
    const quantityPledged = donorPledges.reduce(
      (sum, pledge) => sum + (pledge.quantity ?? 0),
      0,
    );
    const matches = database.matches.filter(
      (match) => match.volunteerId === volunteerId,
    );
    const certificates = database.certificates.filter(
      (certificate) => certificate.volunteerId === volunteerId,
    );
    const createdCrises = database.crises
      .filter((crisis) => profileOwnsCrisis(crisis, session))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const createdCrisisIds = new Set(createdCrises.map((crisis) => crisis.id));
    const ngoHistoryRows = createdCrises.map((crisis) => {
      const crisisTasks = database.tasks.filter((task) => task.crisisId === crisis.id);
      const crisisMatches = database.matches.filter((match) => match.crisisId === crisis.id);
      const activeVolunteerIds = new Set(
        crisisMatches
          .filter((match) => match.status === "accepted" || match.status === "assigned")
          .map((match) => match.volunteerId),
      );
      const crisisPledges = database.resourcePledges.filter(
        (pledge) => pledge.crisisId === crisis.id,
      );

      return {
        crisis,
        activeMembers: activeVolunteerIds.size,
        totalTasks: crisisTasks.length,
        completedTasks: crisisTasks.filter((task) => task.status === "completed").length,
        pledgeUnits: crisisPledges.reduce(
          (sum, pledge) => sum + (pledge.quantity ?? 0),
          0,
        ),
        moneyRaised: crisisPledges.reduce(
          (sum, pledge) => sum + (pledge.amount ?? 0),
          0,
        ),
        certificates: database.certificates.filter(
          (certificate) => certificate.crisisId === crisis.id,
        ).length,
      };
    });
    const activeNgoCrises = ngoHistoryRows.filter(
      (row) => row.crisis.status !== "resolved",
    );
    const previousNgoCrises = ngoHistoryRows.filter(
      (row) => row.crisis.status === "resolved" || row.completedTasks > 0,
    );
    const ngoMatches = database.matches.filter((match) =>
      createdCrisisIds.has(match.crisisId),
    );
    const stats: DashboardStat[] = [
      {
        label: "Profile status",
        value: session.verified ? "Verified" : "Pending",
        change: session.status,
        helper: "Your trust status controls what moderation and assignment flows can show.",
        tone: session.verified ? "safe" : "warn",
      },
      {
        label: "Pledges",
        value: String(donorPledges.length),
        change: `₹${formatNumber(moneyPledged)}`,
        helper: `${formatNumber(quantityPledged)} item units are tied to this account in the local database.`,
        tone: "info",
      },
      {
        label: "Assignments",
        value: String(session.role === "ngo" ? ngoMatches.length : matches.length),
        change: session.role === "ngo" ? "crisis team" : "volunteer",
        helper:
          session.role === "ngo"
            ? "Volunteer activity linked to crisis rooms owned by this NGO."
            : "Volunteer task requests, accepts, and completions linked to your profile.",
        tone: (session.role === "ngo" ? ngoMatches.length : matches.length) > 0 ? "safe" : "neutral",
      },
      {
        label: "Certificates",
        value: String(certificates.length),
        change: "issued",
        helper: "Contribution certificates issued by NGOs after task completion.",
        tone: certificates.length > 0 ? "safe" : "neutral",
      },
      {
        label: "Crisis rooms",
        value: String(createdCrises.length),
        change: "created",
        helper: "Crisis rooms opened or linked to this profile in the database.",
        tone: createdCrises.length > 0 ? "alert" : "neutral",
      },
    ];

    return {
      profile,
      donorPledges,
      moneyPledged,
      quantityPledged,
      matches,
      certificates,
      createdCrises,
      ngoHistoryRows,
      activeNgoCrises,
      previousNgoCrises,
      stats,
    };
  }, [database, session]);

  async function handleLogout() {
    setIsSigningOut(true);
    await logoutUser();
    setSession(null);
    setIsSigningOut(false);
  }

  if (!session) {
    return (
      <AppShell
        currentPath="/profile"
        eyebrow="Profile"
        title="Sign in to monitor your profile"
        description="Your profile page shows role details, pledge history, assignments, certificates, and account status once you are signed in."
        actions={
          <>
            <Button href="/login" size="lg">
              Login
            </Button>
            <Button href="/register" variant="secondary" size="lg">
              Register
            </Button>
          </>
        }
      >
        <FeedbackPanel
          state="info"
          title="No active profile session"
          description="Sign in or create an account and the navbar will switch from Login/Register to your profile monitor."
        />
      </AppShell>
    );
  }

  const profile = profileData?.profile;
  const initials = session.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <AppShell
      currentPath="/profile"
      eyebrow="My Profile"
      title={`${session.name}'s profile monitor`}
      description="Track your profile status, role dashboard, donation and pledge records, assignments, certificates, and local database history from one place."
      actions={
        <>
          <Button href={session.dashboardPath} size="lg">
            Open my dashboard
          </Button>
          <Button href="/database" variant="secondary" size="lg">
            View database
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out..." : "Logout"}
          </Button>
        </>
      }
    >
      <section className="surface-panel rounded-[34px] p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d4ed8,#0891b2)] text-2xl font-bold text-white shadow-[0_18px_36px_rgba(29,78,216,0.2)]">
              {initials || "ME"}
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={session.verified ? "safe" : "warn"}>
                  {session.verified ? "Verified" : "Verification pending"}
                </Badge>
                <Badge tone="info">{session.role}</Badge>
                {session.isLocalDemo ? <Badge tone="neutral">Local demo</Badge> : null}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                {session.name}
              </h2>
              <p className="mt-1 text-sm text-command-soft/78">{session.email}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-96">
            <div className="rounded-[24px] border border-border bg-white/82 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/65">
                Joined
              </p>
              <p className="mt-2 text-lg font-semibold text-command">
                {profile ? formatDate(profile.createdAt) : "Profile pending"}
              </p>
            </div>
            <div className="rounded-[24px] border border-border bg-white/82 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/65">
                Updated
              </p>
              <p className="mt-2 text-lg font-semibold text-command">
                {profile ? formatDate(profile.updatedAt) : "Profile pending"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {profileData ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {profileData.stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-panel rounded-[34px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                Account details
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Identity and contact
              </h2>
            </div>
            <Badge tone={session.verified ? "safe" : "warn"}>{session.status}</Badge>
          </div>

          <div className="mt-6 grid gap-4">
            {[
              ["Name", session.name],
              ["Email", session.email],
              ["Phone", profile?.phone || "Not added"],
              ["Location", profile?.location.address || "Not added"],
              ["Role", session.role.toUpperCase()],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[24px] border border-border bg-white/84 p-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/65">
                  {label}
                </p>
                <p className="mt-2 text-base font-semibold text-command">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel rounded-[34px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                Role profile
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                {session.role.toUpperCase()} monitor
              </h2>
            </div>
            {session.role === "volunteer" ? (
              <Button href="/volunteer/profile" variant="secondary" size="sm">
                Edit volunteer profile
              </Button>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            {profile?.ngoProfile ? (
              <>
                <div className="rounded-[24px] border border-border bg-white/84 p-4">
                  <p className="text-lg font-semibold text-command">
                    {profile.ngoProfile.organizationName}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    Registration: {profile.ngoProfile.registrationNumber}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.ngoProfile.focusAreas.map((area) => (
                    <Badge key={area} tone="neutral">
                      {area}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}

            {profile?.volunteerProfile ? (
              <>
                <div className="rounded-[24px] border border-border bg-white/84 p-4">
                  <p className="text-lg font-semibold text-command">
                    {profile.volunteerProfile.roleTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {formatAvailabilityStatus(profile.volunteerProfile.availability)} -
                    radius {profile.volunteerProfile.emergencyRadiusKm ?? 0} km
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.volunteerProfile.skills.map((skill) => (
                    <Badge key={skill} tone="neutral">
                      {skill}
                    </Badge>
                  ))}
                  {profile.volunteerProfile.assets.map((asset) => (
                    <Badge key={asset} tone="warn">
                      {asset}
                    </Badge>
                  ))}
                </div>
                {profile.volunteerProfile.skillTags &&
                profile.volunteerProfile.skillTags.length > 0 ? (
                  <div className="rounded-[24px] border border-border bg-white/84 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/65">
                      Professional skill tags
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.volunteerProfile.skillTags.map((tag) => (
                        <Badge key={tag} tone="info">
                          {tag.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {profile?.donorProfile ? (
              <>
                <div className="rounded-[24px] border border-border bg-white/84 p-4">
                  <p className="text-lg font-semibold text-command">
                    Donor support preferences
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    Preferred help types saved during registration.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.donorProfile.helpTypes.map((type) => (
                    <Badge key={type} tone="safe">
                      {type}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}

            {!profile?.ngoProfile &&
            !profile?.volunteerProfile &&
            !profile?.donorProfile ? (
              <FeedbackPanel
                state="info"
                title="Basic profile only"
                description="This account has a common identity profile. Role-specific fields will appear here once they are saved."
                className="shadow-none"
              />
            ) : null}
          </div>
        </div>
      </section>

      {profileData && session.role === "ngo" ? (
        <section className="surface-panel rounded-[34px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                NGO crisis history
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Current and previous crisis work
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-command-soft/78">
                Crisis rooms created by this NGO are tracked with active members, completed tasks, pledged support, and issued certificates.
              </p>
            </div>
            <Badge tone="alert" caps={false}>
              {profileData.createdCrises.length} rooms
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {profileData.ngoHistoryRows.length > 0 ? (
              profileData.ngoHistoryRows.map((row) => (
                <div
                  key={row.crisis.id}
                  className="rounded-[24px] border border-border bg-white/84 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge
                        tone={row.crisis.status === "resolved" ? "safe" : "warn"}
                        caps={false}
                      >
                        {row.crisis.status === "resolved" ? "Previous help" : "Current crisis"}
                      </Badge>
                      <h3 className="mt-3 text-lg font-semibold text-command">
                        {row.crisis.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-command-soft/78">
                        {row.crisis.location.address}
                      </p>
                    </div>
                    <Button href={`/crisis/${row.crisis.id}`} variant="secondary" size="sm">
                      Open
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Active members", row.activeMembers],
                      ["Completed tasks", `${row.completedTasks}/${row.totalTasks}`],
                      ["Pledged units", formatNumber(row.pledgeUnits)],
                      ["Certificates", row.certificates],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[18px] border border-border bg-mist/32 p-3"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-command-soft/65">
                          {label}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-command">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {row.moneyRaised > 0 ? (
                    <p className="mt-4 text-sm leading-6 text-command-soft/78">
                      Demo money raised: Rs {formatNumber(row.moneyRaised)}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <FeedbackPanel
                state="empty"
                title="No NGO crisis history yet"
                description="Create a crisis room from the NGO dashboard and it will be recorded here."
                className="shadow-none xl:col-span-3"
              />
            )}
          </div>
        </section>
      ) : null}

      {profileData ? (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-panel rounded-[34px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                  My pledge history
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Donations and raised support
                </h2>
              </div>
              <Badge tone="warn">{profileData.donorPledges.length} records</Badge>
            </div>
            <div className="mt-6 space-y-3">
              {profileData.donorPledges.length > 0 ? (
                profileData.donorPledges.slice(0, 6).map((pledge) => (
                  <div
                    key={pledge.id}
                    className="rounded-[24px] border border-border bg-white/84 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-command">
                          {pledge.itemType}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-command-soft/78">
                          {pledge.quantity
                            ? `${formatNumber(pledge.quantity)} units pledged`
                            : `₹${formatNumber(pledge.amount ?? 0)} demo money pledge`}
                        </p>
                      </div>
                      <Badge tone={pledge.status === "fulfilled" ? "safe" : "warn"}>
                        {pledge.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <FeedbackPanel
                  state="empty"
                  title="No pledge records yet"
                  description="When you pledge supplies or demo money, your personal records will appear here."
                  className="shadow-none"
                />
              )}
            </div>
          </div>

          <div className="surface-panel rounded-[34px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                  My relief work
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Assignments and certificates
                </h2>
              </div>
              <Badge tone="safe">
                {profileData.matches.length + profileData.certificates.length} linked
              </Badge>
            </div>

            <div className="mt-6 space-y-3">
              {[...profileData.matches.slice(0, 4), ...profileData.certificates.slice(0, 3)]
                .length > 0 ? (
                <>
                  {profileData.matches.slice(0, 4).map((match) => (
                    <div
                      key={match.id}
                      className="rounded-[24px] border border-border bg-white/84 p-4"
                    >
                      <p className="text-sm font-semibold text-command">
                        Task match {match.score}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-command-soft/78">
                        Status: {match.status} - {match.reasons.join(", ")}
                      </p>
                    </div>
                  ))}
                  {profileData.certificates.slice(0, 3).map((certificate) => (
                    <div
                      key={certificate.id}
                      className="rounded-[24px] border border-border bg-white/84 p-4"
                    >
                      <p className="text-sm font-semibold text-command">
                        Certificate {certificate.certificateNumber}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-command-soft/78">
                        {certificate.crisisTitle} - {certificate.serviceHours} hours
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <FeedbackPanel
                  state="empty"
                  title="No linked relief work yet"
                  description="Assignments and certificates linked to your volunteer profile will appear here."
                  className="shadow-none"
                />
              )}
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
