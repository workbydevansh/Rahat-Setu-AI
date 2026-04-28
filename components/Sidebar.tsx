"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import {
  subscribeToProfileSession,
  type CurrentProfileSession,
} from "@/lib/auth";
import { canShowForRole, sidebarNavigationItems } from "@/lib/role-access";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentPath: string;
}

type SidebarIcon =
  | "home"
  | "dashboard"
  | "profile"
  | "tasks"
  | "database"
  | "ngo"
  | "create"
  | "volunteer"
  | "opportunities"
  | "donor"
  | "admin"
  | "crisis";

function getIconForHref(href: string): SidebarIcon {
  if (href === "/") {
    return "home";
  }

  if (href.includes("opportunities")) {
    return "opportunities";
  }

  if (href.includes("volunteer/profile") || href === "/profile") {
    return "profile";
  }

  if (href.includes("volunteer")) {
    return "volunteer";
  }

  if (href.includes("crisis/new")) {
    return "create";
  }

  if (href.includes("crisis")) {
    return "crisis";
  }

  if (href.includes("ngo")) {
    return "ngo";
  }

  if (href.includes("tasks")) {
    return "tasks";
  }

  if (href.includes("database")) {
    return "database";
  }

  if (href.includes("donor")) {
    return "donor";
  }

  if (href.includes("admin")) {
    return "admin";
  }

  return "dashboard";
}

function NavGlyph({ icon }: { icon: SidebarIcon }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      {icon === "home" ? (
        <>
          <path {...common} d="M4 11.5 12 5l8 6.5" />
          <path {...common} d="M6.5 10.5V20h11v-9.5" />
          <path {...common} d="M10 20v-5h4v5" />
        </>
      ) : null}
      {icon === "dashboard" ? (
        <>
          <path {...common} d="M4 13h6V4H4v9Z" />
          <path {...common} d="M14 20h6v-9h-6v9Z" />
          <path {...common} d="M4 20h6v-3H4v3Z" />
          <path {...common} d="M14 7h6V4h-6v3Z" />
        </>
      ) : null}
      {icon === "profile" ? (
        <>
          <circle {...common} cx="12" cy="8" r="3.5" />
          <path {...common} d="M5 20c1.2-3.5 3.5-5.3 7-5.3s5.8 1.8 7 5.3" />
        </>
      ) : null}
      {icon === "tasks" ? (
        <>
          <path {...common} d="M8 6h12" />
          <path {...common} d="M8 12h12" />
          <path {...common} d="M8 18h12" />
          <path {...common} d="m3.5 6 1 1 2-2" />
          <path {...common} d="m3.5 12 1 1 2-2" />
          <path {...common} d="m3.5 18 1 1 2-2" />
        </>
      ) : null}
      {icon === "database" ? (
        <>
          <ellipse {...common} cx="12" cy="6" rx="7" ry="3" />
          <path {...common} d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path {...common} d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </>
      ) : null}
      {icon === "ngo" ? (
        <>
          <path {...common} d="M4 20V9l8-4 8 4v11" />
          <path {...common} d="M8 20v-8h8v8" />
          <path {...common} d="M10 15h4" />
        </>
      ) : null}
      {icon === "create" ? (
        <>
          <path {...common} d="M12 5v14" />
          <path {...common} d="M5 12h14" />
          <path {...common} d="M4 5h4" />
          <path {...common} d="M16 19h4" />
        </>
      ) : null}
      {icon === "volunteer" ? (
        <>
          <path {...common} d="M7 12.5c-2 0-3.5-1.5-3.5-3.5S5 5.5 7 5.5 10.5 7 10.5 9 9 12.5 7 12.5Z" />
          <path {...common} d="M17 12.5c-2 0-3.5-1.5-3.5-3.5S15 5.5 17 5.5 20.5 7 20.5 9 19 12.5 17 12.5Z" />
          <path {...common} d="M3 20c.7-3 2-4.5 4-4.5S10.3 17 11 20" />
          <path {...common} d="M13 20c.7-3 2-4.5 4-4.5S20.3 17 21 20" />
        </>
      ) : null}
      {icon === "opportunities" ? (
        <>
          <path {...common} d="M5 7h14" />
          <path {...common} d="M5 12h10" />
          <path {...common} d="M5 17h7" />
          <path {...common} d="m17 14 2 2 3-4" />
        </>
      ) : null}
      {icon === "donor" ? (
        <>
          <path {...common} d="M12 20s-7-3.8-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.2-7 9-7 9Z" />
        </>
      ) : null}
      {icon === "admin" ? (
        <>
          <path {...common} d="M12 3 19 6v5c0 4.5-2.6 7.5-7 10-4.4-2.5-7-5.5-7-10V6l7-3Z" />
          <path {...common} d="m9 12 2 2 4-5" />
        </>
      ) : null}
      {icon === "crisis" ? (
        <>
          <path {...common} d="M12 3 3 20h18L12 3Z" />
          <path {...common} d="M12 9v4" />
          <path {...common} d="M12 17h.01" />
        </>
      ) : null}
    </svg>
  );
}

export function Sidebar({ currentPath }: SidebarProps) {
  const [session, setSession] = useState<CurrentProfileSession | null>(null);

  useEffect(() => subscribeToProfileSession(setSession), []);

  const sidebarItems = sidebarNavigationItems.filter((item) =>
    canShowForRole(item.audiences, session?.role ?? null),
  );

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:z-40 lg:h-[calc(100vh-7rem)] lg:w-24 lg:self-start">
      <div className="surface-panel group/sidebar relative flex flex-col overflow-hidden rounded-[32px] p-3 transition-[width,box-shadow] duration-300 ease-out lg:absolute lg:left-0 lg:top-0 lg:max-h-full lg:w-24 lg:hover:w-80 lg:focus-within:w-80 lg:shadow-[0_28px_88px_rgba(23,32,51,0.16)]">
        <Link
          href="/"
          className="grid grid-cols-[2.5rem_1fr] items-center gap-3 rounded-[24px] border border-command/12 bg-white/88 p-2 transition hover:border-command/25 hover:bg-command/6"
          aria-label="RahatSetu AI home"
        >
          <Image
            src="/rahatsetu-mark.svg"
            alt="RahatSetu AI"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0"
            priority
          />
          <span className="min-w-0 overflow-hidden transition-all duration-300 ease-out lg:max-h-0 lg:max-w-0 lg:translate-x-1 lg:opacity-0 lg:group-hover/sidebar:max-h-12 lg:group-hover/sidebar:max-w-[190px] lg:group-hover/sidebar:translate-x-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:max-h-12 lg:group-focus-within/sidebar:max-w-[190px] lg:group-focus-within/sidebar:translate-x-0 lg:group-focus-within/sidebar:opacity-100">
            <span className="block text-sm font-semibold text-command">RahatSetu AI</span>
            <span className="block truncate text-xs text-command-soft/70">
              Relief opportunity hub
            </span>
          </span>
        </Link>

        <div className="mt-3 overflow-hidden rounded-[24px] border border-command/12 bg-[linear-gradient(135deg,#0f2147,#0b5cff)] p-2 text-white">
          <div className="grid grid-cols-[2.5rem_1fr] items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-white/14 text-white">
              <NavGlyph icon="dashboard" />
            </span>
            <div className="min-w-0 overflow-hidden transition-all duration-300 ease-out lg:max-h-0 lg:max-w-0 lg:translate-x-1 lg:opacity-0 lg:group-hover/sidebar:max-h-60 lg:group-hover/sidebar:max-w-[210px] lg:group-hover/sidebar:translate-x-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:max-h-60 lg:group-focus-within/sidebar:max-w-[210px] lg:group-focus-within/sidebar:translate-x-0 lg:group-focus-within/sidebar:opacity-100">
              <p className="status-dot font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                Ops status
              </p>
              <p className="mt-2 text-lg font-semibold leading-snug">Hybrid MVP mode</p>
              <p className="mt-2 text-sm leading-6 text-white/76">
                Mock data stays live while Firebase and AI flows come online.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="safe" caps={false}>
                  Local DB
                </Badge>
                <Badge tone="warn" caps={false}>
                  Gemini AI
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <nav className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0">
          {sidebarItems.map((item) => {
            const isActive =
              currentPath === item.href ||
              (item.href !== "/" && currentPath.startsWith(item.href));
            const icon = getIconForHref(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "grid min-w-[230px] grid-cols-[2.5rem_1fr] items-center gap-3 rounded-[24px] border p-2 text-left transition lg:min-w-0",
                  isActive
                    ? "border-command/35 bg-command text-white shadow-[0_16px_34px_rgba(11,92,255,0.22)]"
                    : "border-border bg-white/78 text-command hover:border-command/25 hover:bg-command/7",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[18px] transition",
                    isActive ? "bg-white/18 text-white" : "bg-command/8 text-command",
                  )}
                >
                  <NavGlyph icon={icon} />
                </span>
                <span className="min-w-0 overflow-hidden transition-all duration-300 ease-out lg:max-h-0 lg:max-w-0 lg:translate-x-1 lg:opacity-0 lg:group-hover/sidebar:max-h-12 lg:group-hover/sidebar:max-w-[190px] lg:group-hover/sidebar:translate-x-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:max-h-12 lg:group-focus-within/sidebar:max-w-[190px] lg:group-focus-within/sidebar:translate-x-0 lg:group-focus-within/sidebar:opacity-100">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span
                    className={cn(
                      "mt-1 block truncate text-sm",
                      isActive ? "text-white/74" : "text-command-soft/72",
                    )}
                  >
                    {item.kicker}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
