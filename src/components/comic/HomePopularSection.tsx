"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, RotateCcw } from "lucide-react";
import { ComicCard } from "./ComicCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiRequest } from "@/lib/http/client-api";
import type { ComicSummary, PopularPeriod } from "@/types/comic";

const PERIOD_TABS: Array<{ value: PopularPeriod; label: string }> = [
  { value: "trending", label: "Trending" },
  { value: "follows", label: "Most Followed" }
];

export interface HomePopularSectionProps {
  initialItems: ComicSummary[];
  initialError?: string | null;
}

export function HomePopularSection({
  initialItems,
  initialError = null
}: HomePopularSectionProps) {
  const [period, setPeriod] = useState<PopularPeriod>("trending");
  const [cache, setCache] = useState<Partial<Record<PopularPeriod, ComicSummary[]>>>(() =>
    initialItems.length > 0 ? { trending: initialItems } : {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function selectPeriod(nextPeriod: PopularPeriod) {
    setPeriod(nextPeriod);
    if (cache[nextPeriod]) {
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<ComicSummary[]>(
        `/api/comics/popular?period=${encodeURIComponent(nextPeriod)}&page=1`
      );
      setCache((prev) => ({ ...prev, [nextPeriod]: res.data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load popular comics.");
    } finally {
      setLoading(false);
    }
  }

  const activeItems = (cache[period] || []).slice(0, 10);

  return (
    <section aria-labelledby="popular-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Flame className="h-5 w-5 text-accent" aria-hidden="true" />
          <h2 id="popular-heading" className="font-display text-xl font-semibold text-ink">
            Popular &amp; Trending
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface p-1">
            {PERIOD_TABS.map((tab) => {
              const active = period === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => void selectPeriod(tab.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-ink-secondary hover:bg-surface-elevated hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <Link
            href="/explore?sort=follows_total:desc"
            className="text-sm font-medium text-accent hover:underline"
          >
            View all
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Card key={index} className="space-y-3 p-3">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-ink-secondary">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void selectPeriod(period)}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </Card>
      ) : activeItems.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          No popular titles available for this period right now.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {activeItems.map((comic, index) => (
            <ComicCard key={comic.id} comic={comic} priority={index < 5} />
          ))}
        </div>
      )}
    </section>
  );
}
