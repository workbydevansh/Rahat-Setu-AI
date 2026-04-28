"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { getCertificate } from "@/lib/firestore";
import type { Certificate } from "@/types";

interface CertificateViewProps {
  certificateId: string;
  initialCertificate: Certificate | null;
}

export function CertificateView({
  certificateId,
  initialCertificate,
}: CertificateViewProps) {
  const [certificate, setCertificate] = useState<Certificate | null>(initialCertificate);
  const [isLoading, setIsLoading] = useState(!initialCertificate);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadCertificate() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const firestoreCertificate = await getCertificate(certificateId);

        if (!isActive) {
          return;
        }

        setCertificate(firestoreCertificate ?? initialCertificate);

        if (!firestoreCertificate && !initialCertificate) {
          setErrorMessage("This certificate could not be found.");
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setCertificate(initialCertificate);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load this certificate right now.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCertificate();

    return () => {
      isActive = false;
    };
  }, [certificateId, initialCertificate]);

  function handlePdfPlaceholder() {
    setMessage(
      "PDF download is still placeholder-only in this MVP. Use the print dialog to save this printable page as a PDF during the demo.",
    );

    if (typeof window !== "undefined") {
      window.print();
    }
  }

  async function handleSharePlaceholder() {
    const shareMessage =
      "Share is placeholder-only in this MVP. In the full version, this would send a secure verification link for the certificate.";

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      certificate
    ) {
      try {
        await navigator.share({
          title: `${certificate.volunteerName} certificate`,
          text: `Verified contribution certificate for ${certificate.crisisTitle}`,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        });
        setMessage("Native share opened successfully.");
        return;
      } catch {
        // Fall through to placeholder note.
      }
    }

    setMessage(shareMessage);
  }

  if (isLoading && !certificate) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-2xl rounded-[32px] border border-border bg-surface p-8 text-center shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
            Certificate
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-command">Loading certificate</h1>
          <p className="mt-4 text-sm leading-7 text-command-soft/78">
            Pulling the printable certificate record from the active data source.
          </p>
        </div>
      </main>
    );
  }

  if (!certificate) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-2xl rounded-[32px] border border-alert/20 bg-surface p-8 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
            Certificate
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-command">
            Certificate unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-command-soft/78">
            {errorMessage ?? "The requested certificate record could not be found."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/volunteer/dashboard">Back to volunteer dashboard</Button>
            <Button href="/ngo/dashboard" variant="secondary">
              Open NGO dashboard
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="certificate-page mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
            Verified contribution certificate
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-command">
            Printable certificate view
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/volunteer/dashboard" variant="secondary">
            Back
          </Button>
          <Button type="button" variant="secondary" onClick={handlePdfPlaceholder}>
            Download PDF placeholder
          </Button>
          <Button type="button" onClick={handleSharePlaceholder}>
            Share placeholder
          </Button>
        </div>
      </div>

      {message ? (
        <div className="print-hidden mt-6 rounded-[24px] border border-safe/20 bg-surface p-4 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm font-semibold text-safe">Certificate action</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">{message}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="print-hidden mt-6 rounded-[24px] border border-warn/20 bg-surface p-4 shadow-[0_18px_40px_rgba(17,36,58,0.08)]">
          <p className="text-sm font-semibold text-command">Data source note</p>
          <p className="mt-2 text-sm leading-6 text-command-soft/78">{errorMessage}</p>
        </div>
      ) : null}

      <section className="certificate-print-surface mt-6 overflow-hidden rounded-[40px] border border-border bg-[linear-gradient(180deg,rgba(255,253,248,0.96),rgba(248,243,233,0.96))] shadow-[0_28px_70px_rgba(17,36,58,0.14)]">
        <div className="border-b border-border bg-[linear-gradient(135deg,rgba(17,36,58,0.98),rgba(54,89,123,0.96))] px-8 py-8 text-white sm:px-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-white/60">
                RahatSetu AI
              </p>
              <h2 className="mt-3 text-4xl font-semibold">Certificate of Relief Service</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="safe" className="bg-white/12 text-white">
                Verified contribution
              </Badge>
              <Badge tone="neutral" className="bg-white/10 text-white">
                Printable HTML
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-8 py-8 sm:px-12 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
                Awarded to
              </p>
              <h3 className="mt-3 text-5xl font-semibold tracking-tight text-command">
                {certificate.volunteerName}
              </h3>

              <p className="mt-8 text-lg leading-9 text-command-soft/82">
                This certificate is awarded to {certificate.volunteerName} for verified
                contribution in {certificate.crisisTitle} relief work with{" "}
                {certificate.ngoName}.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-border bg-white/82 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                    NGO
                  </p>
                  <p className="mt-3 text-lg font-semibold text-command">
                    {certificate.ngoName}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border bg-white/82 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                    Crisis
                  </p>
                  <p className="mt-3 text-lg font-semibold text-command">
                    {certificate.crisisTitle}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border bg-white/82 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                    Task
                  </p>
                  <p className="mt-3 text-lg font-semibold text-command">
                    {certificate.taskTitle}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border bg-white/82 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-command-soft/65">
                    Hours contributed
                  </p>
                  <p className="mt-3 text-lg font-semibold text-command">
                    {certificate.serviceHours} hours
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-border bg-white/88 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/70">
                  Certificate details
                </p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-command-soft/80">
                  <p>
                    <span className="font-semibold text-command">Certificate ID:</span>{" "}
                    {certificate.certificateId}
                  </p>
                  <p>
                    <span className="font-semibold text-command">Service date:</span>{" "}
                    {new Date(certificate.serviceDate).toLocaleDateString("en-IN")}
                  </p>
                  <p>
                    <span className="font-semibold text-command">Issued on:</span>{" "}
                    {new Date(certificate.issuedAt).toLocaleDateString("en-IN")}
                  </p>
                  <p>
                    <span className="font-semibold text-command">Location:</span>{" "}
                    {certificate.location.address}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-border bg-[linear-gradient(160deg,rgba(17,36,58,0.97),rgba(31,64,96,0.94))] p-5 text-white">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/60">
                  Verification QR placeholder
                </p>
                <div className="mt-5 flex items-center gap-5">
                  <div className="grid h-36 w-36 shrink-0 grid-cols-6 gap-1 rounded-[20px] border border-white/12 bg-white p-3">
                    {Array.from({ length: 36 }).map((_, index) => (
                      <span
                        key={index}
                        className={`rounded-sm ${
                          index % 2 === 0 || index % 5 === 0
                            ? "bg-command"
                            : "bg-mist"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-6 text-white/78">
                    {certificate.verificationQrPlaceholder}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/65">
                Verified by
              </p>
              <p className="mt-3 text-2xl font-semibold text-command">
                {certificate.ngoName}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-command-soft/65">
                RahatSetu AI certificate record
              </p>
              <p className="mt-3 text-2xl font-semibold text-command">
                {certificate.certificateNumber}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
