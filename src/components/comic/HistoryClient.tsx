"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, History, Play, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { listHistoryEntries, removeHistoryEntry } from "@/services/user-data";
import type { HistoryEntry } from "@/types/user";

export function HistoryClient() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listHistoryEntries(user.uid);
      setEntries(data);
    } catch {
      setError("Unable to load your reading history right now.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void loadHistory();
    }
  }, [authLoading, loadHistory]);

  async function handleRemove(comicId: string) {
    if (!user) return;
    setEntries((prev) => prev.filter((item) => item.comicId !== comicId));
    try {
      await removeHistoryEntry(user.uid, comicId);
    } catch {
      void loadHistory();
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="flex gap-3.5 p-3.5">
            <Skeleton className="h-24 w-[72px] shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" aria-hidden="true" />}
        title="Sign in to track Reading History"
        description="Your last read chapter and page progress sync automatically when signed in."
        action={
          <Link
            href="/auth?next=/history"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (error) {
    return (
      <Card className="flex items-center justify-between gap-3 p-4">
        <p className="text-sm text-ink-secondary">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => void loadHistory()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" aria-hidden="true" />}
        title="No reading history yet"
        description="Open any chapter in the reader and your progress will appear here."
        action={
          <Link
            href="/explore"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Start reading
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const progressPercent = Math.min(
          100,
          Math.max(0, Math.round((entry.pageNumber / Math.max(1, entry.totalPages)) * 100))
        );
        const resumeHref = `/read/${encodeURIComponent(entry.comicId)}/${encodeURIComponent(entry.chapterRawId)}?lang=${encodeURIComponent(entry.language)}`;

        return (
          <Card key={entry.comicId} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
            <Link
              href={`/comic/${encodeURIComponent(entry.comicId)}`}
              className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-subtle"
            >
              {entry.posterUrl ? (
                <Image
                  src={entry.posterUrl}
                  alt={entry.title}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-muted">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </div>
              )}
            </Link>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/comic/${encodeURIComponent(entry.comicId)}`}
                  className="truncate font-display text-sm font-semibold text-ink hover:text-accent"
                >
                  {entry.title}
                </Link>
                <Badge tone="accent">{entry.chapterLabel}</Badge>
                <Badge tone="neutral" className="uppercase">
                  {entry.language}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>
                    Page {entry.pageNumber} of {entry.totalPages}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={resumeHref}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Resume
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${entry.title} from history`}
                onClick={() => void handleRemove(entry.comicId)}
                className="h-10 w-10"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
