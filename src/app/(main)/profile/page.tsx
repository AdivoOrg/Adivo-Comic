import type { Metadata } from "next";
import Link from "next/link";
import { Settings, UserRound } from "lucide-react";
import { ProfileClient } from "@/components/comic/ProfileClient";

export const metadata: Metadata = {
  title: "Profile"
};

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-accent" aria-hidden="true" />
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Profile</h1>
          </div>
          <p className="text-sm text-ink-secondary">
            Manage your public reader name and account summary.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-elevated"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
      </header>
      <ProfileClient />
    </div>
  );
}
