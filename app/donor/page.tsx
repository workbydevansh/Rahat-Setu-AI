"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CrisisMap, type CrisisMapPoint } from "@/components/CrisisMap";
import { CrisisCard } from "@/components/CrisisCard";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { ResourceCard } from "@/components/ResourceCard";
import { StatCard } from "@/components/StatCard";
import {
  activeCrises,
  donorStats,
  getNGOProfileByCrisisId,
  getTasksByCrisisId,
  getVolunteersByCrisisId,
  resourceNeeds as mockResourceNeeds,
} from "@/data/mock-data";
import { getAllResourceNeeds } from "@/lib/firestore";
import { toneFromCrisisType, toneFromTaskStatus } from "@/lib/utils";
import type { ResourceNeed, VolunteerProfile } from "@/types";

export default function DonorPage() {
  const [firestoreNeeds, setFirestoreNeeds] = useState<ResourceNeed[]>([]);
  const [isLoadingNeeds, setIsLoadingNeeds] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadNeeds() {
      setIsLoadingNeeds(true);
      setLoadError(null);

      try {
        const nextNeeds = await getAllResourceNeeds();

        if (!isActive) {
          return;
        }

        setFirestoreNeeds(nextNeeds);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load Firestore resource needs right now.",
        );
      } finally {
        if (isActive) {
          setIsLoadingNeeds(false);
        }
      }
    }

    loadNeeds();

    return () => {
      isActive = false;
    };
  }, []);

  const mergedNeeds = [
    ...firestoreNeeds,
    ...mockResourceNeeds.filter(
      (need) => !firestoreNeeds.some((firestoreNeed) => firestoreNeed.id === need.id),
    ),
  ];
  const volunteerRegistry = new Map<string, VolunteerProfile>();

  activeCrises.forEach((crisis) => {
    getVolunteersByCrisisId(crisis.id).forEach((volunteer) => {
      if (!volunteerRegistry.has(volunteer.id)) {
        volunteerRegistry.set(volunteer.id, volunteer);
      }
    });
  });

  const donorVolunteerPoints: CrisisMapPoint[] = Array.from(
    volunteerRegistry.values(),
  ).map((volunteer) => ({
    id: `volunteer-${volunteer.id}`,
    label: volunteer.name,
    location: volunteer.location,
    tone: "safe" as const,
    detail: volunteer.availableTime || "Volunteer responder",
  }));
  const donorNgoPoints: CrisisMapPoint[] = activeCrises.map((crisis) => {
    const ngoProfile = getNGOProfileByCrisisId(crisis.id);

    return {
      id: `ngo-${crisis.id}`,
      label: ngoProfile?.organizationName || crisis.contactPerson,
      location: ngoProfile?.location || crisis.location,
      tone: "neutral" as const,
      detail: "NGO command center",
    };
  });
  const donorTaskPoints: CrisisMapPoint[] = activeCrises
    .flatMap((crisis) => getTasksByCrisisId(crisis.id))
    .slice(0, 8)
    .map((task) => ({
      id: `task-${task.id}`,
      label: task.title,
      location: task.location,
      tone: toneFromTaskStatus(task.status),
      detail: task.window,
    }));
  const resourceDonorPoints: CrisisMapPoint[] = mergedNeeds.slice(0, 8).map((need) => ({
    id: `need-${need.id}`,
    label: need.label,
    location: need.location,
    tone: need.urgency === "critical" ? "alert" : need.urgency === "high" ? "warn" : "info",
    detail: `${need.quantityPledged}/${need.quantityNeeded} pledged`,
  }));

  return (
    <AppShell
      currentPath="/donor"
      eyebrow="Donor and Resource Support"
      title="Back verified relief needs with confidence"
      description="Browse NGO-led campaigns, respond to transparent quantity gaps, and keep personal donation amounts private by default."
      actions={
        <>
          <Button href="/register">Become a donor</Button>
          <Button href="/crisis/vikas-nagar-fire-relief/help" variant="secondary">
            Open help page
          </Button>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {donorStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Verified campaigns
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                NGO-led response rooms
              </h2>
            </div>
            <Badge tone="safe">Privacy-first donor flow</Badge>
          </div>
          <div className="mt-6 grid gap-4">
            {activeCrises.map((crisis) => (
              <CrisisCard key={crisis.id} crisis={crisis} />
            ))}
          </div>
        </div>

        <CrisisMap
          title="Need distribution"
          subtitle="Prepared map layer for affected zones, NGO centers, volunteers, donor supply points, and open task markers."
          affectedArea={{
            id: "affected-network-overview",
            label: "Active crisis network",
            location: activeCrises[0]?.location ?? {
              lat: 0,
              lng: 0,
              address: "India response overview",
            },
            tone: activeCrises[0] ? toneFromCrisisType(activeCrises[0].type) : "alert",
            detail: `${activeCrises.length} active crises in the response board`,
          }}
          ngoCenters={donorNgoPoints}
          volunteers={donorVolunteerPoints}
          resourceDonors={resourceDonorPoints}
          tasks={donorTaskPoints}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Resource pledges
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Public need board
              </h2>
            </div>
            <Badge tone="warn">{mergedNeeds.length} active needs</Badge>
          </div>

          {loadError ? (
            <FeedbackPanel
              state="error"
              title="Need board warning"
              description={loadError}
              className="mt-6"
            />
          ) : null}

          {isLoadingNeeds ? (
            <FeedbackPanel
              state="loading"
              title="Loading resource needs"
              description="Pulling Firestore resource posts and merging them into the donor board."
              className="mt-6"
            />
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {mergedNeeds.length > 0 ? (
              mergedNeeds.map((need) => (
                <ResourceCard
                  key={need.id}
                  need={need}
                  actionHref={`/donor/pledge/${need.id}`}
                  actionLabel="Pledge support"
                />
              ))
            ) : (
              <FeedbackPanel
                state="empty"
                title="No resource needs yet"
                description="Once NGOs post verified needs, donors will be able to pledge help directly from this board."
                className="rounded-[24px] shadow-none lg:col-span-2"
              />
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-[linear-gradient(160deg,rgba(17,36,58,0.97),rgba(31,64,96,0.94))] p-6 text-white shadow-[0_22px_60px_rgba(17,36,58,0.2)]">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/60">
            Donor promise
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Impact is public. Personal amounts stay private.
          </h2>
          <div className="mt-6 space-y-4">
            {[
              "See verified NGO campaigns and concrete quantity gaps before pledging help.",
              "Donor amount is private by default and public views focus only on total campaign impact.",
              "Every pledge lands as pending NGO verification so field teams can confirm quality and delivery before marking it fulfilled.",
            ].map((note) => (
              <div
                key={note}
                className="rounded-[24px] border border-white/10 bg-white/8 p-4 text-sm leading-6 text-white/80"
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
