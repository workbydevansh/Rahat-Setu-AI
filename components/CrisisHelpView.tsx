"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ResourceCard } from "@/components/ResourceCard";
import { StatCard } from "@/components/StatCard";
import { getCurrentUser } from "@/lib/auth";
import {
  createMoneyDonationPledge,
  getCrisis as getFirestoreCrisis,
  getResourceNeedsForCrisis,
} from "@/lib/firestore";
import {
  formatLocationLabel,
  progressPercentage,
  toneFromCrisisType,
  toneFromRiskLevel,
} from "@/lib/utils";
import type { Crisis, DashboardStat, NGOProfile, ResourceNeed } from "@/types";

interface CrisisHelpViewProps {
  crisisId: string;
  initialCrisis: Crisis | null;
  initialNGOProfile: NGOProfile | null;
  initialResourceNeeds: ResourceNeed[];
}

interface DonationFormState {
  amount: string;
  location: string;
  note: string;
}

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-border bg-white/90 px-4 py-3 text-sm text-command outline-none transition focus:border-command focus:ring-2 focus:ring-command/10";

function buildFallbackNGOProfile(crisis: Crisis | null): NGOProfile | null {
  if (!crisis) {
    return null;
  }

  return {
    id: `ngo-${crisis.id}`,
    organizationName: "Verified NGO partner placeholder",
    registrationNumber: "Demo verification in progress",
    focusAreas: [crisis.type, "community response", "relief coordination"],
    contactName: crisis.contactPerson,
    location: crisis.location,
    createdAt: crisis.createdAt,
    updatedAt: crisis.updatedAt,
    status: "active",
    verified: crisis.verified,
  };
}

export function CrisisHelpView({
  crisisId,
  initialCrisis,
  initialNGOProfile,
  initialResourceNeeds,
}: CrisisHelpViewProps) {
  const [crisis, setCrisis] = useState<Crisis | null>(initialCrisis);
  const [ngoProfile, setNgoProfile] = useState<NGOProfile | null>(
    initialNGOProfile ?? buildFallbackNGOProfile(initialCrisis),
  );
  const [resourceNeeds, setResourceNeeds] =
    useState<ResourceNeed[]>(initialResourceNeeds);
  const [isLoading, setIsLoading] = useState(!initialCrisis);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<DonationFormState>({
    amount: "",
    location: initialCrisis?.location.address ?? "",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadCampaign() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [firestoreCrisis, firestoreNeeds] = await Promise.all([
          getFirestoreCrisis(crisisId),
          getResourceNeedsForCrisis(crisisId),
        ]);

        if (!isActive) {
          return;
        }

        const nextCrisis = firestoreCrisis ?? initialCrisis;
        const nextNeeds = [
          ...firestoreNeeds,
          ...initialResourceNeeds.filter(
            (need) => !firestoreNeeds.some((firestoreNeed) => firestoreNeed.id === need.id),
          ),
        ];

        setCrisis(nextCrisis);
        setNgoProfile(initialNGOProfile ?? buildFallbackNGOProfile(nextCrisis));
        setResourceNeeds(nextNeeds);
        setForm((current) => ({
          ...current,
          location: current.location || nextCrisis?.location.address || "",
        }));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setCrisis(initialCrisis);
        setNgoProfile(initialNGOProfile ?? buildFallbackNGOProfile(initialCrisis));
        setResourceNeeds(initialResourceNeeds);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to sync the campaign from Firestore right now.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCampaign();

    return () => {
      isActive = false;
    };
  }, [crisisId, initialCrisis, initialNGOProfile, initialResourceNeeds]);

  const totalQuantityNeeded = resourceNeeds.reduce(
    (sum, need) => sum + need.quantityNeeded,
    0,
  );
  const totalQuantityPledged = resourceNeeds.reduce(
    (sum, need) => sum + need.quantityPledged,
    0,
  );
  const fulfillmentRate = progressPercentage(
    totalQuantityPledged,
    totalQuantityNeeded,
  );
  const activeNeedCount = resourceNeeds.filter(
    (need) => need.status !== "fulfilled" && need.status !== "closed",
  ).length;
  const impactStats: DashboardStat[] = [
    {
      label: "Families in scope",
      value: crisis ? String(crisis.familiesAffected) : "--",
      change: crisis ? `${crisis.riskLevel} risk` : "awaiting data",
      helper: "Estimated households this campaign is actively supporting right now.",
      tone: crisis ? toneFromRiskLevel(crisis.riskLevel) : "neutral",
    },
    {
      label: "Volunteer matches",
      value: crisis ? String(crisis.matchedVolunteers) : "--",
      change: "field ready",
      helper: "Responders already matched or assigned to relief work for this crisis.",
      tone: "safe",
    },
    {
      label: "Resource fulfillment",
      value: `${fulfillmentRate}%`,
      change: `${totalQuantityPledged}/${totalQuantityNeeded || 0} pledged`,
      helper: "Progress across publicly posted supply gaps for this campaign.",
      tone: fulfillmentRate >= 100 ? "safe" : "warn",
    },
    {
      label: "Open need lines",
      value: String(activeNeedCount),
      change: "donor support needed",
      helper: "Needs still waiting for more pledges or delivery confirmation.",
      tone: activeNeedCount > 0 ? "info" : "safe",
    },
  ];

  function updateFormField<K extends keyof DonationFormState>(
    field: K,
    value: DonationFormState[K],
  ) {
    setFormError(null);
    setSuccessMessage(null);
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleDonationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!crisis) {
      setFormError("Campaign details are still loading. Please try again in a moment.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const amount = Number.parseFloat(form.amount);

      if (Number.isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid donation amount for demo mode.");
      }

      const donationPledge = await createMoneyDonationPledge({
        crisisId: crisis.id,
        donorId: getCurrentUser()?.uid ?? "demo-donor",
        amount,
        itemType: "money donation",
        note: form.note,
        location: {
          lat: crisis.location.lat,
          lng: crisis.location.lng,
          address: form.location.trim() || crisis.location.address,
          city: crisis.location.city,
          state: crisis.location.state,
        },
        status: "pending",
        verified: false,
      });

      setForm({
        amount: "",
        location: form.location.trim() || crisis.location.address,
        note: "",
      });
      setSuccessMessage(
        `Demo pledge ${donationPledge.id} was recorded with pending status. No real payment was processed and your individual amount is not shown publicly.`,
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to record the demo donation pledge right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading && !crisis) {
    return (
      <AppShell
        currentPath={`/crisis/${crisisId}/help`}
        eyebrow="Campaign Help"
        title="Loading campaign help page"
        description="Pulling NGO details, crisis summary, and live need board data."
      >
        <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm leading-7 text-command-soft/78">
            Syncing the campaign record from Firestore and local demo data.
          </p>
        </section>
      </AppShell>
    );
  }

  if (!crisis) {
    return (
      <AppShell
        currentPath={`/crisis/${crisisId}/help`}
        eyebrow="Campaign Help"
        title="Campaign unavailable"
        description="The requested crisis help page could not be found."
        actions={<Button href="/donor">Back to donor board</Button>}
      >
        <section className="rounded-[32px] border border-alert/20 bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm font-semibold text-alert">Unable to open this campaign</p>
          <p className="mt-3 text-sm leading-7 text-command-soft/78">
            {loadError ?? "Try opening the donor board again and choosing another crisis."}
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      currentPath={`/crisis/${crisisId}/help`}
      eyebrow="NGO Campaign Help"
      title={`Support ${crisis.title}`}
      description={crisis.description || crisis.summary}
      actions={
        <>
          <Button href={`/crisis/${crisis.id}`} variant="secondary" size="lg">
            View crisis room
          </Button>
          <Button href="/donor" size="lg">
            More donor needs
          </Button>
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={toneFromCrisisType(crisis.type)}>{crisis.type}</Badge>
            <Badge tone={toneFromRiskLevel(crisis.riskLevel)}>{crisis.riskLevel} risk</Badge>
            <Badge tone={crisis.verified ? "safe" : "warn"}>
              {crisis.verified
                ? "Verified badge placeholder"
                : "Verification pending placeholder"}
            </Badge>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                NGO profile
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                {ngoProfile?.organizationName || "NGO profile placeholder"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-command-soft/80">
                Registered response partner for this crisis page. Verification visuals are
                placeholders in this MVP, but the layout is ready for real trust signals.
              </p>

              <div className="mt-5 space-y-3 text-sm text-command-soft/80">
                <p>
                  <span className="font-semibold text-command">Registration:</span>{" "}
                  {ngoProfile?.registrationNumber || "Pending verification document"}
                </p>
                <p>
                  <span className="font-semibold text-command">Contact:</span>{" "}
                  {ngoProfile?.contactName || crisis.contactPerson}
                </p>
                <p>
                  <span className="font-semibold text-command">Coverage:</span>{" "}
                  {formatLocationLabel(ngoProfile?.location || crisis.location)}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-mist/55 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Focus areas
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(ngoProfile?.focusAreas.length
                  ? ngoProfile.focusAreas
                  : crisis.suggestedSkills
                ).map((focusArea) => (
                  <Badge key={focusArea} tone="neutral">
                    {focusArea}
                  </Badge>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-command-soft/80">
                This campaign is centered on {crisis.location.address}. Families affected:{" "}
                {crisis.familiesAffected}. Open relief tasks: {crisis.openTasks}.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-border bg-white/85 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Crisis description
            </p>
            <p className="mt-4 text-sm leading-7 text-command-soft/82">
              {crisis.description || crisis.summary}
            </p>
          </div>

          {loadError ? (
            <div className="mt-6 rounded-[24px] border border-warn/30 bg-warn/10 p-4">
              <p className="text-sm font-semibold text-command">Sync notice</p>
              <p className="mt-2 text-sm leading-6 text-command-soft/78">{loadError}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[32px] border border-border bg-[linear-gradient(160deg,rgba(17,36,58,0.97),rgba(31,64,96,0.94))] p-6 text-white shadow-[0_22px_60px_rgba(17,36,58,0.2)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warn" className="bg-white/16 text-white">
              Test/demo mode
            </Badge>
            <Badge tone="safe" className="bg-white/12 text-white">
              Donation amount kept private
            </Badge>
          </div>

          <h2 className="mt-4 text-3xl font-semibold">Money donation placeholder</h2>
          <p className="mt-3 text-sm leading-7 text-white/78">
            No payment gateway is connected yet. This form records a pending mock pledge so
            the campaign flow can be demoed safely without processing real money.
          </p>

          <div className="mt-5 rounded-[24px] border border-white/12 bg-white/8 p-4">
            <p className="text-sm font-semibold text-white">Donor privacy note</p>
            <p className="mt-2 text-sm leading-6 text-white/78">
              Donor amount is private by default. Public views stay focused on total
              campaign impact rather than individual donor amounts.
            </p>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/12 bg-white/8 p-4">
            <p className="text-sm font-semibold text-white">Safety note</p>
            <p className="mt-2 text-sm leading-6 text-white/78">
              RahatSetu AI supports relief coordination for this campaign and does
              not replace official emergency services or emergency authorities.
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleDonationSubmit}>
            <label className="block text-sm font-medium text-white">
              Donation amount
              <input
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={(event) => updateFormField("amount", event.target.value)}
                placeholder="Enter demo amount"
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-medium text-white">
              Location or donor city
              <input
                type="text"
                value={form.location}
                onChange={(event) => updateFormField("location", event.target.value)}
                placeholder="Lucknow, Uttar Pradesh"
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-medium text-white">
              Note for the NGO
              <textarea
                value={form.note}
                onChange={(event) => updateFormField("note", event.target.value)}
                rows={4}
                placeholder="Add a short note for the campaign team"
                className={`${inputClassName} min-h-[120px] resize-none`}
              />
            </label>

            {formError ? (
              <div className="rounded-[20px] border border-[#ffb9b0]/25 bg-[#ffb9b0]/10 p-4">
                <p className="text-sm font-semibold text-white">Unable to record pledge</p>
                <p className="mt-2 text-sm leading-6 text-white/78">{formError}</p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-[20px] border border-[#9de2ce]/25 bg-[#9de2ce]/10 p-4">
                <p className="text-sm font-semibold text-white">Demo pledge recorded</p>
                <p className="mt-2 text-sm leading-6 text-white/78">{successMessage}</p>
              </div>
            ) : null}

            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
              {isSubmitting ? "Recording demo pledge..." : "Create pending donation pledge"}
            </Button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {impactStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Resource needs
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-command">
              Pledge supplies or logistics support
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-command-soft/80">
              These are the live public gaps for this campaign. Donors can open a specific
              pledge flow for food, shelter, transport, medicine, and other urgent items.
            </p>
          </div>
          <Badge tone={resourceNeeds.length > 0 ? "warn" : "neutral"}>
            {resourceNeeds.length} need lines
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {resourceNeeds.length > 0 ? (
            resourceNeeds.map((need) => (
              <ResourceCard
                key={need.id}
                need={need}
                actionHref={`/donor/pledge/${need.id}`}
                actionLabel="Pledge this need"
              />
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-white/80 p-5 lg:col-span-2">
              <p className="text-sm font-semibold text-command">No posted resource needs yet</p>
              <p className="mt-2 text-sm leading-6 text-command-soft/78">
                This campaign can still accept demo money pledges while the NGO team prepares
                detailed supply requests.
              </p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
