"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { StatCard } from "@/components/StatCard";
import { firebasePlaceholder, isFirebaseConfigured } from "@/lib/firebase";
import {
  getLocalDatabaseSnapshot,
  type LocalDatabaseSnapshot,
} from "@/lib/local-database";
import { progressPercentage } from "@/lib/utils";
import type { DashboardStat } from "@/types";

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DatabaseView() {
  const [database, setDatabase] = useState<LocalDatabaseSnapshot | null>(null);

  function refreshDatabase() {
    setDatabase(getLocalDatabaseSnapshot());
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDatabase(getLocalDatabaseSnapshot());
    }, 0);

    return () => window.clearTimeout(handle);
  }, []);

  const dashboardData = useMemo(() => {
    if (!database) {
      return null;
    }

    const itemQuantityRaised = database.resourcePledges.reduce(
      (sum, pledge) => sum + (pledge.quantity ?? 0),
      0,
    );
    const moneyPledged = database.resourcePledges.reduce(
      (sum, pledge) => sum + (pledge.amount ?? 0),
      0,
    );
    const quantityNeeded = database.resourceNeeds.reduce(
      (sum, need) => sum + need.quantityNeeded,
      0,
    );
    const quantityPledged = database.resourceNeeds.reduce(
      (sum, need) => sum + need.quantityPledged,
      0,
    );
    const coverage = progressPercentage(quantityPledged, quantityNeeded);
    const openTasks = database.tasks.filter(
      (task) => task.status !== "completed" && task.status !== "cancelled",
    ).length;
    const verifiedPledges = database.resourcePledges.filter(
      (pledge) => pledge.status === "verified" || pledge.status === "fulfilled",
    ).length;

    const stats: DashboardStat[] = [
      {
        label: "Items raised",
        value: formatNumber(itemQuantityRaised),
        change: "resource pledges",
        helper: "Total quantity recorded across food, shelter, medicine, transport, and other resource pledges.",
        tone: "safe",
      },
      {
        label: "Money pledged",
        value: `₹${formatNumber(moneyPledged)}`,
        change: "demo only",
        helper: "Money pledges are stored for campaign history. No real payment gateway is connected.",
        tone: "warn",
      },
      {
        label: "Need coverage",
        value: `${coverage}%`,
        change: `${quantityPledged}/${quantityNeeded || 0}`,
        helper: "Public need board coverage based on quantity pledged versus quantity requested.",
        tone: coverage >= 80 ? "safe" : "info",
      },
      {
        label: "Open work",
        value: String(openTasks),
        change: "task history",
        helper: `${database.tasks.length} total tasks are stored with current status and assignment history.`,
        tone: "alert",
      },
      {
        label: "Verified pledges",
        value: String(verifiedPledges),
        change: "trust state",
        helper: "Pledges can remain pending until an NGO verifies delivery or fulfillment.",
        tone: "neutral",
      },
    ];

    return {
      stats,
      itemQuantityRaised,
      moneyPledged,
      coverage,
    };
  }, [database]);

  return (
    <AppShell
      currentPath="/database"
      eyebrow="Database"
      title="Relief history and pledge records"
      description="Review what happened in the past: crisis rooms, raised needs, donor pledges, task activity, certificates, and local database events."
      actions={
        <>
          <Button type="button" size="lg" onClick={refreshDatabase}>
            Refresh database
          </Button>
          <Button href="/donor" variant="secondary" size="lg">
            Add pledge
          </Button>
        </>
      }
    >
      {!database || !dashboardData ? (
        <section className="surface-panel skeleton-sheen h-64 rounded-[34px]" />
      ) : (
        <>
          <section className="surface-panel rounded-[34px] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={isFirebaseConfigured ? "safe" : "info"}>
                    {firebasePlaceholder.label}
                  </Badge>
                  <Badge tone="warn">Browser persistent</Badge>
                  <Badge tone="neutral">{database.activityLog.length} events</Badge>
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-foreground">
                  Stored records overview
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-command-soft/78">
                  {firebasePlaceholder.note} Records survive refreshes in this
                  browser, so pledge and workflow history is visible even without
                  Firebase credentials.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-80">
                <div className="rounded-[24px] border border-border bg-white/80 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/65">
                    Collections
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-command">8</p>
                </div>
                <div className="rounded-[24px] border border-border bg-white/80 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-command-soft/65">
                    Users
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-command">
                    {database.users.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboardData.stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="surface-panel rounded-[34px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                    Activity log
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    What happened recently
                  </h2>
                </div>
                <Badge tone="safe">{database.activityLog.length} events</Badge>
              </div>

              <div className="mt-6 space-y-3">
                {database.activityLog.slice(0, 12).map((event) => (
                  <article
                    key={event.id}
                    className="motion-card rounded-[24px] border border-border bg-white/84 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={event.tone}>{event.action}</Badge>
                          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-command-soft/60">
                            {event.collection}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-command">
                          {event.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-command-soft/78">
                          {event.description}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-xs leading-5 text-command-soft/62">
                        {formatDate(event.createdAt)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="surface-panel rounded-[34px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                    Donor records
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    What people donated
                  </h2>
                </div>
                <Badge tone="warn">{database.resourcePledges.length} pledges</Badge>
              </div>

              <div className="mt-6 overflow-x-auto rounded-[24px] border border-border bg-white/86">
                <table className="min-w-full divide-y divide-border text-left text-sm">
                  <thead className="bg-mist/60">
                    <tr className="text-xs uppercase tracking-[0.18em] text-command-soft/70">
                      <th className="px-4 py-4 font-medium">Donor</th>
                      <th className="px-4 py-4 font-medium">Item</th>
                      <th className="px-4 py-4 font-medium">Quantity</th>
                      <th className="px-4 py-4 font-medium">Amount</th>
                      <th className="px-4 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-command-soft/82">
                    {database.resourcePledges.slice(0, 12).map((pledge) => (
                      <tr key={pledge.id}>
                        <td className="px-4 py-4 font-medium text-command">
                          {pledge.donorId}
                        </td>
                        <td className="px-4 py-4">{pledge.itemType}</td>
                        <td className="px-4 py-4">
                          {pledge.quantity ? formatNumber(pledge.quantity) : "-"}
                        </td>
                        <td className="px-4 py-4">
                          {pledge.amount ? `₹${formatNumber(pledge.amount)}` : "-"}
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            tone={
                              pledge.status === "fulfilled"
                                ? "safe"
                                : pledge.status === "verified"
                                  ? "info"
                                  : "warn"
                            }
                            caps={false}
                          >
                            {pledge.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="surface-panel rounded-[34px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                    Raised needs
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    What NGOs raised
                  </h2>
                </div>
                <Badge tone="info">{database.resourceNeeds.length} needs</Badge>
              </div>

              <div className="mt-6 space-y-3">
                {database.resourceNeeds.slice(0, 8).map((need) => (
                  <div
                    key={need.id}
                    className="rounded-[24px] border border-border bg-white/84 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-command">
                          {need.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-command-soft/78">
                          {need.quantityPledged}/{need.quantityNeeded} pledged -
                          deadline {need.deadline}
                        </p>
                      </div>
                      <Badge tone={need.urgency === "critical" ? "alert" : "warn"}>
                        {need.urgency}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-panel rounded-[34px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                    Crisis and task records
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    Operations database
                  </h2>
                </div>
                <Badge tone="alert">{database.crises.length} crises</Badge>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {database.crises.map((crisis) => {
                  const crisisTasks = database.tasks.filter(
                    (task) => task.crisisId === crisis.id,
                  );

                  return (
                    <article
                      key={crisis.id}
                      className="motion-card rounded-[24px] border border-border bg-white/84 p-4"
                    >
                      <Badge tone={crisis.riskLevel === "red" ? "alert" : "warn"}>
                        {crisis.type}
                      </Badge>
                      <h3 className="mt-3 text-lg font-semibold text-command">
                        {crisis.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-command-soft/78">
                        {crisis.familiesAffected} families - {crisis.location.address}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-command">
                        {crisisTasks.length} stored tasks
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
