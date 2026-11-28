import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { SettingsClient } from "@/components/comic/SettingsClient";

export const metadata: Metadata = {
  title: "Settings"
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Settings</h1>
        </div>
        <p className="text-sm text-ink-secondary">
          Customize appearance and default reader preferences.
        </p>
      </header>
      <SettingsClient />
    </div>
  );
}
