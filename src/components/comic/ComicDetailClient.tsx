"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Filter,
  Globe,
  Play,
  Search,
  X
} from "lucide-react";
import { ComicCard } from "./ComicCard";
import { CommentSection } from "./CommentSection";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiRequest } from "@/lib/http/client-api";
import { filterChapters } from "@/lib/omnify/chapter-filter";
import {
  listHistoryEntries,
  listLibraryEntries,
  removeLibraryEntry,
  upsertLibraryEntry
} from "@/services/user-data";
import type { PaginationMeta } from "@/types/api";
import type { ChapterLanguageGroup, GroupedChaptersResponse } from "@/types/chapter";
import type { ComicDetail } from "@/types/comic";
import type { HistoryEntry, LibraryEntry, LibraryStatus } from "@/types/user";

export interface ComicDetailClientProps {
  comic: ComicDetail;
  initialChapters: GroupedChaptersResponse;
  initialPagination: PaginationMeta | null;
}

const LIBRARY_STATUS_OPTIONS: Array<{ value: LibraryStatus; label: string }> = [
  { value: "reading", label: "Reading" },
  { value: "plan_to_read", label: "Plan to Read" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "dropped", label: "Dropped" }
];

function mergeLanguageGroups(
  baseGroups: ChapterLanguageGroup[],
  incomingGroups: ChapterLanguageGroup[]
): ChapterLanguageGroup[] {
  const byLanguage = new Map<string, ChapterLanguageGroup>();

  for (const group of baseGroups) {
    byLanguage.set(group.language, {
      ...group,
      chapters: [...group.chapters]
    });
  }

  for (const group of incomingGroups) {
    const existing = byLanguage.get(group.language);
    if (!existing) {
      byLanguage.set(group.language, {
        ...group,
        chapters: [...group.chapters]
      });
      continue;
    }
    const seen = new Set(existing.chapters.map((c) => c.rawId));
    for (const ch of group.chapters) {
      if (!seen.has(ch.rawId)) {
        existing.chapters.push(ch);
        seen.add(ch.rawId);
      }
    }
    existing.chapters.sort((a, b) =>
      b.sortKey !== a.sortKey ? b.sortKey - a.sortKey : a.rawId.localeCompare(b.rawId)
    );
    existing.totalCount = existing.chapters.length;
  }

  return Array.from(byLanguage.values());
}

export function ComicDetailClient({
  comic,
  initialChapters,
  initialPagination
}: ComicDetailClientProps) {
  const { user } = useAuth();
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [groups, setGroups] = useState<ChapterLanguageGroup[]>(initialChapters.groups);
  const [pagination, setPagination] = useState<PaginationMeta | null>(initialPagination);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>(
    initialChapters.defaultLanguage || initialChapters.groups[0]?.language || ""
  );
  const [chapterQuery, setChapterQuery] = useState("");
  const [libraryEntry, setLibraryEntry] = useState<LibraryEntry | null>(null);
  const [historyEntry, setHistoryEntry] = useState<HistoryEntry | null>(null);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [libraryFeedback, setLibraryFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLibraryEntry(null);
      setHistoryEntry(null);
      return;
    }
    let active = true;
    Promise.all([listLibraryEntries(user.uid), listHistoryEntries(user.uid)])
      .then(([libraryList, historyList]) => {
        if (!active) return;
        setLibraryEntry(libraryList.find((item) => item.comicId === comic.id) || null);
        setHistoryEntry(historyList.find((item) => item.comicId === comic.id) || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, comic.id]);

  const activeGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.find((group) => group.language === selectedLang) || groups[0];
  }, [groups, selectedLang]);

  const filteredChapters = useMemo(() => {
    if (!activeGroup) return [];
    return filterChapters(activeGroup.chapters, chapterQuery);
  }, [activeGroup, chapterQuery]);

  const firstChapter = activeGroup?.chapters[activeGroup.chapters.length - 1] || null;
  const hasLongSynopsis = comic.synopsis.length > 260;

  async function handleToggleBookmark(status: LibraryStatus = "reading") {
    if (!user) {
      setLibraryFeedback("Sign in to save comics to your library.");
      return;
    }
    setSavingLibrary(true);
    setLibraryFeedback(null);
    try {
      if (libraryEntry && libraryEntry.status === status) {
        await removeLibraryEntry(user.uid, comic.id);
        setLibraryEntry(null);
        setLibraryFeedback("Removed from library.");
      } else {
        const now = Date.now();
        const nextEntry: LibraryEntry = {
          comicId: comic.id,
          title: comic.title.slice(0, 200),
          posterUrl: comic.posterUrl,
          comicType: comic.type,
          status,
          addedAt: libraryEntry?.addedAt ?? now,
          updatedAt: now
        };
        await upsertLibraryEntry(user.uid, nextEntry);
        setLibraryEntry(nextEntry);
        setLibraryFeedback("Saved to library.");
      }
    } catch {
      setLibraryFeedback("Unable to update library right now.");
    } finally {
      setSavingLibrary(false);
    }
  }

  async function handleLoadMoreChapters() {
    if (!pagination?.hasNextPage || !pagination.nextPage || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const res = await apiRequest<GroupedChaptersResponse>(
        `/api/comics/${encodeURIComponent(comic.id)}/chapters?page=${pagination.nextPage}&perPage=100`
      );
      setGroups((prev) => mergeLanguageGroups(prev, res.data.groups));
      setPagination(res.pagination);
    } catch {
      setLibraryFeedback("Could not load more chapters right now.");
    } finally {
      setLoadingMore(false);
    }
  }

  const readCtaHref = historyEntry
    ? `/read/${encodeURIComponent(comic.id)}/${encodeURIComponent(historyEntry.chapterRawId)}?lang=${encodeURIComponent(historyEntry.language)}`
    : firstChapter && activeGroup
      ? `/read/${encodeURIComponent(comic.id)}/${encodeURIComponent(firstChapter.rawId)}?lang=${encodeURIComponent(activeGroup.language)}`
      : null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-elevated via-surface to-accent-soft/60 p-5 sm:p-7 lg:p-8">
        <div className="grid gap-6 md:grid-cols-[200px_1fr] lg:grid-cols-[230px_1fr]">
          <div className="relative mx-auto aspect-[3/4] w-44 overflow-hidden rounded-2xl border border-border-strong bg-surface-subtle shadow-floating sm:w-48 md:mx-0 md:w-full">
            {comic.posterUrl ? (
              <Image
                src={comic.posterUrl}
                alt={comic.title}
                fill
                priority
                sizes="(max-width: 768px) 192px, 230px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-muted">
                <BookOpen className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent" className="capitalize">
                  {comic.type}
                </Badge>
                <Badge tone="neutral" className="capitalize">
                  {comic.status}
                </Badge>
                {comic.year ? <Badge tone="neutral">{comic.year}</Badge> : null}
                {comic.latestChapter !== null ? (
                  <Badge tone="neutral">Latest Ch. {comic.latestChapter}</Badge>
                ) : null}
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
                {comic.title}
              </h1>

              {comic.altTitles.length > 0 ? (
                <p className="text-xs text-ink-muted">
                  Also known as: {comic.altTitles.slice(0, 3).join(" · ")}
                </p>
              ) : null}

              {(comic.authors.length > 0 || comic.artists.length > 0) ? (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-secondary">
                  {comic.authors.length > 0 ? (
                    <span>
                      <strong className="font-semibold text-ink">Author:</strong>{" "}
                      {comic.authors.map((a) => a.name).join(", ")}
                    </span>
                  ) : null}
                  {comic.artists.length > 0 ? (
                    <span>
                      <strong className="font-semibold text-ink">Artist:</strong>{" "}
                      {comic.artists.map((a) => a.name).join(", ")}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {comic.genres.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {comic.genres.map((genre) => (
                    <Link
                      key={genre.slug}
                      href={`/explore?genre=${encodeURIComponent(genre.slug)}`}
                      className="rounded-lg border border-border bg-surface/80 px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:border-accent hover:text-accent"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {readCtaHref ? (
                <Link
                  href={readCtaHref}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground shadow-soft transition-colors hover:bg-accent-hover"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {historyEntry ? `Continue ${historyEntry.chapterLabel}` : "Start reading"}
                </Link>
              ) : null}

              <Button
                variant={libraryEntry ? "secondary" : "secondary"}
                disabled={savingLibrary}
                onClick={() => void handleToggleBookmark(libraryEntry?.status || "reading")}
              >
                {libraryEntry ? (
                  <BookmarkCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                ) : (
                  <Bookmark className="h-4 w-4" aria-hidden="true" />
                )}
                {libraryEntry ? "In Library" : "Save to Library"}
              </Button>

              {libraryEntry ? (
                <select
                  aria-label="Library reading status"
                  value={libraryEntry.status}
                  disabled={savingLibrary}
                  onChange={(event) =>
                    void handleToggleBookmark(event.target.value as LibraryStatus)
                  }
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-ink focus:border-accent"
                >
                  {LIBRARY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {libraryFeedback ? (
              <p role="status" className="text-xs text-ink-secondary">
                {libraryFeedback}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {comic.synopsis ? (
        <section aria-labelledby="synopsis-heading" className="space-y-2.5">
          <h2 id="synopsis-heading" className="font-display text-lg font-semibold text-ink">
            Synopsis
          </h2>
          <Card className="p-5">
            <p
              className={`whitespace-pre-line text-sm leading-relaxed text-ink-secondary ${
                !synopsisExpanded && hasLongSynopsis ? "line-clamp-4" : ""
              }`}
            >
              {comic.synopsis}
            </p>
            {hasLongSynopsis ? (
              <button
                type="button"
                onClick={() => setSynopsisExpanded((prev) => !prev)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                {synopsisExpanded ? (
                  <>
                    Show less
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Read more
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            ) : null}
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="chapters-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="chapters-heading" className="font-display text-xl font-semibold text-ink">
            Chapters
          </h2>

          {groups.length > 0 ? (
            <div
              role="tablist"
              aria-label="Chapter language groups"
              className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface p-1"
            >
              <span className="inline-flex items-center gap-1 px-2 text-xs text-ink-muted">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                Language
              </span>
              {groups.map((group) => {
                const active = activeGroup?.language === group.language;
                return (
                  <button
                    key={group.language}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSelectedLang(group.language);
                      setChapterQuery("");
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-ink-secondary hover:bg-surface-elevated hover:text-ink"
                    }`}
                  >
                    {group.label} ({group.totalCount})
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {activeGroup ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={chapterQuery}
                  onChange={(event) => setChapterQuery(event.target.value)}
                  placeholder="Filter by chapter number (e.g., 12, 12.5) or title..."
                  aria-label="Filter chapters"
                  className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-accent"
                />
                {chapterQuery ? (
                  <button
                    type="button"
                    aria-label="Clear chapter filter"
                    onClick={() => setChapterQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-muted hover:text-ink"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              {chapterQuery.trim() ? (
                <Badge tone="accent" className="h-9 px-3">
                  <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  Filter: &ldquo;{chapterQuery.trim()}&rdquo; · {filteredChapters.length} match
                  {filteredChapters.length === 1 ? "" : "es"}
                </Badge>
              ) : null}
            </div>

            {filteredChapters.length === 0 ? (
              <Card className="p-6 text-center text-sm text-ink-secondary">
                No chapters match &ldquo;{chapterQuery.trim()}&rdquo; in {activeGroup.label}.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredChapters.map((chapter) => {
                  const isLastRead = historyEntry?.chapterRawId === chapter.rawId;
                  return (
                    <Link
                      key={chapter.rawId}
                      href={`/read/${encodeURIComponent(comic.id)}/${encodeURIComponent(chapter.rawId)}?lang=${encodeURIComponent(activeGroup.language)}`}
                      className={`group flex flex-col justify-between gap-1 rounded-xl border p-3.5 transition-colors hover:border-accent hover:bg-surface-elevated ${
                        isLastRead
                          ? "border-accent bg-accent-soft/40"
                          : "border-border bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-semibold text-ink group-hover:text-accent">
                          {chapter.displayLabel}
                        </span>
                        {chapter.uploadedAgo ? (
                          <span className="shrink-0 text-[11px] text-ink-muted">
                            {chapter.uploadedAgo}
                          </span>
                        ) : null}
                      </div>
                      {chapter.title ? (
                        <p className="truncate text-xs text-ink-secondary">{chapter.title}</p>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}

            {pagination?.hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  disabled={loadingMore}
                  onClick={() => void handleLoadMoreChapters()}
                >
                  {loadingMore ? "Loading chapters..." : "Load more chapters"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-ink-secondary">
            No chapters are available for this series yet.
          </Card>
        )}
      </section>

      {comic.recommendations.length > 0 ? (
        <section aria-labelledby="recommendations-heading" className="space-y-4">
          <h2 id="recommendations-heading" className="font-display text-xl font-semibold text-ink">
            Related Series
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {comic.recommendations.slice(0, 5).map((item) => (
              <ComicCard key={item.id} comic={item} />
            ))}
          </div>
        </section>
      ) : null}

      <CommentSection scope="comic" comicId={comic.id} />
    </div>
  );
}
