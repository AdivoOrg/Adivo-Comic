"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { BrandWordmark } from "./BrandWordmark";
import { NotificationFlyout } from "./NotificationFlyout";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/components/providers/AuthProvider";

export function TopBar() {
  const { user } = useAuth();
  const initial = user?.displayName?.trim().charAt(0).toUpperCase() || null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandWordmark height={26} priority />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <NotificationFlyout />
          <Link
            href={user ? "/profile" : "/auth"}
            aria-label={user ? "Open profile" : "Sign in"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-accent-soft text-sm font-semibold text-accent transition-colors hover:border-accent"
          >
            {initial ? initial : <UserRound className="h-5 w-5" aria-hidden="true" />}
          </Link>
        </div>
      </div>
    </header>
  );
}
