import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { ImpactHubMap } from "@/components/ImpactHubMap";
import { activeCrises } from "@/data/mock-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impact Hub — Rahat Setu AI",
  description:
    "Explore every crisis where Rahat Setu coordinated relief. View interactive maps, impact metrics, and stories of the people helped.",
};

export default function ImpactHubPage() {
  return (
    <AppShell
      currentPath="/impact-hub"
      eyebrow="Transparency & past work"
      title="Impact Hub — See every crisis, every story, every life touched."
      description="An interactive timeline of Rahat Setu's crisis response work. Click any pin to explore real impact metrics and spotlight stories from the field."
      actions={
        <Badge tone="safe" caps={false}>
          {activeCrises.length} documented crises
        </Badge>
      }
    >
      <ImpactHubMap crises={activeCrises} />

      {/* Aggregate impact summary */}
      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
          Aggregate impact
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-command">
          Combined response reach
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-command-soft/78">
          Aggregate figures across all documented crises to show the total
          footprint of community-driven relief.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-border bg-white/85 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-command-soft/60">
              Total families
            </p>
            <p className="mt-2 text-3xl font-bold text-command">
              {activeCrises
                .reduce((sum, c) => sum + c.familiesAffected, 0)
                .toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-[24px] border border-border bg-white/85 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-command-soft/60">
              Volunteers mobilized
            </p>
            <p className="mt-2 text-3xl font-bold text-command">
              {activeCrises
                .reduce((sum, c) => sum + c.matchedVolunteers, 0)
                .toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-[24px] border border-border bg-white/85 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-command-soft/60">
              Open tasks
            </p>
            <p className="mt-2 text-3xl font-bold text-command">
              {activeCrises
                .reduce((sum, c) => sum + c.openTasks, 0)
                .toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-[24px] border border-border bg-white/85 p-5 shadow-[0_12px_24px_rgba(17,36,58,0.06)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-command-soft/60">
              Crisis types covered
            </p>
            <p className="mt-2 text-3xl font-bold text-command">
              {new Set(activeCrises.map((c) => c.type)).size}
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-[32px] border border-border bg-[linear-gradient(145deg,rgba(17,36,58,0.96),rgba(31,64,96,0.95))] p-6 text-white shadow-[0_24px_72px_rgba(17,36,58,0.18)]">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/50">
          How impact is tracked
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Transparent, verifiable, community-driven
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-white/8 p-5">
            <p className="text-lg font-semibold">📍 Crisis pins</p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Every past and active crisis is mapped with its location, type,
              and scale. Click to explore.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 p-5">
            <p className="text-lg font-semibold">📊 Hard metrics</p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Meals served, families sheltered, kits delivered — real numbers
              updated by field coordinators.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 p-5">
            <p className="text-lg font-semibold">📖 Story spotlights</p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Short narratives of real people helped, with quotes and context —
              so impact feels human, not abstract.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
