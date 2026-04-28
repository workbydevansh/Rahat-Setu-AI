"use client";

import { useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { requestCrisisReportClassification } from "@/lib/ai-client";
import type { CrisisReportClassification } from "@/types";

const inputClassName =
  "mt-2 w-full rounded-[20px] border border-border bg-white/90 px-4 py-3 text-sm text-command outline-none transition focus:border-command focus:ring-2 focus:ring-command/10";

export function CrisisReportIntake() {
  const [reportText, setReportText] = useState("");
  const [classification, setClassification] =
    useState<CrisisReportClassification | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClassifyReport() {
    if (!reportText.trim()) {
      setErrorMessage("Enter a local public report first.");
      return;
    }

    setIsClassifying(true);
    setErrorMessage(null);

    try {
      const nextClassification = await requestCrisisReportClassification(reportText);
      setClassification(nextClassification);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to classify the crisis report right now.",
      );
    } finally {
      setIsClassifying(false);
    }
  }

  return (
    <div className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
            Crisis report intake
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-command">
            Local public report triage
          </h2>
        </div>
        <Badge tone="info">AI-assisted</Badge>
      </div>

      <div className="mt-6 rounded-[24px] border border-border bg-mist/34 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-command">Local public report</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">
              Paste a raw public report and the classifier will suggest category,
              priority, needs, and a verification warning.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClassifyReport}
            disabled={isClassifying}
          >
            {isClassifying ? "Classifying..." : "Classify report"}
          </Button>
        </div>

        <textarea
          className={`${inputClassName} min-h-32 resize-y`}
          placeholder="Water has entered homes near the river bridge, two elderly residents are stranded on the first floor, and the road is no longer safe for small cars."
          value={reportText}
          onChange={(event) => {
            setErrorMessage(null);
            setClassification(null);
            setReportText(event.target.value);
          }}
        />
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-[24px] border border-alert/25 bg-alert/8 p-4">
          <p className="text-sm font-semibold text-alert">Classification unavailable</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">
            {errorMessage}
          </p>
        </div>
      ) : null}

      {classification ? (
        <div className="mt-5 grid gap-4">
          <div className="rounded-[24px] border border-border bg-white/85 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warn">{classification.category}</Badge>
              <Badge
                tone={
                  classification.priority === "critical"
                    ? "alert"
                    : classification.priority === "high"
                      ? "warn"
                      : "neutral"
                }
              >
                {classification.priority}
              </Badge>
              <Badge tone={classification.requiresVerification ? "alert" : "safe"}>
                {classification.requiresVerification
                  ? "verification required"
                  : "ready for operations"}
              </Badge>
            </div>

            <p className="mt-4 text-sm font-semibold text-command">
              Suggested needs
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {classification.needs.map((need) => (
                <Badge key={need} tone="info">
                  {need}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-alert/25 bg-alert/8 p-4">
            <p className="text-sm font-semibold text-alert">Verification warning</p>
            <p className="mt-2 text-sm leading-6 text-command-soft/78">
              {classification.safetyWarning}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
