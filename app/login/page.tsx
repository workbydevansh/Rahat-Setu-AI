"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { getDefaultLoginValues, loginUser } from "@/lib/auth";
import { firebasePlaceholder } from "@/lib/firebase";
import type { AuthActionResult, LoginFormValues } from "@/types";

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-border bg-white/92 px-4 py-3 text-sm text-command shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition placeholder:text-command-soft/60 focus:border-command/45 focus:bg-white focus:ring-4 focus:ring-command/10";

const roleCards = [
  {
    label: "NGO",
    helper: "Manage active crises, volunteers, resource gaps, and operational dashboards.",
  },
  {
    label: "Volunteer",
    helper: "View nearby tasks, contribution history, and certificate-ready work records.",
  },
  {
    label: "Donor",
    helper: "Respond to verified needs while keeping public impact visibility clean and trustworthy.",
  },
  {
    label: "Admin",
    helper: "Oversee verification, moderation, and safety review workflows across incidents.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [form, setForm] = useState<LoginFormValues>(getDefaultLoginValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      pushToast({
        title: "Sign-in failed",
        description: errorMessage,
        tone: "alert",
      });
    }
  }, [errorMessage, pushToast]);

  useEffect(() => {
    if (result) {
      pushToast({
        title: "Signed in successfully",
        description: result.message,
        tone: "safe",
      });
    }
  }, [pushToast, result]);

  function updateField<K extends keyof LoginFormValues>(
    field: K,
    value: LoginFormValues[K],
  ) {
    setResult(null);
    setErrorMessage(null);
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setErrorMessage(null);

    try {
      const nextResult = await loginUser(form.email, form.password);
      setResult(nextResult);

      window.setTimeout(() => {
        router.push(nextResult.redirectPath);
      }, 700);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <section className="rounded-[36px] border border-border bg-[linear-gradient(160deg,rgba(17,36,58,0.97),rgba(54,89,123,0.94))] p-6 text-white shadow-[0_28px_84px_rgba(17,36,58,0.24)] sm:p-8">
        <Badge tone="safe">{firebasePlaceholder.label}</Badge>
        <h1 className="mt-6 text-4xl font-semibold leading-tight">
          Sign into the relief coordination network.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-white/75">
          This flow now uses Firebase Auth for sign-in and Firestore to discover
          the saved role profile before routing the user to the right dashboard.
        </p>

        <div className="mt-8 grid gap-4">
          {roleCards.map((role) => (
            <div
              key={role.label}
              className="rounded-[24px] border border-white/10 bg-white/8 p-4 text-sm leading-6 text-white/78 backdrop-blur"
            >
              <p className="font-semibold text-white">{role.label}</p>
              <p className="mt-1">{role.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[36px] border border-border bg-surface p-6 shadow-[0_20px_44px_rgba(17,36,58,0.08)] sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              Authentication
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-command">
              Welcome back
            </h2>
          </div>
          <Badge tone="neutral">Firebase Auth</Badge>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-command">
            Email
            <input
              type="email"
              placeholder="coordinator@rahatsetu.org"
              className={inputClassName}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium text-command">
            Password
            <input
              type="password"
              placeholder="Enter your password"
              className={inputClassName}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
            />
          </label>

          <div className="rounded-[24px] border border-border bg-white/85 p-4">
            <p className="text-sm font-semibold text-command">Routing behavior</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">
              After Firebase signs the user in, the app reads the Firestore
              profile to determine whether to send them to the NGO, volunteer,
              donor, or admin dashboard.
            </p>
            <p className="mt-3 text-sm leading-6 text-command-soft/78">
              {firebasePlaceholder.note}
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-[24px] border border-alert/25 bg-alert/8 p-4">
              <p className="text-sm font-semibold text-alert">Sign-in failed</p>
              <p className="mt-2 text-sm leading-6 text-command-soft/78">
                {errorMessage}
              </p>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-[24px] border border-safe/25 bg-safe/8 p-4">
              <p className="text-sm font-semibold text-command">
                {result.userName} signed in as {result.role.toUpperCase()}
              </p>
              <p className="mt-2 text-sm leading-6 text-command-soft/78">
                {result.message}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              className="sm:flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
            <Button
              href="/register"
              variant="secondary"
              size="lg"
              className="sm:flex-1"
            >
              Create account
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
