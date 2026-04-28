"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import {
  subscribeToProfileSession,
  type CurrentProfileSession,
} from "@/lib/auth";
import { getTemplateByCrisisType } from "@/lib/disasterTemplates";
import { createCrisis } from "@/lib/firestore";
import { firebasePlaceholder } from "@/lib/firebase";
import type { CrisisFormValues, CrisisType, RiskLevel } from "@/types";

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-border bg-white/90 px-4 py-3 text-sm text-command outline-none transition focus:border-command focus:ring-2 focus:ring-command/10";

const crisisTypeOptions: Array<{
  value: CrisisType;
  label: string;
  helper: string;
}> = [
  {
    value: "fire",
    label: "Fire",
    helper: "Shelter, food, medicine, and camp support.",
  },
  {
    value: "flood",
    label: "Flood",
    helper: "Boats, swimmers, life jackets, and dry ration.",
  },
  {
    value: "landslide",
    label: "Landslide",
    helper: "Off-road access, guides, ropes, and first-aid.",
  },
  {
    value: "earthquake",
    label: "Earthquake",
    helper: "Doctors, engineers, blood support, and shelter.",
  },
  {
    value: "cyclone",
    label: "Cyclone",
    helper: "Shelter, water, medicines, and power backup.",
  },
];

const riskOptions: Array<{
  value: RiskLevel;
  label: string;
  helper: string;
}> = [
  {
    value: "green",
    label: "Green",
    helper: "Low-risk coordination and safe support tasks.",
  },
  {
    value: "yellow",
    label: "Yellow",
    helper: "Moderate field caution and supervised movement.",
  },
  {
    value: "red",
    label: "Red",
    helper: "High-risk incident with strict operational control.",
  },
];

function getDefaultFormValues(type: CrisisType = "fire"): CrisisFormValues {
  const template = getTemplateByCrisisType(type);

  return {
    title: "",
    type,
    locationAddress: "",
    description: "",
    familiesAffected: "",
    urgentNeeds: template.defaultNeeds.join(", "),
    requiredResources: template.suggestedResources.join(", "),
    riskLevel: "yellow",
    contactPerson: "",
  };
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function NewCrisisPage() {
  const router = useRouter();
  const [session, setSession] = useState<CurrentProfileSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [form, setForm] = useState<CrisisFormValues>(() => getDefaultFormValues());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedTemplate = getTemplateByCrisisType(form.type);
  const canCreateCrisis = session?.role === "ngo" || session?.role === "admin";

  useEffect(() => {
    return subscribeToProfileSession((nextSession) => {
      setSession(nextSession);
      setSessionReady(true);
    });
  }, []);

  function clearError() {
    setErrorMessage(null);
  }

  function updateField<K extends keyof CrisisFormValues>(
    field: K,
    value: CrisisFormValues[K],
  ) {
    clearError();
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyTemplate(type: CrisisType) {
    const template = getTemplateByCrisisType(type);

    clearError();
    setForm((current) => ({
      ...current,
      type,
      urgentNeeds: template.defaultNeeds.join(", "),
      requiredResources: template.suggestedResources.join(", "),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setIsSubmitting(true);

    try {
      const familiesAffected = Number.parseInt(form.familiesAffected, 10);
      const urgentNeeds = parseList(form.urgentNeeds);
      const requiredResources = parseList(form.requiredResources);

      if (Number.isNaN(familiesAffected) || familiesAffected < 1) {
        throw new Error("Estimated families affected must be a valid number.");
      }

      if (urgentNeeds.length === 0 || requiredResources.length === 0) {
        throw new Error(
          "Urgent needs and required resources should include at least one item each.",
        );
      }

      if (!sessionReady || !session) {
        throw new Error("Please sign in as an NGO before creating a crisis room.");
      }

      if (!canCreateCrisis) {
        throw new Error("Only NGO and admin accounts can create crisis rooms.");
      }

      const crisis = await createCrisis({
        title: form.title,
        type: form.type,
        description: form.description,
        location: {
          lat: 0,
          lng: 0,
          address: form.locationAddress,
        },
        riskLevel: form.riskLevel,
        urgentNeeds,
        requiredResources,
        suggestedSkills: selectedTemplate.suggestedSkills,
        familiesAffected,
        contactPerson: form.contactPerson,
        createdBy: session.uid,
      });

      router.push(`/ngo/dashboard?created=${crisis.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create the crisis room right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell
      currentPath="/ngo/crisis/new"
      eyebrow="NGO Operations"
      title="Create a new crisis room"
      description="Open a disaster-specific crisis record, seed it with the right needs and resources, and move directly into the coordination room."
      actions={
        <>
          <Button href="/ngo/dashboard" variant="secondary" size="lg">
            Back to dashboard
          </Button>
          <Button
            type="submit"
            form="new-crisis-form"
            size="lg"
            disabled={isSubmitting || !canCreateCrisis}
          >
            {isSubmitting ? "Creating..." : "Create crisis"}
          </Button>
        </>
      }
    >
      <form
        id="new-crisis-form"
        className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]"
        onSubmit={handleSubmit}
      >
        <section className="space-y-6">
          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Crisis setup
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  Core incident details
                </h2>
              </div>
              <Badge tone={canCreateCrisis ? "warn" : "alert"}>
                {canCreateCrisis ? "Firestore write" : "NGO login needed"}
              </Badge>
            </div>

            {sessionReady && !canCreateCrisis ? (
              <div className="mt-6 rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                <p className="text-sm font-semibold text-alert">
                  NGO account required
                </p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  Sign in with an NGO profile to create crisis rooms and publish them
                  to volunteer dashboards.
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-command sm:col-span-2">
                Crisis title
                <input
                  className={inputClassName}
                  placeholder="North Zone Flood Relief"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  required
                />
              </label>

              <div className="block text-sm font-medium text-command sm:col-span-2">
                Crisis type
                <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {crisisTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => applyTemplate(option.value)}
                      className={`rounded-[22px] border px-4 py-3 text-left transition ${
                        form.type === option.value
                          ? "border-command bg-command text-white"
                          : "border-border bg-white/80 text-command hover:border-command/35"
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p
                        className={`mt-1 text-xs leading-5 ${
                          form.type === option.value
                            ? "text-white/76"
                            : "text-command-soft/75"
                        }`}
                      >
                        {option.helper}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-command sm:col-span-2">
                Affected location
                <input
                  className={inputClassName}
                  placeholder="Ward 8 riverside shelters, Aluva, Kerala"
                  value={form.locationAddress}
                  onChange={(event) =>
                    updateField("locationAddress", event.target.value)
                  }
                  required
                />
              </label>

              <label className="block text-sm font-medium text-command sm:col-span-2">
                Description
                <textarea
                  className={`${inputClassName} min-h-36 resize-y`}
                  placeholder="Describe what happened, the current ground situation, and what the relief team needs first."
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-command">
                Estimated families affected
                <input
                  type="number"
                  min="1"
                  className={inputClassName}
                  placeholder="250"
                  value={form.familiesAffected}
                  onChange={(event) =>
                    updateField("familiesAffected", event.target.value)
                  }
                  required
                />
              </label>

              <label className="block text-sm font-medium text-command">
                Contact person
                <input
                  className={inputClassName}
                  placeholder="Asha Verma"
                  value={form.contactPerson}
                  onChange={(event) =>
                    updateField("contactPerson", event.target.value)
                  }
                  required
                />
              </label>

              <div className="block text-sm font-medium text-command sm:col-span-2">
                Risk level
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {riskOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("riskLevel", option.value)}
                      className={`rounded-[22px] border px-4 py-3 text-left transition ${
                        form.riskLevel === option.value
                          ? "border-command bg-command text-white"
                          : "border-border bg-white/80 text-command hover:border-command/35"
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p
                        className={`mt-1 text-xs leading-5 ${
                          form.riskLevel === option.value
                            ? "text-white/76"
                            : "text-command-soft/75"
                        }`}
                      >
                        {option.helper}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Template-assisted intake
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  Needs and resource setup
                </h2>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => applyTemplate(form.type)}>
                Refill from template
              </Button>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="block text-sm font-medium text-command">
                Urgent needs
                <textarea
                  className={`${inputClassName} min-h-28 resize-y`}
                  placeholder="food, shelter, medicine"
                  value={form.urgentNeeds}
                  onChange={(event) => updateField("urgentNeeds", event.target.value)}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-command">
                Required resources
                <textarea
                  className={`${inputClassName} min-h-28 resize-y`}
                  placeholder="boats, dry food, ORS, water"
                  value={form.requiredResources}
                  onChange={(event) =>
                    updateField("requiredResources", event.target.value)
                  }
                  required
                />
              </label>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                <p className="text-sm font-semibold text-alert">
                  Crisis creation failed
                </p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  {errorMessage}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-border bg-[linear-gradient(145deg,rgba(17,36,58,0.96),rgba(31,64,96,0.95))] p-6 text-white shadow-[0_24px_72px_rgba(17,36,58,0.18)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/60">
                  Selected crisis template
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {crisisTypeOptions.find((option) => option.value === form.type)?.label}
                </h2>
              </div>
              <Badge tone="safe">Auto-fill active</Badge>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">Suggested skills</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTemplate.suggestedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-white/12 bg-white/12 px-3 py-1.5 text-xs font-medium text-white/84"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">Priority assets</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTemplate.priorityAssets.map((asset) => (
                    <span
                      key={asset}
                      className="rounded-full border border-white/12 bg-white/12 px-3 py-1.5 text-xs font-medium text-white/84"
                    >
                      {asset}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                  <p className="text-sm font-semibold text-white">Safe public tasks</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-white/78">
                    {selectedTemplate.safePublicTasks.map((task) => (
                      <p key={task}>- {task}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                  <p className="text-sm font-semibold text-white">Risky tasks</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-white/78">
                    {selectedTemplate.riskyTasks.map((task) => (
                      <p key={task}>- {task}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-command">Creation summary</h2>
              <Badge tone="neutral">{form.type}</Badge>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-6 text-command-soft/80">
              <div className="rounded-[22px] border border-border bg-white/85 p-4">
                <p className="font-semibold text-command">Incident</p>
                <p className="mt-2">
                  {form.title || "Untitled crisis"} - {form.locationAddress || "location not set"}
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-white/85 p-4">
                <p className="font-semibold text-command">Auto-filled lists</p>
                <p className="mt-2">
                  Needs: {form.urgentNeeds || "not set"}
                </p>
                <p className="mt-2">
                  Resources: {form.requiredResources || "not set"}
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-white/85 p-4">
                <p className="font-semibold text-command">Storage behavior</p>
                <p className="mt-2">
                  The crisis record will be saved to Firestore collection{" "}
                  <span className="font-mono text-command">crises</span> with the
                  selected template skills attached for later matching.
                </p>
                <p className="mt-2">{firebasePlaceholder.note}</p>
              </div>
            </div>
          </div>
        </section>
      </form>
    </AppShell>
  );
}
