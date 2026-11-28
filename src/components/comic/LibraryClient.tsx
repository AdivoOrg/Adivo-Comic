"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, BookOpen, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  listLibraryEntries,
  removeLibraryEntry,
  upsertLibraryEntry
} from "@/services/user-data";
import type { LibraryEntry, LibraryStatus } from "@/types/user";

const STATUS_TABS: Array<{ value: "all" | LibraryStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "plan_to_read", label: "Plan to Read" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "dropped", label: "Dropped" }
];

export function LibraryClient() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<"all" | LibraryStatus>("all");
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLibraryEntries(user.uid);
      setEntries(data);
    } catch {
      setError("Unable to load your library right now.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void loadLibrary();
    }
  }, [authLoading, loadLibrary]);

  const filtered = useMemo(() => {
    if (activeStatus === "all") return entries;
    return entries.filter((entry) => entry.status === activeStatus);
  }, [entries, activeStatus]);

  async function handleStatusChange(entry: LibraryEntry, nextStatus: LibraryStatus) {
    if (!user) return;
    const updated: LibraryEntry = { ...entry, status: nextStatus, updatedAt: Date.now() };
    setEntries((prev) => prev.map((item) => (item.comicId === entry.comicId ? updated : item)));
    try {
      await upsertLibraryEntry(user.uid, updated);
    } catch {
      void loadLibrary();
    }
  }

  async function handleRemove(comicId: string) {
    if (!user) return;
    setEntries((prev) => prev.filter((item) => item.comicId !== comicId));
    try {
      await removeLibraryEntry(user.uid, comicId);
    } catch {
      void loadLibrary();
    }
  }

  if (authLoading || loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="flex gap-3 p-3">
            <Skeleton className="h-24 w-[72px] shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={<Bookmark className="h-6 w-6" aria-hidden="true" />}
        title="Sign in to view your Library"
        description="Save manga, manhwa, and manhua to sync your reading list across devices."
        action={
          <Link
            href="/auth?next=/library"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-surface p-1.5">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? entries.length
              : entries.filter((item) => item.status === tab.value).length;
          const active = activeStatus === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-ink-secondary hover:bg-surface-elevated hover:text-ink"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {error ? (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-ink-secondary">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadLibrary()}>
            Retry
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" aria-hidden="true" />}
          title="No comics in this list"
          description="Explore the catalog and bookmark series to organize your collection."
          action={
            <Link
              href="/explore"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Browse Explore
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <Card key={entry.comicId} className="flex gap-3.5 p-3.5">
              <Link
                href={`/comic/${encodeURIComponent(entry.comicId)}`}
                className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-subtle"
              >
                {entry.posterUrl ? (
                  <Image
                    src={entry.posterUrl}
                    alt={entry.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-muted">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </div>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div className="space-y-1">
                  <Link
                    href={`/comic/${encodeURIComponent(entry.comicId)}`}
                    className="line-clamp-2 font-display text-sm font-semibold text-ink hover:text-accent"
                  >
                    {entry.title}
                  </Link>
                  <Badge tone="neutral" className="capitalize">
                    {entry.comicType}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <select
                    aria-label={`Reading status for ${entry.title}`}
                    value={entry.status}
                    onChange={(event) =>
                      void handleStatusChange(entry, event.target.value as LibraryStatus)
                    }
                    className="h-9 flex-1 rounded-lg border border-border bg-canvas px-2 text-xs text-ink focus:border-accent"
                  >
                    {STATUS_TABS.filter((tab) => tab.value !== "all").map((tab) => (
                      <option key={tab.value} value={tab.value}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${entry.title} from library`}
                    onClick={() => void handleRemove(entry.comicId)}
                    className="h-9 w-9"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
