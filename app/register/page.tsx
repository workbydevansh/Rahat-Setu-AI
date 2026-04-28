"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import {
  buildUserProfileData,
  getDashboardPathForRole,
  getDefaultRegisterValues,
  registerUser,
} from "@/lib/auth";
import { firebasePlaceholder } from "@/lib/firebase";
import type {
  AuthActionResult,
  DonorHelpType,
  RegisterFormValues,
  UserRole,
} from "@/types";

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-border bg-white/92 px-4 py-3 text-sm text-command shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition placeholder:text-command-soft/60 focus:border-command/45 focus:bg-white focus:ring-4 focus:ring-command/10";

const roleOptions: Array<{
  value: UserRole;
  label: string;
  helper: string;
}> = [
  {
    value: "ngo",
    label: "NGO",
    helper: "Create crises, publish tasks, and coordinate relief operations.",
  },
  {
    value: "volunteer",
    label: "Volunteer",
    helper: "Offer skills, languages, assets, and local response availability.",
  },
  {
    value: "donor",
    label: "Donor",
    helper: "Pledge money, materials, transport, shelter, and more.",
  },
  {
    value: "admin",
    label: "Admin",
    helper: "Manage verification, moderation, and trust signals.",
  },
];

const donorHelpTypes: DonorHelpType[] = [
  "money",
  "food",
  "clothes",
  "medicine",
  "shelter",
  "vehicle",
  "boat",
  "other",
];

export default function RegisterPage() {
  const { pushToast } = useToast();
  const [form, setForm] = useState<RegisterFormValues>(getDefaultRegisterValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedRole = useMemo(
    () => roleOptions.find((option) => option.value === form.role),
    [form.role],
  );

  useEffect(() => {
    if (errorMessage) {
      pushToast({
        title: "Registration failed",
        description: errorMessage,
        tone: "alert",
      });
    }
  }, [errorMessage, pushToast]);

  useEffect(() => {
    if (result) {
      pushToast({
        title: "Account created",
        description: result.message,
        tone: "safe",
      });
    }
  }, [pushToast, result]);

  function clearStatus() {
    setResult(null);
    setErrorMessage(null);
  }

  function updateCommonField<
    K extends keyof Omit<RegisterFormValues, "ngo" | "volunteer" | "donor">
  >(field: K, value: RegisterFormValues[K]) {
    clearStatus();
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateNgoField<K extends keyof RegisterFormValues["ngo"]>(
    field: K,
    value: RegisterFormValues["ngo"][K],
  ) {
    clearStatus();
    setForm((current) => ({
      ...current,
      ngo: {
        ...current.ngo,
        [field]: value,
      },
    }));
  }

  function updateVolunteerField<K extends keyof RegisterFormValues["volunteer"]>(
    field: K,
    value: RegisterFormValues["volunteer"][K],
  ) {
    clearStatus();
    setForm((current) => ({
      ...current,
      volunteer: {
        ...current.volunteer,
        [field]: value,
      },
    }));
  }

  function toggleDonorHelpType(type: DonorHelpType) {
    clearStatus();
    setForm((current) => {
      const nextHelpTypes = current.donor.helpTypes.includes(type)
        ? current.donor.helpTypes.filter((entry) => entry !== type)
        : [...current.donor.helpTypes, type];

      return {
        ...current,
        donor: {
          ...current.donor,
          helpTypes: nextHelpTypes,
        },
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    clearStatus();

    try {
      const nextResult = await registerUser(
        form.email,
        form.password,
        buildUserProfileData(form),
      );
      setResult(nextResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create the account right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-border bg-surface p-6 shadow-[0_20px_44px_rgba(17,36,58,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone="warn">Multi-role onboarding</Badge>
            <h1 className="mt-4 text-4xl font-semibold text-command">
              Register the people and organizations who move relief forward.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-command-soft/80">
              This registration flow now creates a Firebase Auth account first,
              then saves the role-specific profile document in Firestore so the
              right dashboard and permissions can be inferred later.
            </p>
          </div>
          <Button href="/login" variant="secondary">
            Already have an account
          </Button>
        </div>
      </section>

      <form className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]" onSubmit={handleSubmit}>
        <section className="space-y-6">
          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-command">Common profile</h2>
              <Badge tone="neutral">Step 1</Badge>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-command">
                Name
                <input
                  className={inputClassName}
                  placeholder="Ravi Kumar"
                  value={form.name}
                  onChange={(event) => updateCommonField("name", event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-command">
                Email
                <input
                  className={inputClassName}
                  type="email"
                  placeholder="ravi@example.com"
                  value={form.email}
                  onChange={(event) => updateCommonField("email", event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-command">
                Password
                <input
                  className={inputClassName}
                  type="password"
                  placeholder="Create a secure password"
                  value={form.password}
                  onChange={(event) => updateCommonField("password", event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-command">
                Phone
                <input
                  className={inputClassName}
                  placeholder="+91 98XXXXXX45"
                  value={form.phone}
                  onChange={(event) => updateCommonField("phone", event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-command">
                City
                <input
                  className={inputClassName}
                  placeholder="Lucknow"
                  value={form.city}
                  onChange={(event) => updateCommonField("city", event.target.value)}
                  required
                />
              </label>
              <div className="block text-sm font-medium text-command">
                Role
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => updateCommonField("role", role.value)}
                      className={`rounded-[22px] border px-4 py-3 text-left transition ${
                        form.role === role.value
                          ? "border-command bg-command text-white"
                          : "border-border bg-white/80 text-command hover:border-command/35"
                      }`}
                    >
                      <p className="text-sm font-semibold">{role.label}</p>
                      <p
                        className={`mt-1 text-xs leading-5 ${
                          form.role === role.value
                            ? "text-white/76"
                            : "text-command-soft/75"
                        }`}
                      >
                        {role.helper}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-command">
                {selectedRole?.label} details
              </h2>
              <Badge tone="info">Step 2</Badge>
            </div>

            {form.role === "ngo" ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-command">
                  NGO name
                  <input
                    className={inputClassName}
                    placeholder="Rahat Seva Trust"
                    value={form.ngo.ngoName}
                    onChange={(event) => updateNgoField("ngoName", event.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-command">
                  Registration number
                  <input
                    className={inputClassName}
                    placeholder="NGO-LKO-2024-01"
                    value={form.ngo.registrationNumber}
                    onChange={(event) =>
                      updateNgoField("registrationNumber", event.target.value)
                    }
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-command sm:col-span-2">
                  Focus areas
                  <input
                    className={inputClassName}
                    placeholder="Relief distribution, shelter support, medical camps"
                    value={form.ngo.focusAreas}
                    onChange={(event) =>
                      updateNgoField("focusAreas", event.target.value)
                    }
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-command sm:col-span-2">
                  Verification document placeholder
                  <input
                    className={inputClassName}
                    placeholder="Trust deed, NGO certificate, or onboarding document"
                    value={form.ngo.verificationDocument}
                    onChange={(event) =>
                      updateNgoField("verificationDocument", event.target.value)
                    }
                  />
                </label>
                <div className="sm:col-span-2 rounded-[24px] border border-dashed border-border bg-white/80 p-4">
                  <p className="text-sm font-semibold text-command">
                    Firebase Storage-ready slot
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    We are storing the placeholder path in Firestore for now. A
                    real upload can be connected to Firebase Storage in the next step.
                  </p>
                </div>
              </div>
            ) : null}

            {form.role === "volunteer" ? (
              <div className="mt-6 grid gap-5">
                <label className="block text-sm font-medium text-command">
                  Skills
                  <input
                    className={inputClassName}
                    placeholder="First-aid, food distribution, driving"
                    value={form.volunteer.skills}
                    onChange={(event) =>
                      updateVolunteerField("skills", event.target.value)
                    }
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-command">
                  Languages
                  <input
                    className={inputClassName}
                    placeholder="Hindi, English"
                    value={form.volunteer.languages}
                    onChange={(event) =>
                      updateVolunteerField("languages", event.target.value)
                    }
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-command">
                  Availability
                  <select
                    className={inputClassName}
                    value={form.volunteer.availability}
                    onChange={(event) =>
                      updateVolunteerField(
                        "availability",
                        event.target.value as RegisterFormValues["volunteer"]["availability"],
                      )
                    }
                  >
                    <option value="available_now">Available now</option>
                    <option value="limited">Limited</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-command">
                  Assets
                  <input
                    className={inputClassName}
                    placeholder="Bike, boat, 4x4 vehicle, shelter space, medical kit"
                    value={form.volunteer.assets}
                    onChange={(event) =>
                      updateVolunteerField("assets", event.target.value)
                    }
                  />
                </label>
                <label className="block text-sm font-medium text-command">
                  Emergency radius
                  <input
                    className={inputClassName}
                    placeholder="25 km"
                    value={form.volunteer.emergencyRadius}
                    onChange={(event) =>
                      updateVolunteerField("emergencyRadius", event.target.value)
                    }
                    required
                  />
                </label>
              </div>
            ) : null}

            {form.role === "donor" ? (
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-sm font-medium text-command">Help types</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {donorHelpTypes.map((type) => {
                      const selected = form.donor.helpTypes.includes(type);

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleDonorHelpType(type)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                            selected
                              ? "border-command bg-command text-white"
                              : "border-border bg-white/80 text-command hover:border-command/35"
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-[24px] border border-border bg-white/80 p-4">
                  <p className="text-sm font-semibold text-command">
                    Selected help types
                  </p>
                  <p className="mt-2 text-sm leading-6 text-command-soft/78">
                    {form.donor.helpTypes.length > 0
                      ? form.donor.helpTypes.join(", ")
                      : "Select one or more donor support categories."}
                  </p>
                </div>
              </div>
            ) : null}

            {form.role === "admin" ? (
              <div className="mt-6 rounded-[24px] border border-border bg-white/85 p-5">
                <p className="text-sm font-semibold text-command">
                  Admin onboarding in MVP
                </p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  Admin accounts currently rely on the shared identity profile
                  and role field. Extra policy controls can layer on top later.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-border bg-[linear-gradient(145deg,rgba(17,36,58,0.96),rgba(31,64,96,0.95))] p-6 text-white shadow-[0_24px_72px_rgba(17,36,58,0.18)]">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/60">
              Submission behavior
            </p>
            <p className="mt-3 text-lg font-semibold">
              Registration now creates a Firebase Auth user and saves the role
              profile document in Firestore.
            </p>
            <div className="mt-6 space-y-3">
              <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 text-sm leading-6 text-white/80">
                Common identity details stay separate from role-specific fields,
                but both are saved together under the user profile document.
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 text-sm leading-6 text-white/80">
                {firebasePlaceholder.note}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-command">
                Live registration summary
              </h2>
              <Badge tone="neutral">{selectedRole?.label}</Badge>
            </div>
            <div className="mt-6 space-y-4 text-sm leading-6 text-command-soft/80">
              <div className="rounded-[22px] border border-border bg-white/85 p-4">
                <p className="font-semibold text-command">Identity</p>
                <p className="mt-2">
                  {form.name || "Unnamed user"} - {form.email || "email not set"} -{" "}
                  {form.city || "city not set"}
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-white/85 p-4">
                <p className="font-semibold text-command">Role intent</p>
                <p className="mt-2">{selectedRole?.helper}</p>
                <p className="mt-2">
                  Dashboard target:{" "}
                  <span className="font-mono text-command">
                    {getDashboardPathForRole(form.role)}
                  </span>
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-white/85 p-4">
                <p className="font-semibold text-command">Role data snapshot</p>
                <p className="mt-2">
                  {form.role === "ngo"
                    ? form.ngo.focusAreas || "NGO focus areas not added yet."
                    : null}
                  {form.role === "volunteer"
                    ? form.volunteer.skills || "Volunteer skills not added yet."
                    : null}
                  {form.role === "donor"
                    ? form.donor.helpTypes.join(", ") ||
                      "No donor help types selected yet."
                    : null}
                  {form.role === "admin"
                    ? "Admin role will use common fields only in this MVP pass."
                    : null}
                </p>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                <p className="text-sm font-semibold text-alert">
                  Registration failed
                </p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  {errorMessage}
                </p>
              </div>
            ) : null}

            {result ? (
              <div className="mt-6 rounded-[24px] border border-safe/25 bg-safe/8 p-4">
                <p className="text-sm font-semibold text-command">
                  {result.userName} is ready as {result.role.toUpperCase()}
                </p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  {result.message}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button href={result.redirectPath} size="sm">
                    Open dashboard
                  </Button>
                  <Button href="/login" variant="secondary" size="sm">
                    Go to login
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              className="sm:flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
            <Button
              href="/login"
              variant="secondary"
              size="lg"
              className="sm:flex-1"
            >
              Sign in instead
            </Button>
          </div>
        </section>
      </form>
    </div>
  );
}
