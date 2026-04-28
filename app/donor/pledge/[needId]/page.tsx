"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ResourceCard } from "@/components/ResourceCard";
import { getCurrentUser } from "@/lib/auth";
import { createResourcePledge, getResourceNeed } from "@/lib/firestore";
import { getResourceNeedById } from "@/data/mock-data";
import type { ResourceNeed, ResourcePledgeFormValues } from "@/types";

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-border bg-white/90 px-4 py-3 text-sm text-command outline-none transition focus:border-command focus:ring-2 focus:ring-command/10";

export default function DonorPledgePage({
  params,
}: {
  params: Promise<{ needId: string }>;
}) {
  const router = useRouter();
  const { needId } = use(params);
  const [resourceNeed, setResourceNeed] = useState<ResourceNeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ResourcePledgeFormValues>({
    quantity: "",
    location: "",
    note: "",
  });

  useEffect(() => {
    let isActive = true;

    async function loadNeed() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const firestoreNeed = await getResourceNeed(needId);
        const fallbackNeed = getResourceNeedById(needId) ?? null;
        const nextNeed = firestoreNeed ?? fallbackNeed;

        if (!isActive) {
          return;
        }

        setResourceNeed(nextNeed);

        if (!nextNeed) {
          setErrorMessage("This resource need could not be found.");
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        const fallbackNeed = getResourceNeedById(needId) ?? null;
        setResourceNeed(fallbackNeed);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load this pledge request right now.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadNeed();

    return () => {
      isActive = false;
    };
  }, [needId]);

  function updateField<K extends keyof ResourcePledgeFormValues>(
    field: K,
    value: ResourcePledgeFormValues[K],
  ) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resourceNeed) {
      setErrorMessage("Resource need details are still loading.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const quantity = Number.parseInt(form.quantity, 10);

      if (Number.isNaN(quantity) || quantity < 1) {
        throw new Error("Please enter a valid quantity to pledge.");
      }

      const { resourceNeed: updatedNeed } = await createResourcePledge({
        resourceNeed,
        resourceNeedId: resourceNeed.id,
        donorId: getCurrentUser()?.uid ?? "demo-donor",
        itemType: resourceNeed.label,
        quantity,
        note: form.note,
        location: {
          lat: 0,
          lng: 0,
          address: form.location.trim(),
        },
        status: "pending",
        verified: false,
      });

      setResourceNeed(updatedNeed);
      setForm({
        quantity: "",
        location: "",
        note: "",
      });
      setSuccessMessage(
        "Pledge submitted with pending NGO verification. The public pledged quantity has been updated.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit the pledge right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell
        currentPath={`/donor/pledge/${needId}`}
        eyebrow="Donor Pledge"
        title="Loading pledge request"
        description="Fetching the selected resource need so you can pledge accurately."
      >
        <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm leading-7 text-command-soft/78">
            Pulling the current quantity gap and delivery location.
          </p>
        </section>
      </AppShell>
    );
  }

  if (!resourceNeed) {
    return (
      <AppShell
        currentPath={`/donor/pledge/${needId}`}
        eyebrow="Donor Pledge"
        title="Resource need unavailable"
        description="The selected need is missing or not accessible yet."
        actions={<Button href="/donor">Back to donor board</Button>}
      >
        <section className="rounded-[32px] border border-alert/20 bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm font-semibold text-alert">Unable to open this pledge</p>
          <p className="mt-3 text-sm leading-7 text-command-soft/78">
            {errorMessage ?? "Try returning to the donor board and selecting another need."}
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      currentPath={`/donor/pledge/${needId}`}
      eyebrow="Donor Pledge"
      title={`Pledge support for ${resourceNeed.label}`}
      description="Submit a quantity-based pledge for this need. Every pledge is marked pending until the NGO verifies it."
      actions={
        <>
          <Button href="/donor" variant="secondary" size="lg">
            Back to donor board
          </Button>
          <Button type="submit" form="resource-pledge-form" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit pledge"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                  Need summary
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-command">
                  Current quantity gap
                </h2>
              </div>
              <Badge tone="warn">Pending NGO verification</Badge>
            </div>
            <div className="mt-6">
              <ResourceCard need={resourceNeed} />
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-[linear-gradient(160deg,rgba(17,36,58,0.97),rgba(31,64,96,0.94))] p-6 text-white shadow-[0_22px_60px_rgba(17,36,58,0.2)]">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/60">
              Verification step
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Your pledge is counted, then verified by the NGO.
            </h2>
            <div className="mt-6 space-y-4">
              {[
                "The pledge record is saved with status pending NGO verification.",
                "The public pledged quantity updates immediately so the board reflects incoming support momentum.",
                "Field teams can later verify delivery quality before marking the pledge fulfilled.",
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

        <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Pledge form
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-command">
                Confirm your support
              </h2>
            </div>
            <Badge tone="safe">{resourceNeed.label}</Badge>
          </div>

          <form id="resource-pledge-form" className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-command">
              Quantity to pledge
              <input
                type="number"
                min="1"
                className={inputClassName}
                placeholder="25"
                value={form.quantity}
                onChange={(event) => updateField("quantity", event.target.value)}
                required
              />
            </label>

            <label className="block text-sm font-medium text-command">
              Pickup or drop location
              <input
                className={inputClassName}
                placeholder="Warehouse gate, Aluva main road"
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                required
              />
            </label>

            <label className="block text-sm font-medium text-command">
              Note
              <textarea
                className={`${inputClassName} min-h-28 resize-y`}
                placeholder="Delivery possible after 5 PM. Please coordinate with the shelter team before dispatch."
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
              />
            </label>

            <div className="rounded-[24px] border border-border bg-white/85 p-4">
              <p className="text-sm font-semibold text-command">Submission behavior</p>
              <p className="mt-2 text-sm leading-6 text-command-soft/78">
                This pledge will create a <span className="font-mono text-command">ResourcePledge</span>{" "}
                record, increment pledged quantity on the selected need, and set the
                pledge status to pending NGO verification.
              </p>
              <p className="mt-2 text-sm leading-6 text-command-soft/78">
                {getCurrentUser()
                  ? "Signed-in donor detected."
                  : "No donor session detected, so this MVP will use a demo donor id for the pledge record."}
              </p>
            </div>

            {errorMessage ? (
              <div className="rounded-[24px] border border-alert/25 bg-alert/8 p-4">
                <p className="text-sm font-semibold text-alert">Pledge failed</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  {errorMessage}
                </p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-[24px] border border-safe/25 bg-safe/8 p-4">
                <p className="text-sm font-semibold text-command">Pledge submitted</p>
                <p className="mt-2 text-sm leading-6 text-command-soft/78">
                  {successMessage}
                </p>
                <div className="mt-4 flex gap-3">
                  <Button href="/donor" variant="secondary" size="sm">
                    Return to donor board
                  </Button>
                  <Button type="button" size="sm" onClick={() => router.refresh()}>
                    Refresh page
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </AppShell>
  );
}
