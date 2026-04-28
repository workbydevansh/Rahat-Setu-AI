"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import {
  logoutUser,
  subscribeToProfileSession,
  type CurrentProfileSession,
} from "@/lib/auth";
import { canShowForRole, topNavigationItems } from "@/lib/role-access";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<CurrentProfileSession | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    return subscribeToProfileSession(setSession);
  }, [pathname]);

  async function handleLogout() {
    setIsSigningOut(true);

    try {
      await logoutUser();
      setSession(null);

      if (pathname.startsWith("/profile")) {
        router.push("/login");
      }
    } finally {
      setIsSigningOut(false);
    }
  }

  const initials = session?.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const visibleNavItems = topNavigationItems.filter((item) =>
    canShowForRole(item.audiences, session?.role ?? null),
  );

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/70 bg-background/82 backdrop-blur-2xl"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto grid w-full max-w-[1680px] gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8 2xl:grid-cols-[minmax(320px,auto)_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <Image
              src="/rahatsetu-mark.svg"
              alt="RahatSetu AI"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 transition group-hover:-translate-y-0.5"
              priority
            />
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-command-soft/70">
                RahatSetu AI
              </p>
              <p className="truncate text-sm font-medium text-foreground">
                Crisis coordination command center
              </p>
            </div>
          </Link>
          <Badge tone="safe" className="hidden shrink-0 md:inline-flex 2xl:hidden">
            response live
          </Badge>
        </div>

        <nav className="no-scrollbar order-3 col-span-full flex min-w-0 items-center gap-2 overflow-x-auto rounded-full border border-border bg-white/64 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] 2xl:order-none 2xl:col-span-1">
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition lg:px-5",
                  isActive
                    ? "bg-command text-white shadow-[0_12px_24px_rgba(29,78,216,0.18)]"
                    : "text-command-soft hover:bg-command/8 hover:text-command",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="hidden shrink-0 rounded-full border border-border bg-white/76 px-4 py-2 text-xs font-medium text-command-soft/78 xl:inline-flex">
            <span className="status-dot text-safe">Live ops</span>
          </div>
          {session ? (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <Link
                href="/profile"
                className={cn(
                  "inline-flex min-w-0 max-w-[230px] items-center gap-3 rounded-full border border-border bg-white/88 py-1.5 pl-1.5 pr-4 shadow-[0_10px_24px_rgba(23,32,51,0.06)] transition hover:border-command/25 hover:bg-command/8 sm:max-w-[260px]",
                  pathname === "/profile" ? "border-command/30" : null,
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d4ed8,#0891b2)] text-xs font-bold text-white">
                  {initials || "ME"}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-36 truncate text-sm font-semibold text-command">
                    {session.name}
                  </span>
                  <span className="block truncate text-[11px] uppercase tracking-[0.16em] text-command-soft/65">
                    {session.role} profile
                  </span>
                </span>
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                disabled={isSigningOut}
              >
                {isSigningOut ? "Signing out" : "Logout"}
              </Button>
            </div>
          ) : (
            <>
              <Button href="/login" variant="secondary" size="sm">
                Login
              </Button>
              <Button href="/register" size="sm">
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
