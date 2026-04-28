"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CrisisCard } from "@/components/CrisisCard";
import { CrisisReportIntake } from "@/components/CrisisReportIntake";
import { StatCard } from "@/components/StatCard";
import { TaskCard } from "@/components/TaskCard";
import { VolunteerCard } from "@/components/VolunteerCard";
import { getCurrentUser, getUserProfile } from "@/lib/auth";
import { getAllCrises, getAllTasks, getVolunteerProfiles } from "@/lib/firestore";
import {
  activeCrises,
  adminCrisisReports,
  getAllNGOProfiles,
  getNGOProfileByCrisisId,
  volunteers as mockVolunteers,
  tasks as mockTasks,
} from "@/data/mock-data";
import type {
  Crisis,
  CrisisReport,
  DashboardStat,
  NGOProfile,
  ReliefTask,
  VolunteerProfile,
} from "@/types";

type AdminAccessMode = "loading" | "guard" | "admin" | "demo";
type AdminReviewFlag = "clean" | "duplicate" | "suspicious";

interface AdminNGOReviewItem {
  id: string;
  profile: NGOProfile;
  crisisTitle?: string;
  reviewStatus: "pending" | "verified";
}

interface AdminVolunteerReviewItem {
  id: string;
  volunteer: VolunteerProfile;
  reviewStatus: "pending" | "verified";
}

interface AdminReportReviewItem {
  id: string;
  report: CrisisReport;
  reviewFlag: AdminReviewFlag;
}

interface AdminHighRiskTaskItem {
  id: string;
  task: ReliefTask;
  approvalStatus: "pending" | "approved";
}

function mergeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function buildNGOReviewQueue(crises: Crisis[]) {
  return getAllNGOProfiles().map((profile, index) => {
    const linkedCrisis = crises.find(
      (crisis) => getNGOProfileByCrisisId(crisis.id)?.id === profile.id,
    );

    return {
      id: profile.id,
      profile,
      crisisTitle: linkedCrisis?.title,
      reviewStatus:
        !profile.verified || profile.status !== "active" || index === 0
          ? "pending"
          : "verified",
    } satisfies AdminNGOReviewItem;
  });
}

function buildVolunteerReviewQueue(volunteers: VolunteerProfile[]) {
  return volunteers.map(
    (volunteer) =>
      ({
        id: volunteer.id,
        volunteer,
        reviewStatus:
          !volunteer.verified || volunteer.status !== "active"
            ? "pending"
            : "verified",
      }) satisfies AdminVolunteerReviewItem,
  );
}

function buildReportReviewQueue() {
  return adminCrisisReports.map(
    (report, index) =>
      ({
        id: report.id,
        report,
        reviewFlag:
          index === 1 ? "duplicate" : index === 2 ? "suspicious" : "clean",
      }) satisfies AdminReportReviewItem,
  );
}

function buildHighRiskTaskQueue(tasks: ReliefTask[]) {
  const redTasks = tasks.filter((task) => task.riskLevel === "red");

  return redTasks.map(
    (task, index) =>
      ({
        id: task.id,
        task,
        approvalStatus: !task.verified || index === 0 ? "pending" : "approved",
      }) satisfies AdminHighRiskTaskItem,
  );
}

function reportTone(report: CrisisReport) {
  if (report.priority === "critical" || report.riskLevel === "red") {
    return "alert" as const;
  }

  if (report.priority === "high") {
    return "warn" as const;
  }

  return "neutral" as const;
}

function reviewFlagTone(flag: AdminReviewFlag) {
  if (flag === "duplicate") {
    return "warn" as const;
  }

  if (flag === "suspicious") {
    return "alert" as const;
  }

  return "safe" as const;
}

export default function AdminPage() {
  const [accessMode, setAccessMode] = useState<AdminAccessMode>("loading");
  const [viewerName, setViewerName] = useState("Admin");
  const [guardMessage, setGuardMessage] = useState(
    "Checking whether this account has admin access.",
  );
  const [firestoreCrises, setFirestoreCrises] = useState<Crisis[]>([]);
  const [ngoQueue, setNgoQueue] = useState<AdminNGOReviewItem[]>([]);
  const [volunteerQueue, setVolunteerQueue] = useState<AdminVolunteerReviewItem[]>([]);
  const [reportQueue, setReportQueue] = useState<AdminReportReviewItem[]>([]);
  const [highRiskTaskQueue, setHighRiskTaskQueue] = useState<AdminHighRiskTaskItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadAdminPanel() {
      const [crisesResult, tasksResult, volunteersResult] = await Promise.allSettled([
        getAllCrises(),
        getAllTasks(),
        getVolunteerProfiles(),
      ]);

      if (!isActive) {
        return;
      }

      const mergedCrises = mergeById([
        ...(crisesResult.status === "fulfilled" ? crisesResult.value : []),
        ...activeCrises,
      ]);
      const mergedTasks = mergeById([
        ...(tasksResult.status === "fulfilled" ? tasksResult.value : []),
        ...mockTasks,
      ]);
      const mergedVolunteers = mergeById([
        ...(volunteersResult.status === "fulfilled" ? volunteersResult.value : []),
        ...mockVolunteers,
      ]);

      setFirestoreCrises(mergedCrises);
      setNgoQueue(buildNGOReviewQueue(mergedCrises));
      setVolunteerQueue(buildVolunteerReviewQueue(mergedVolunteers));
      setReportQueue(buildReportReviewQueue());
      setHighRiskTaskQueue(buildHighRiskTaskQueue(mergedTasks));

      if (
        crisesResult.status === "rejected" &&
        tasksResult.status === "rejected" &&
        volunteersResult.status === "rejected"
      ) {
        setLoadError(
          "Firestore moderation data is unavailable, so the admin panel is using MVP demo data for review queues.",
        );
      }

      const currentUser = getCurrentUser();

      if (!currentUser) {
        setAccessMode("guard");
        setGuardMessage(
          "Sign in with an admin account to access moderation controls, or use demo mode for the hackathon walkthrough.",
        );
        return;
      }

      try {
        const profile = await getUserProfile(currentUser.uid);

        if (!isActive) {
          return;
        }

        if (profile?.role === "admin") {
          setAccessMode("admin");
          setViewerName(profile.name);
          return;
        }

        setAccessMode("guard");
        setGuardMessage(
          "This signed-in account does not have the admin role. Use an admin account or open demo mode for the MVP.",
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setAccessMode("guard");
        setGuardMessage(
          error instanceof Error
            ? error.message
            : "Admin access could not be confirmed right now.",
        );
      }
    }

    loadAdminPanel().catch((error) => {
      if (!isActive) {
        return;
      }

      setAccessMode("guard");
      setGuardMessage(
        error instanceof Error
          ? error.message
          : "Unable to initialize the admin panel right now.",
      );
    });

    return () => {
      isActive = false;
    };
  }, []);

  const adminStats = useMemo<DashboardStat[]>(() => {
    const pendingNGOReviews = ngoQueue.filter((item) => item.reviewStatus === "pending").length;
    const pendingVolunteerReviews = volunteerQueue.filter(
      (item) => item.reviewStatus === "pending",
    ).length;
    const flaggedReports = reportQueue.filter((item) => item.reviewFlag !== "clean").length;
    const pendingRedTasks = highRiskTaskQueue.filter(
      (item) => item.approvalStatus === "pending",
    ).length;

    return [
      {
        label: "Pending NGO reviews",
        value: String(pendingNGOReviews),
        change: pendingNGOReviews > 0 ? "verification queue" : "all clear",
        helper: "NGO profiles can be verified directly from this moderation panel.",
        tone: pendingNGOReviews > 0 ? "warn" : "safe",
      },
      {
        label: "Volunteer checks",
        value: String(pendingVolunteerReviews),
        change: "trust queue",
        helper: "Volunteer identity and readiness can be verified before high-sensitivity assignments.",
        tone: pendingVolunteerReviews > 0 ? "info" : "safe",
      },
      {
        label: "Flagged reports",
        value: String(flaggedReports),
        change: "manual review",
        helper: "Duplicate and suspicious reports stay visible until an admin resolves them.",
        tone: flaggedReports > 0 ? "alert" : "safe",
      },
      {
        label: "Red-risk tasks",
        value: String(pendingRedTasks),
        change: "needs approval",
        helper: "High-risk red tasks remain gated until an admin approves them.",
        tone: pendingRedTasks > 0 ? "alert" : "safe",
      },
      {
        label: "Active crises",
        value: String(
          firestoreCrises.filter((crisis) => crisis.status !== "resolved").length,
        ),
        change: "global watch",
        helper: "Every active crisis room remains visible to admin reviewers from one surface.",
        tone: "neutral",
      },
    ];
  }, [firestoreCrises, highRiskTaskQueue, ngoQueue, reportQueue, volunteerQueue]);

  function enableDemoMode() {
    setAccessMode("demo");
    setViewerName("Demo admin");
    setMessage(
      "Demo admin mode is active. Review actions are working locally for the MVP walkthrough.",
    );
  }

  function verifyNGO(id: string) {
    setNgoQueue((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              reviewStatus: "verified",
              profile: {
                ...item.profile,
                verified: true,
                status: "active",
                updatedAt: new Date().toISOString(),
              },
            }
          : item,
      ),
    );
    setMessage("NGO verification recorded in the admin review queue.");
  }

  function verifyVolunteer(id: string) {
    setVolunteerQueue((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              reviewStatus: "verified",
              volunteer: {
                ...item.volunteer,
                verified: true,
                status: "active",
                updatedAt: new Date().toISOString(),
              },
            }
          : item,
      ),
    );
    setMessage("Volunteer verification recorded in the admin review queue.");
  }

  function updateReportFlag(id: string, nextFlag: AdminReviewFlag) {
    setReportQueue((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              reviewFlag: nextFlag,
              report: {
                ...item.report,
                status:
                  nextFlag === "clean"
                    ? "verified"
                    : nextFlag === "duplicate"
                      ? "rejected"
                      : "reviewing",
                updatedAt: new Date().toISOString(),
              },
            }
          : item,
      ),
    );
    setMessage(
      nextFlag === "clean"
        ? "Crisis report marked clean and ready for operations."
        : `Crisis report flagged as ${nextFlag}.`,
    );
  }

  function approveRedTask(id: string) {
    setHighRiskTaskQueue((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              approvalStatus: "approved",
              task: {
                ...item.task,
                verified: true,
                updatedAt: new Date().toISOString(),
              },
            }
          : item,
      ),
    );
    setMessage("High-risk red task approved for NGO operations.");
  }

  if (accessMode === "loading") {
    return (
      <AppShell
        currentPath="/admin"
        eyebrow="Admin Control"
        title="Loading admin panel"
        description="Preparing moderation queues, trust signals, and active crisis oversight."
      >
        <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm leading-7 text-command-soft/78">
            Checking role access and assembling the admin review queues.
          </p>
        </section>
      </AppShell>
    );
  }

  if (accessMode === "guard") {
    return (
      <AppShell
        currentPath="/admin"
        eyebrow="Admin Control"
        title="Admin access required"
        description="This route uses a basic role-based admin guard for the MVP. Sign in as an admin or use demo mode to review the oversight UI."
        actions={
          <>
            <Button href="/login" size="lg">
              Sign in as admin
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={enableDemoMode}>
              Use demo admin mode
            </Button>
          </>
        }
      >
        <section className="rounded-[32px] border border-alert/20 bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm font-semibold text-alert">Role-based access guard</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">{guardMessage}</p>
        </section>

        {loadError ? (
          <section className="rounded-[32px] border border-warn/20 bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <p className="text-sm font-semibold text-command">Data source note</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">{loadError}</p>
          </section>
        ) : null}
      </AppShell>
    );
  }

  return (
    <AppShell
      currentPath="/admin"
      eyebrow="Admin Control"
      title="Verification and oversight panel"
      description="Verify NGOs and volunteers, review crisis reports, flag suspicious updates, approve red-risk tasks, and watch all active crises from one admin surface."
      actions={
        <Badge tone={accessMode === "admin" ? "safe" : "warn"}>
          {accessMode === "admin" ? `${viewerName} admin session` : "Demo admin mode"}
        </Badge>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {adminStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      {message ? (
        <section className="rounded-[32px] border border-safe/20 bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm font-semibold text-safe">Admin action recorded</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">{message}</p>
        </section>
      ) : null}

      {loadError ? (
        <section className="rounded-[32px] border border-warn/20 bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm font-semibold text-command">Data source note</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">{loadError}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                NGO verification
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Verify NGO registrations
              </h2>
            </div>
            <Badge tone="warn">
              {ngoQueue.filter((item) => item.reviewStatus === "pending").length} pending
            </Badge>
          </div>
          <div className="mt-6 space-y-4">
            {ngoQueue.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-border bg-white/86 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-command">
                      {item.profile.organizationName}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-command-soft/78">
                      Registration: {item.profile.registrationNumber}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-command-soft/78">
                      Focus: {item.profile.focusAreas.join(", ")}
                    </p>
                    {item.crisisTitle ? (
                      <p className="mt-1 text-sm leading-6 text-command-soft/70">
                        Linked crisis: {item.crisisTitle}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={item.reviewStatus === "verified" ? "safe" : "warn"}>
                    {item.reviewStatus}
                  </Badge>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    size="sm"
                    disabled={item.reviewStatus === "verified"}
                    onClick={() => verifyNGO(item.id)}
                  >
                    {item.reviewStatus === "verified" ? "Verified" : "Verify NGO"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Volunteer verification
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Verify volunteer readiness
              </h2>
            </div>
            <Badge tone="info">
              {volunteerQueue.filter((item) => item.reviewStatus === "pending").length} pending
            </Badge>
          </div>
          <div className="mt-6 grid gap-4">
            {volunteerQueue.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="rounded-[28px] border border-border bg-white/82 p-4"
              >
                <VolunteerCard volunteer={item.volunteer} />
                <div className="mt-4 flex items-center justify-between gap-4">
                  <Badge tone={item.reviewStatus === "verified" ? "safe" : "warn"}>
                    {item.reviewStatus}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    disabled={item.reviewStatus === "verified"}
                    onClick={() => verifyVolunteer(item.id)}
                  >
                    {item.reviewStatus === "verified"
                      ? "Volunteer verified"
                      : "Verify volunteer"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <div className="space-y-6">
          <CrisisReportIntake />

          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Crisis reports
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  Review and flag reports
                </h2>
              </div>
              <Badge tone="alert">
                {reportQueue.filter((item) => item.reviewFlag !== "clean").length} flagged
              </Badge>
            </div>

            <div className="mt-6 space-y-4">
              {reportQueue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-border bg-white/86 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={reportTone(item.report)}>{item.report.priority}</Badge>
                    <Badge tone={reviewFlagTone(item.reviewFlag)}>
                      {item.reviewFlag === "clean" ? "clean" : item.reviewFlag}
                    </Badge>
                    <Badge tone={item.report.verified ? "safe" : "warn"}>
                      {item.report.status}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-command">
                    {item.report.description}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    Reporter: {item.report.reporterName} - {item.report.location.address}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.report.needs.map((need) => (
                      <Badge key={need} tone="neutral">
                        {need}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => updateReportFlag(item.id, "clean")}
                    >
                      Mark clean
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => updateReportFlag(item.id, "duplicate")}
                    >
                      Flag duplicate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => updateReportFlag(item.id, "suspicious")}
                    >
                      Flag suspicious
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                High-risk red tasks
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Approval required before publish
              </h2>
            </div>
            <Badge tone="alert">
              {highRiskTaskQueue.filter((item) => item.approvalStatus === "pending").length} pending
            </Badge>
          </div>
          <div className="mt-6 space-y-4">
            {highRiskTaskQueue.length > 0 ? (
              highRiskTaskQueue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[28px] border border-border bg-white/82 p-4"
                >
                  <TaskCard task={item.task} />
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <Badge tone={item.approvalStatus === "approved" ? "safe" : "alert"}>
                      {item.approvalStatus === "approved"
                        ? "approved for publish"
                        : "awaiting admin approval"}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      disabled={item.approvalStatus === "approved"}
                      onClick={() => approveRedTask(item.id)}
                    >
                      {item.approvalStatus === "approved"
                        ? "Approved"
                        : "Approve high-risk task"}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-white/80 p-5">
                <p className="text-sm font-semibold text-command">No red-risk tasks</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  High-risk tasks requiring approval will appear here automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Active crises
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Global watchlist
              </h2>
            </div>
            <Badge tone="neutral">All active crises</Badge>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {firestoreCrises.map((crisis) => (
              <CrisisCard key={crisis.id} crisis={crisis} />
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Oversight summary
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Current moderation posture
              </h2>
            </div>
            <Badge tone={accessMode === "admin" ? "safe" : "warn"}>
              {accessMode === "admin" ? "Role verified" : "Demo mode"}
            </Badge>
          </div>

          <div className="mt-6 space-y-4">
            {[
              `${ngoQueue.filter((item) => item.reviewStatus === "pending").length} NGO profiles are waiting for verification.`,
              `${volunteerQueue.filter((item) => item.reviewStatus === "pending").length} volunteer profiles still need trust review.`,
              `${reportQueue.filter((item) => item.reviewFlag !== "clean").length} crisis reports are flagged as duplicate or suspicious.`,
              `${highRiskTaskQueue.filter((item) => item.approvalStatus === "pending").length} red-risk tasks still need admin approval.`,
            ].map((note) => (
              <div
                key={note}
                className="rounded-[24px] border border-border bg-white/86 p-4"
              >
                <p className="text-sm font-semibold text-command">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
