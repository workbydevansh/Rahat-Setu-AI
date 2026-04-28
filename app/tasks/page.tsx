import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ResourceCard } from "@/components/ResourceCard";
import { StatCard } from "@/components/StatCard";
import { TaskCard } from "@/components/TaskCard";
import {
  activeCrises,
  getCrisisById,
  resourceNeeds,
  tasks,
  volunteers,
} from "@/data/mock-data";
import type { DashboardStat, ReliefTask } from "@/types";

export const metadata = {
  title: "Task Board",
};

function taskLane(
  title: string,
  eyebrow: string,
  laneTasks: ReliefTask[],
  badgeTone: "neutral" | "info" | "safe" | "warn" | "alert",
) {
  return (
    <section className="surface-panel rounded-[34px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">{title}</h2>
        </div>
        <Badge tone={badgeTone}>{laneTasks.length} tasks</Badge>
      </div>

      <div className="mt-6 space-y-4">
        {laneTasks.length > 0 ? (
          laneTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-white/80 p-5">
            <p className="text-sm font-semibold text-command">No tasks in this lane</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">
              New NGO assignments will appear here as field work changes status.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function TasksPage() {
  const openTasks = tasks.filter((task) => task.status === "open");
  const assignedTasks = tasks.filter(
    (task) => task.status === "assigned" || task.status === "in-progress",
  );
  const redRiskTasks = tasks.filter((task) => task.riskLevel === "red");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const totalAssigned = tasks.reduce((sum, task) => sum + task.assignedCount, 0);
  const totalNeeded = tasks.reduce((sum, task) => sum + task.volunteersNeeded, 0);

  const stats: DashboardStat[] = [
    {
      label: "Open tasks",
      value: String(openTasks.length),
      change: "publish lane",
      helper: "Open work is ready for volunteer matching and public-safe sorting.",
      tone: "warn",
    },
    {
      label: "Assigned",
      value: String(assignedTasks.length),
      change: "in motion",
      helper: `${totalAssigned} of ${totalNeeded} needed volunteer slots are already covered.`,
      tone: "info",
    },
    {
      label: "Red-risk",
      value: String(redRiskTasks.length),
      change: "gated",
      helper: "High-risk tasks stay visible so admins and NGOs can control assignment.",
      tone: "alert",
    },
    {
      label: "Responders",
      value: String(volunteers.length),
      change: "registry",
      helper: "Volunteer profiles feed skill, language, asset, and distance matching.",
      tone: "safe",
    },
  ];

  return (
    <AppShell
      currentPath="/tasks"
      eyebrow="Task Board"
      title="Dispatch work across relief lanes"
      description="A dedicated task page for open assignments, active field work, red-risk approval needs, and resource-linked support."
      actions={
        <>
          <Button href="/ngo/crisis/new" size="lg">
            Create crisis
          </Button>
          <Button href="/volunteer/dashboard" variant="secondary" size="lg">
            Volunteer view
          </Button>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {taskLane("Open assignments", "Ready for matching", openTasks, "warn")}
        {taskLane("Assigned and in progress", "Field workflow", assignedTasks, "info")}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {taskLane("Red-risk approval lane", "Safety gated", redRiskTasks, "alert")}

        <section className="surface-panel rounded-[34px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                Crisis routing
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Task load by crisis room
              </h2>
            </div>
            <Badge tone="safe">{activeCrises.length} rooms</Badge>
          </div>

          <div className="mt-6 grid gap-4">
            {activeCrises.map((crisis) => {
              const crisisTasks = tasks.filter((task) => task.crisisId === crisis.id);
              const firstNeed = resourceNeeds.find(
                (need) => need.crisisId === crisis.id,
              );

              return (
                <div
                  key={crisis.id}
                  className="motion-card rounded-[24px] border border-border bg-white/84 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-command">
                        {crisis.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-command-soft/78">
                        {crisis.location.address}
                      </p>
                    </div>
                    <Badge tone={crisis.riskLevel === "red" ? "alert" : "warn"}>
                      {crisisTasks.length} tasks
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {crisisTasks.map((task) => (
                      <Badge key={task.id} tone="neutral" caps={false}>
                        {task.title}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button href={`/crisis/${crisis.id}`} variant="secondary" size="sm">
                      Open crisis room
                    </Button>
                    {firstNeed ? (
                      <Button href={`/donor/pledge/${firstNeed.id}`} size="sm">
                        Pledge linked need
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {taskLane("Completed work", "Certificate path", completedTasks, "safe")}

        <section className="surface-panel rounded-[34px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                Resource-linked tasks
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Supply gaps that need action
              </h2>
            </div>
            <Badge tone="warn">{resourceNeeds.length} needs</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {resourceNeeds.slice(0, 3).map((need) => {
              const crisis = getCrisisById(need.crisisId);

              return (
                <div key={need.id} className="rounded-[24px] bg-white/72 p-3">
                  <p className="mb-3 text-sm font-semibold text-command">
                    {crisis?.title ?? "Crisis room"}
                  </p>
                  <ResourceCard
                    need={need}
                    actionHref={`/donor/pledge/${need.id}`}
                    actionLabel="Pledge"
                  />
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
