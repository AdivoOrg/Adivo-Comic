"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, RotateCcw, Search, X } from "lucide-react";
import { ComicCard } from "./ComicCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiRequest } from "@/lib/http/client-api";
import type { PaginationMeta } from "@/types/api";
import type { ComicSuggestion, ComicSummary } from "@/types/comic";

export function SearchCatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const committedQuery = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const [inputValue, setInputValue] = useState(committedQuery);
  const [suggestions, setSuggestions] = useState<ComicSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState<ComicSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(committedQuery);
  }, [committedQuery]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiRequest<ComicSuggestion[]>(
          `/api/comics/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        setSuggestions(res.data.slice(0, 6));
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue]);

  const executeSearch = useCallback(async () => {
    const trimmed = committedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setPagination(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<ComicSummary[]>(
        `/api/comics/search?q=${encodeURIComponent(trimmed)}&page=${page}`
      );
      setResults(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search request failed.");
    } finally {
      setLoading(false);
    }
  }, [committedQuery, page]);

  useEffect(() => {
    void executeSearch();
  }, [executeSearch]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    setShowSuggestions(false);
    if (!trimmed) {
      router.replace("/search");
      return;
    }
    router.replace(`/search?q=${encodeURIComponent(trimmed)}&page=1`);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Search Comics</h1>
        </div>
        <p className="text-sm text-ink-secondary">
          Find manga, manhwa, and manhua by title with live suggestions.
        </p>
      </header>

      <div className="relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={inputValue}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 180)}
              onChange={(event) => {
                setInputValue(event.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search titles (e.g., Solo, Emperor, Sword)..."
              aria-label="Search comics"
              className="h-12 w-full rounded-2xl border border-border bg-surface pl-10 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-accent"
            />
            {inputValue ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setInputValue("");
                  setSuggestions([]);
                  router.replace("/search");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <Button type="submit" size="lg">
            Search
          </Button>
        </form>

        {showSuggestions && suggestions.length > 0 ? (
          <Card
            elevated
            className="absolute left-0 right-0 top-14 z-30 overflow-hidden p-1.5"
          >
            <ul role="listbox" aria-label="Search suggestions" className="space-y-1">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/comic/${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-subtle"
                  >
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-surface-subtle">
                      {item.posterUrl ? (
                        <Image
                          src={item.posterUrl}
                          alt={item.title}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-muted">
                          <BookOpen className="h-4 w-4" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                      <p className="text-xs capitalize text-ink-muted">
                        {item.type}
                        {item.latestChapter !== null ? ` · Ch. ${item.latestChapter}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      {!committedQuery ? (
        <EmptyState
          icon={<Search className="h-6 w-6" aria-hidden="true" />}
          title="Start searching"
          description="Type at least two characters to preview instant title suggestions, or submit a full search."
        />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Card key={index} className="space-y-3 p-3">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-4/5" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-ink-secondary">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void executeSearch()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </Card>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" aria-hidden="true" />}
          title={`No results for "${committedQuery}"`}
          description="Try a shorter keyword or check the Explore catalog by genre."
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
        <div className="space-y-4">
          <p className="text-xs font-medium text-ink-muted">
            Showing results for <span className="text-ink">&ldquo;{committedQuery}&rdquo;</span>
            {pagination ? ` (${pagination.totalItems} found)` : ""}
          </p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.map((comic) => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <nav
              aria-label="Search pagination"
              className="flex items-center justify-between gap-4 border-t border-border pt-4"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() =>
                  router.replace(
                    `/search?q=${encodeURIComponent(committedQuery)}&page=${Math.max(1, page - 1)}`
                  )
                }
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
                onClick={() =>
                  router.replace(
                    `/search?q=${encodeURIComponent(committedQuery)}&page=${page + 1}`
                  )
                }
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}
