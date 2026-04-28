import { Badge } from "@/components/Badge";

const policyNotes = [
  "Donor amount is private by default.",
  "Public only sees total campaign impact.",
  "Exact volunteer location is visible only to a verified NGO after task assignment.",
  "Red-risk tasks require trained or verified responders.",
  "The platform supports relief coordination and does not replace official emergency services.",
] as const;

export function AppPolicyFooter() {
  return (
    <footer className="relative z-10 border-t border-border/70 bg-background/82 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/68">
              Privacy and safety
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-command-soft/80">
              RahatSetu AI is designed to protect donor privacy, limit sensitive
              volunteer exposure, and keep high-risk relief work under verified
              supervision.
            </p>
          </div>
          <Badge tone="warn">Safety first</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {policyNotes.map((note) => (
            <div
              key={note}
              className="motion-card rounded-[22px] border border-border bg-white/84 p-4 shadow-[0_10px_20px_rgba(23,32,51,0.05)]"
            >
              <p className="text-sm leading-6 text-command-soft/82">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
