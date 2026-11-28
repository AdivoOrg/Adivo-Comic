import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { LibraryClient } from "@/components/comic/LibraryClient";

export const metadata: Metadata = {
  title: "Library"
};

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Your Library</h1>
        </div>
        <p className="text-sm text-ink-secondary">
          Manage saved series across reading statuses.
        </p>
      </header>
      <LibraryClient />
    </div>
  );
}
