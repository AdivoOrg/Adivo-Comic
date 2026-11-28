import type { Metadata } from "next";
import { History } from "lucide-react";
import { HistoryClient } from "@/components/comic/HistoryClient";

export const metadata: Metadata = {
  title: "History"
};

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Reading History</h1>
        </div>
        <p className="text-sm text-ink-secondary">
          Resume any chapter right where you left off.
        </p>
      </header>
      <HistoryClient />
    </div>
  );
}
