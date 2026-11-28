"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Compass, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { ComicCard } from "./ComicCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiRequest } from "@/lib/http/client-api";
import type { PaginationMeta } from "@/types/api";
import type { CatalogSort, ComicSummary, GenreCatalog, GenreItem } from "@/types/comic";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "manga", label: "Manga" },
  { value: "manhwa", label: "Manhwa" },
  { value: "manhua", label: "Manhua" }
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "releasing", label: "Releasing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
  { value: "cancelled", label: "Cancelled" }
] as const;

const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: "chapter_updated_at:desc", label: "Latest Updated" },
  { value: "views_7d:desc", label: "Popular (7d)" },
  { value: "views_30d:desc", label: "Popular (30d)" },
  { value: "views_total:desc", label: "All-Time Views" },
  { value: "score:desc", label: "Highest Score" },
  { value: "follows_total:desc", label: "Most Followed" },
  { value: "created_at:desc", label: "Recently Added" },
  { value: "title:asc", label: "Title A–Z" }
];

export function ExploreCatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const genre = searchParams.get("genre") || "";
  const sort = (searchParams.get("sort") as CatalogSort) || "chapter_updated_at:desc";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [items, setItems] = useState<ComicSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      if (!("page" in updates)) {
        next.delete("page");
      }
      const query = next.toString();
      router.replace(query ? `/explore?${query}` : "/explore", { scroll: true });
    },
    [router, searchParams]
  );

  useEffect(() => {
    let active = true;
    apiRequest<GenreCatalog>("/api/comics/genres")
      .then((res) => {
        if (active) {
          setGenres(res.data.genres);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (genre) params.set("genre", genre);
    params.set("sort", sort);
    params.set("page", String(page));

    try {
      const res = await apiRequest<ComicSummary[]>(`/api/comics/filter?${params.toString()}`);
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load catalog.");
    } finally {
      setLoading(false);
    }
  }, [type, status, genre, sort, page]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const hasActiveFilters = Boolean(type || status || genre || sort !== "chapter_updated_at:desc");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Explore Catalog</h1>
        </div>
        <p className="text-sm text-ink-secondary">
          Filter manga, manhwa, and manhua by format, status, genre, and sort order.
        </p>
      </header>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filters &amp; Sorting
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-secondary">
            Format
            <select
              value={type}
              onChange={(event) => updateParams({ type: event.target.value })}
              className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink focus:border-accent"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-secondary">
            Status
            <select
              value={status}
              onChange={(event) => updateParams({ status: event.target.value })}
              className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink focus:border-accent"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-secondary">
            Genre
            <select
              value={genre}
              onChange={(event) => updateParams({ genre: event.target.value })}
              className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink focus:border-accent"
            >
              <option value="">All Genres</option>
              {genres.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-secondary">
            Sort By
            <select
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
              className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink focus:border-accent"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {type ? (
              <button type="button" onClick={() => updateParams({ type: null })}>
                <Badge tone="accent" className="cursor-pointer capitalize">
                  {type}
                  <X className="h-3 w-3" aria-hidden="true" />
                </Badge>
              </button>
            ) : null}
            {status ? (
              <button type="button" onClick={() => updateParams({ status: null })}>
                <Badge tone="accent" className="cursor-pointer capitalize">
                  {status}
                  <X className="h-3 w-3" aria-hidden="true" />
                </Badge>
              </button>
            ) : null}
            {genre ? (
              <button type="button" onClick={() => updateParams({ genre: null })}>
                <Badge tone="accent" className="cursor-pointer capitalize">
                  {genre}
                  <X className="h-3 w-3" aria-hidden="true" />
                </Badge>
              </button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.replace("/explore")}
              className="h-7 px-2.5 text-xs"
            >
              Reset all
            </Button>
          </div>
        ) : null}
      </Card>

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
          <Button variant="secondary" size="sm" onClick={() => void loadCatalog()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-6 w-6" aria-hidden="true" />}
          title="No matching comics found"
          description="Try adjusting your format, status, or genre filters."
          action={
            <Button variant="secondary" onClick={() => router.replace("/explore")}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((comic) => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <nav
              aria-label="Catalog pagination"
              className="flex items-center justify-between gap-4 border-t border-border pt-4"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() => updateParams({ page: Math.max(1, page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
              <span className="text-xs font-medium text-ink-secondary">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => updateParams({ page: page + 1 })}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
