import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

interface AppShellProps {
  currentPath: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  currentPath,
  eyebrow,
  title,
  description,
  actions,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:gap-7 lg:px-8">
      <Sidebar currentPath={currentPath} />
      <div className="min-w-0 flex-1 space-y-6">
        <section className="surface-panel motion-card relative overflow-hidden rounded-[34px] p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d4ed8,#0891b2,#079669,#d99720)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(29,78,216,0.08),transparent_34%,rgba(7,150,105,0.08)_68%,rgba(229,72,77,0.06))]" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
              {eyebrow}
            </p>
            <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl lg:text-[2.65rem]">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-command-soft/80">
                  {description}
                </p>
              </div>
              {actions ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
                  {actions}
                </div>
              ) : null}
            </div>
          </div>
        </section>
        <div className="animate-section-in space-y-6">{children}</div>
      </div>
    </div>
  );
}
