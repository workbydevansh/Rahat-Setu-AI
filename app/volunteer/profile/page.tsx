"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { useToast } from "@/components/ToastProvider";
import { VolunteerCard } from "@/components/VolunteerCard";
import { requestVolunteerProfileExtraction } from "@/lib/ai-client";
import {
  buildVolunteerProfileFromForm,
  getVolunteerProfileFormDefaults,
  loadVolunteerProfileSource,
  saveVolunteerProfileSource,
  volunteerAssetOptions,
  volunteerAvailabilityOptions,
  type VolunteerProfileSource,
} from "@/lib/volunteer-profile";
import { formatAvailabilityStatus } from "@/lib/utils";
import type { VolunteerProfileFormValues } from "@/types";

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-border bg-white/92 px-4 py-3 text-sm text-command shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition placeholder:text-command-soft/60 focus:border-command/45 focus:bg-white focus:ring-4 focus:ring-command/10";

export default function VolunteerProfilePage() {
  const { pushToast } = useToast();
  const [profileSource, setProfileSource] = useState<VolunteerProfileSource | null>(null);
  const [form, setForm] = useState<VolunteerProfileFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextSource = await loadVolunteerProfileSource();

        if (!isActive) {
          return;
        }

        setProfileSource(nextSource);
        setForm(getVolunteerProfileFormDefaults(nextSource.volunteerProfile));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load the volunteer profile right now.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (errorMessage) {
      pushToast({
        title: "Volunteer profile warning",
        description: errorMessage,
        tone: "alert",
      });
    }
  }, [errorMessage, pushToast]);

  useEffect(() => {
    if (successMessage) {
      pushToast({
        title: "Volunteer profile updated",
        description: successMessage,
        tone: "safe",
      });
    }
  }, [pushToast, successMessage]);

  function updateField<K extends keyof VolunteerProfileFormValues>(
    field: K,
    value: VolunteerProfileFormValues[K],
  ) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  function toggleAsset(asset: string) {
    if (!form) {
      return;
    }

    const nextAssets = form.assets.includes(asset)
      ? form.assets.filter((entry) => entry !== asset)
      : [...form.assets, asset];

    updateField("assets", nextAssets);
  }

  async function handleAiExtraction() {
    if (!form) {
      setErrorMessage("Volunteer profile data is still loading.");
      return;
    }

    if (!form.helpDescription.trim()) {
      setErrorMessage("Add a short description of how you can help first.");
      return;
    }

    setIsExtractingAi(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const extractedProfile = await requestVolunteerProfileExtraction(
        form.helpDescription,
      );

      setForm((current) =>
        current
          ? {
              ...current,
              skills: extractedProfile.skills.join(", "),
              languages: extractedProfile.languages.join(", "),
              assets: extractedProfile.assets,
              availability: extractedProfile.availability,
            }
          : current,
      );
      setSuccessMessage(
        "AI extracted skills, languages, assets, and availability from your description.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to extract volunteer details right now.",
      );
    } finally {
      setIsExtractingAi(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profileSource || !form) {
      setErrorMessage("Volunteer profile data is still loading.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextVolunteerProfile = buildVolunteerProfileFromForm(
        profileSource.volunteerProfile,
        form,
      );
      const nextSource = await saveVolunteerProfileSource(
        profileSource,
        nextVolunteerProfile,
      );

      setProfileSource(nextSource);
      setForm(getVolunteerProfileFormDefaults(nextSource.volunteerProfile));
      setSuccessMessage(
        nextSource.mode === "firestore"
          ? "Volunteer profile updated in Firestore."
          : "Volunteer profile updated in demo mode for this browser.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save the volunteer profile right now.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !profileSource || !form) {
    return (
      <AppShell
        currentPath="/volunteer/profile"
        eyebrow="Volunteer Profile"
        title="Loading volunteer profile"
        description="Preparing your editable volunteer record and response preferences."
      >
        <FeedbackPanel
          state="loading"
          title="Loading volunteer profile"
          description="Pulling your volunteer profile from the active data source."
        />
      </AppShell>
    );
  }

  const previewProfile = buildVolunteerProfileFromForm(
    profileSource.volunteerProfile,
    form,
  );

  return (
    <AppShell
      currentPath="/volunteer/profile"
      eyebrow="Volunteer Profile"
      title="Keep your responder profile current"
      description="Update skills, assets, availability, and emergency range so the matching engine can find the right assignments faster."
      actions={
        <>
          <Button href="/volunteer/dashboard" variant="secondary" size="lg">
            Back to dashboard
          </Button>
          <Button
            type="submit"
            form="volunteer-profile-form"
            size="lg"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </>
      }
    >
      <form
        id="volunteer-profile-form"
        className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]"
        onSubmit={handleSubmit}
      >
        <section className="space-y-6">
          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Skills and language profile
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  Editable volunteer details
                </h2>
              </div>
              <Badge tone="safe">
                {profileSource.mode === "firestore" ? "Firestore mode" : "Demo mode"}
              </Badge>
            </div>

            <div className="mt-6 grid gap-5">
              <div className="rounded-[24px] border border-border bg-mist/34 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-command">
                      Describe how you can help
                    </p>
                    <p className="mt-2 text-sm leading-6 text-command-soft/78">
                      Write naturally about your field experience, languages,
                      assets, and timing, then let AI draft the profile fields.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAiExtraction}
                    disabled={isExtractingAi}
                  >
                    {isExtractingAi ? "Extracting..." : "Extract skills with AI"}
                  </Button>
                </div>

                <textarea
                  className={`${inputClassName} min-h-32 resize-y`}
                  placeholder="I can help with first-aid camps, food distribution, and local coordination. I speak Hindi and English, have a bike and medical kit, and I am free most evenings."
                  value={form.helpDescription}
                  onChange={(event) => updateField("helpDescription", event.target.value)}
                />
              </div>

              <label className="block text-sm font-medium text-command">
                Skills
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  placeholder="first-aid, food distribution, logistics"
                  value={form.skills}
                  onChange={(event) => updateField("skills", event.target.value)}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-command">
                Languages
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  placeholder="Hindi, English, Malayalam"
                  value={form.languages}
                  onChange={(event) => updateField("languages", event.target.value)}
                  required
                />
              </label>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Availability
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  Response readiness
                </h2>
              </div>
              <Badge tone={form.emergencyAvailable ? "alert" : "neutral"}>
                {form.emergencyAvailable ? "Emergency on" : "Emergency off"}
              </Badge>
            </div>

            <div className="mt-6 grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {volunteerAvailabilityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("availability", option.value)}
                    className={`rounded-[22px] border px-4 py-3 text-left transition ${
                      form.availability === option.value
                        ? "border-command bg-command text-white"
                        : "border-border bg-white/80 text-command hover:border-command/35"
                    }`}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p
                      className={`mt-1 text-xs leading-5 ${
                        form.availability === option.value
                          ? "text-white/76"
                          : "text-command-soft/75"
                      }`}
                    >
                      {option.helper}
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-command">
                  Available time
                  <input
                    className={inputClassName}
                    placeholder="Weekdays 6 PM - 10 PM"
                    value={form.availableTime}
                    onChange={(event) =>
                      updateField("availableTime", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-command">
                  Emergency radius
                  <input
                    type="number"
                    min="1"
                    className={inputClassName}
                    placeholder="25"
                    value={form.emergencyRadius}
                    onChange={(event) =>
                      updateField("emergencyRadius", event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateField("emergencyAvailable", !form.emergencyAvailable)
                }
                className={`flex items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                  form.emergencyAvailable
                    ? "border-alert/30 bg-alert/8"
                    : "border-border bg-white/85 hover:border-command/35"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-command">
                    Emergency availability toggle
                  </p>
                  <p className="mt-1 text-sm leading-6 text-command-soft/78">
                    Let NGOs know whether you should appear in urgent matching queues.
                  </p>
                </div>
                <Badge tone={form.emergencyAvailable ? "alert" : "neutral"}>
                  {form.emergencyAvailable ? "ON" : "OFF"}
                </Badge>
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Assets and location
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  What you can mobilize
                </h2>
              </div>
              <Badge tone="info">{form.assets.length} assets selected</Badge>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="block text-sm font-medium text-command">
                Location
                <input
                  className={inputClassName}
                  placeholder="Lucknow volunteer base"
                  value={form.location}
                  onChange={(event) => updateField("location", event.target.value)}
                  required
                />
              </label>

              <div>
                <p className="text-sm font-medium text-command">Assets</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {volunteerAssetOptions.map((asset) => {
                    const selected = form.assets.includes(asset);

                    return (
                      <button
                        key={asset}
                        type="button"
                        onClick={() => toggleAsset(asset)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-command bg-command text-white"
                            : "border-border bg-white/80 text-command hover:border-command/35"
                        }`}
                      >
                        {asset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-border bg-[linear-gradient(145deg,rgba(17,36,58,0.96),rgba(31,64,96,0.95))] p-6 text-white shadow-[0_24px_72px_rgba(17,36,58,0.18)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/60">
                  Verification placeholder
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Current trust signal
                </h2>
              </div>
              <Badge tone={previewProfile.verified ? "safe" : "warn"}>
                {previewProfile.verified ? "Verified" : "Pending"}
              </Badge>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">Verification note</p>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Volunteer verification is still a placeholder in this MVP. The
                  status badge is ready, but real document review and training checks
                  can be connected in a later pass.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">Availability summary</p>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  {formatAvailabilityStatus(form.availability)} - {form.availableTime}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Emergency queue: {form.emergencyAvailable ? "On" : "Off"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-command">Profile preview</h2>
              <Badge tone="neutral">{profileSource.mode}</Badge>
            </div>
            <div className="mt-6">
              <VolunteerCard volunteer={previewProfile} />
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[24px] border border-alert/25 bg-alert/8 p-4">
              <p className="text-sm font-semibold text-alert">Profile save failed</p>
              <p className="mt-2 text-sm leading-6 text-command-soft/78">
                {errorMessage}
              </p>
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-[24px] border border-safe/25 bg-safe/8 p-4">
              <p className="text-sm font-semibold text-command">Profile updated</p>
              <p className="mt-2 text-sm leading-6 text-command-soft/78">
                {successMessage}
              </p>
            </div>
          ) : null}
        </section>
      </form>
    </AppShell>
  );
}
