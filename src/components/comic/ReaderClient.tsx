"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { CommentSection } from "./CommentSection";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { filterChapters } from "@/lib/omnify/chapter-filter";
import {
  DEFAULT_USER_PREFERENCES,
  getUserPreferences,
  saveUserPreferences,
  upsertHistoryEntry
} from "@/services/user-data";
import type {
  AdjacentChapterRef,
  NormalizedChapter,
  ReaderChapterData
} from "@/types/chapter";
import type { PageFitMode, ReadingDirection, ReadingMode } from "@/types/user";

export interface ReaderClientProps {
  comicId: string;
  comicTitle: string;
  comicPosterUrl: string | null;
  activeLanguage: string;
  chapter: ReaderChapterData;
  languageChapters: NormalizedChapter[];
  prevChapter: AdjacentChapterRef | null;
  nextChapter: AdjacentChapterRef | null;
}

const LOCAL_PREFS_KEY = "adivo-reader-preferences";

export function ReaderClient({
  comicId,
  comicTitle,
  comicPosterUrl,
  activeLanguage,
  chapter,
  languageChapters,
  prevChapter,
  nextChapter
}: ReaderClientProps) {
  const { user } = useAuth();
  const [focusMode, setFocusMode] = useState(false);
  const [readingMode, setReadingMode] = useState<ReadingMode>(DEFAULT_USER_PREFERENCES.readingMode);
  const [pageFit, setPageFit] = useState<PageFitMode>(DEFAULT_USER_PREFERENCES.pageFit);
  const [direction, setDirection] = useState<ReadingDirection>(
    DEFAULT_USER_PREFERENCES.readingDirection
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [chapterFilter, setChapterFilter] = useState("");
  const [failedPages, setFailedPages] = useState<Record<number, number>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<{
          readingMode: ReadingMode;
          pageFit: PageFitMode;
          readingDirection: ReadingDirection;
          autoFocusMode: boolean;
        }>;
        if (parsed.readingMode) setReadingMode(parsed.readingMode);
        if (parsed.pageFit) setPageFit(parsed.pageFit);
        if (parsed.readingDirection) setDirection(parsed.readingDirection);
        if (parsed.autoFocusMode) setFocusMode(true);
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    getUserPreferences(user.uid)
      .then((prefs) => {
        if (!prefs) return;
        setReadingMode(prefs.readingMode);
        setPageFit(prefs.pageFit);
        setDirection(prefs.readingDirection);
        if (prefs.autoFocusMode) setFocusMode(true);
      })
      .catch(() => {});
  }, [user]);

  const persistReaderPrefs = useCallback(
    (next: { readingMode: ReadingMode; pageFit: PageFitMode; readingDirection: ReadingDirection }) => {
      try {
        window.localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(next));
      } catch {
        return;
      }
      if (!user) return;
      getUserPreferences(user.uid)
        .then((existing) =>
          saveUserPreferences(user.uid, {
            theme: existing?.theme ?? DEFAULT_USER_PREFERENCES.theme,
            readingMode: next.readingMode,
            pageFit: next.pageFit,
            readingDirection: next.readingDirection,
            autoFocusMode: existing?.autoFocusMode ?? false,
            reducedMotion: existing?.reducedMotion ?? false,
            updatedAt: Date.now()
          })
        )
        .catch(() => {});
    },
    [user]
  );

  useEffect(() => {
    if (!user || chapter.totalPages < 1) {
      return;
    }
    const safeLang =
      activeLanguage && activeLanguage !== "all" && activeLanguage.length >= 2
        ? activeLanguage
        : "unknown";
    const timer = window.setTimeout(() => {
      void upsertHistoryEntry(user.uid, {
        comicId,
        title: comicTitle.slice(0, 200),
        posterUrl: comicPosterUrl,
        chapterRawId: chapter.rawId,
        chapterLabel: chapter.displayLabel.slice(0, 80),
        chapterNumber: chapter.chapterNumber,
        language: safeLang,
        pageNumber: Math.max(1, Math.min(currentPage, chapter.totalPages)),
        totalPages: chapter.totalPages,
        updatedAt: Date.now()
      }).catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    user,
    comicId,
    comicTitle,
    comicPosterUrl,
    chapter.rawId,
    chapter.displayLabel,
    chapter.chapterNumber,
    chapter.totalPages,
    activeLanguage,
    currentPage
  ]);

  const pageStep = readingMode === "double" ? 2 : 1;

  const goNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(chapter.totalPages, prev + pageStep));
  }, [chapter.totalPages, pageStep]);

  const goPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - pageStep));
  }, [pageStep]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }
      if (event.key === "f" || event.key === "F") {
        setFocusMode((prev) => !prev);
      } else if (readingMode !== "vertical") {
        if (event.key === "ArrowRight") {
          if (direction === "rtl") goPrevPage();
          else goNextPage();
        } else if (event.key === "ArrowLeft") {
          if (direction === "rtl") goNextPage();
          else goPrevPage();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readingMode, direction, goNextPage, goPrevPage]);

  const filteredSheetChapters = useMemo(
    () => filterChapters(languageChapters, chapterFilter),
    [languageChapters, chapterFilter]
  );

  const visiblePages = useMemo(() => {
    if (readingMode === "vertical") {
      return chapter.pages;
    }
    const startIndex = Math.max(0, currentPage - 1);
    return chapter.pages.slice(startIndex, startIndex + pageStep);
  }, [readingMode, chapter.pages, currentPage, pageStep]);

  const imageFitClass =
    pageFit === "height"
      ? "max-h-[85vh] w-auto mx-auto object-contain"
      : pageFit === "original"
        ? "h-auto w-auto max-w-none mx-auto"
        : "w-full h-auto";

  const chapterHref = (targetRawId: string) =>
    `/read/${encodeURIComponent(comicId)}/${encodeURIComponent(targetRawId)}?lang=${encodeURIComponent(activeLanguage)}`;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      {!focusMode ? (
        <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={`/comic/${encodeURIComponent(comicId)}`}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-ink-secondary hover:bg-surface-elevated hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Series</span>
              </Link>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-ink">
                  {comicTitle}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {chapter.displayLabel}
                  {chapter.title ? ` · ${chapter.title}` : ""}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Chapter list"
                onClick={() => setChaptersOpen(true)}
              >
                <List className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reader settings"
                onClick={() => setSettingsOpen(true)}
              >
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Enable focus mode"
                onClick={() => setFocusMode(true)}
              >
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>
      ) : (
        <div className="fixed right-4 top-4 z-40">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Exit focus mode"
            onClick={() => setFocusMode(false)}
            className="bg-surface/85 shadow-floating backdrop-blur-md"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Show controls
          </Button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-2 py-6 sm:px-4">
        {chapter.pages.length === 0 ? (
          <Card className="w-full p-8 text-center">
            <p className="text-sm text-ink-secondary">
              No valid chapter pages were returned for this chapter.
            </p>
          </Card>
        ) : (
          <div
            onClick={() => setFocusMode((prev) => !prev)}
            className={`w-full cursor-pointer select-none overflow-x-auto ${
              readingMode === "double"
                ? "grid grid-cols-1 gap-2 md:grid-cols-2"
                : "flex flex-col items-center gap-1"
            }`}
          >
            {visiblePages.map((page) => {
              const retryToken = failedPages[page.pageNumber] || 0;
              const isFailed = retryToken < 0;
              return (
                <div
                  key={`${page.pageNumber}-${retryToken}`}
                  className="relative flex w-full justify-center bg-surface-subtle/40"
                >
                  {isFailed ? (
                    <div
                      onClick={(event) => event.stopPropagation()}
                      className="flex flex-col items-center gap-3 py-16 text-center"
                    >
                      <p className="text-xs text-ink-secondary">
                        Page {page.pageNumber} failed to load.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setFailedPages((prev) => ({
                            ...prev,
                            [page.pageNumber]: Math.abs(retryToken) + 1
                          }))
                        }
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Retry page
                      </Button>
                    </div>
                  ) : (
                    <Image
                      src={page.imageUrl}
                      alt={`${comicTitle} ${chapter.displayLabel} page ${page.pageNumber}`}
                      width={900}
                      height={1400}
                      unoptimized
                      priority={page.pageNumber <= 2}
                      loading={page.pageNumber <= 2 ? "eager" : "lazy"}
                      onLoad={() => {
                        if (readingMode === "vertical" && page.pageNumber > currentPage) {
                          setCurrentPage(page.pageNumber);
                        }
                      }}
                      onError={() =>
                        setFailedPages((prev) => ({
                          ...prev,
                          [page.pageNumber]: -(Math.abs(prev[page.pageNumber] || 0) + 1)
                        }))
                      }
                      className={imageFitClass}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {readingMode !== "vertical" && chapter.totalPages > 1 ? (
          <div className="mt-4 flex items-center gap-3">
            <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={goPrevPage}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Prev page
            </Button>
            <span className="text-xs font-medium text-ink-secondary">
              Page {currentPage} / {chapter.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage + pageStep - 1 >= chapter.totalPages}
              onClick={goNextPage}
            >
              Next page
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}

        <div className="mt-10 w-full max-w-3xl border-t border-border pt-8">
          <CommentSection
            scope="chapter"
            comicId={comicId}
            chapterRawId={chapter.rawId}
            heading={`Comments · ${chapter.displayLabel}`}
          />
        </div>
      </main>

      {!focusMode ? (
        <footer className="sticky bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-5">
            {prevChapter ? (
              <Link
                href={chapterHref(prevChapter.rawId)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-3 text-xs font-medium text-ink hover:border-accent sm:text-sm"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span className="truncate">{prevChapter.displayLabel}</span>
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center gap-1.5 px-3 text-xs text-ink-muted">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                First chapter
              </span>
            )}

            <span className="text-xs font-medium text-ink-secondary">
              {chapter.totalPages > 0 ? `${currentPage} / ${chapter.totalPages}` : chapter.displayLabel}
            </span>

            {nextChapter ? (
              <Link
                href={chapterHref(nextChapter.rawId)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-medium text-accent-foreground hover:bg-accent-hover sm:text-sm"
              >
                <span className="truncate">{nextChapter.displayLabel}</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center gap-1.5 px-3 text-xs text-ink-muted">
                Latest chapter
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
          </div>
        </footer>
      ) : null}

      <Sheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Reader Settings"
        variant="bottom"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Reading Mode
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["vertical", "single", "double"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setReadingMode(mode);
                    persistReaderPrefs({
                      readingMode: mode,
                      pageFit,
                      readingDirection: direction
                    });
                  }}
                  className={`h-10 rounded-xl border text-xs font-medium capitalize transition-colors ${
                    readingMode === mode
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-canvas text-ink-secondary hover:text-ink"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Page Fit
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["width", "height", "original"] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => {
                    setPageFit(fit);
                    persistReaderPrefs({
                      readingMode,
                      pageFit: fit,
                      readingDirection: direction
                    });
                  }}
                  className={`h-10 rounded-xl border text-xs font-medium capitalize transition-colors ${
                    pageFit === fit
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-canvas text-ink-secondary hover:text-ink"
                  }`}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Page Direction
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "ltr", label: "Left to Right" },
                  { value: "rtl", label: "Right to Left" }
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setDirection(item.value);
                    persistReaderPrefs({
                      readingMode,
                      pageFit,
                      readingDirection: item.value
                    });
                  }}
                  className={`h-10 rounded-xl border text-xs font-medium transition-colors ${
                    direction === item.value
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-canvas text-ink-secondary hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-ink">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </Sheet>

      <Sheet
        open={chaptersOpen}
        onClose={() => setChaptersOpen(false)}
        title={`Chapters (${activeLanguage.toUpperCase()})`}
        variant="bottom"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={chapterFilter}
              onChange={(event) => setChapterFilter(event.target.value)}
              placeholder="Jump to chapter..."
              aria-label="Filter chapter list"
              className="h-10 w-full rounded-xl border border-border bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent"
            />
          </div>

          {filteredSheetChapters.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-secondary">No matching chapters.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {filteredSheetChapters.map((item) => {
                const isCurrent = item.rawId === chapter.rawId;
                return (
                  <Link
                    key={item.rawId}
                    href={chapterHref(item.rawId)}
                    onClick={() => setChaptersOpen(false)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      isCurrent
                        ? "border-accent bg-accent-soft font-semibold text-accent"
                        : "border-border bg-canvas text-ink hover:border-border-strong"
                    }`}
                  >
                    <span className="truncate">{item.displayLabel}</span>
                    {item.uploadedAgo ? (
                      <span className="shrink-0 text-[11px] text-ink-muted">
                        {item.uploadedAgo}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
