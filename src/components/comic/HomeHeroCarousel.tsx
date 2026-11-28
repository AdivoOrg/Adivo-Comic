"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ComicSummary } from "@/types/comic";

export interface HomeHeroCarouselProps {
  items: ComicSummary[];
}

export function HomeHeroCarousel({ items }: HomeHeroCarouselProps) {
  const slides = items.slice(0, 6);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (slides.length > 0 ? (prev + 1) % slides.length : 0));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) =>
      slides.length > 0 ? (prev - 1 + slides.length) % slides.length : 0
    );
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) {
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }
    const timer = window.setInterval(goNext, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused, goNext]);

  if (slides.length === 0) {
    return (
      <section
        aria-label="Featured spotlight"
        className="rounded-3xl border border-border bg-gradient-to-br from-surface-elevated via-surface to-accent-soft/60 p-6 sm:p-8 lg:p-10"
      >
        <div className="max-w-2xl space-y-4">
          <Badge tone="accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Featured Spotlight
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Discover manga, manhwa, and manhua on Adivo Comic.
          </h1>
          <p className="text-sm leading-relaxed text-ink-secondary sm:text-base">
            Spotlight titles will appear automatically once the catalog service is reachable.
          </p>
          <div className="pt-1">
            <Link
              href="/explore"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Explore catalog
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const current = slides[activeIndex] ?? slides[0];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured comics"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-elevated via-surface to-accent-soft/70 p-5 sm:p-7 lg:p-8"
    >
      <div className="grid items-end gap-6 md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr]">
        <Link
          href={`/comic/${encodeURIComponent(current.id)}`}
          className="relative mx-auto aspect-[3/4] w-44 overflow-hidden rounded-2xl border border-border-strong bg-surface-subtle shadow-floating sm:w-48 md:mx-0 md:w-full"
        >
          {current.posterUrl ? (
            <Image
              src={current.posterUrl}
              alt={current.title}
              fill
              priority
              sizes="(max-width: 768px) 192px, 220px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-muted">
              <BookOpen className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
        </Link>

        <div className="flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Spotlight #{activeIndex + 1}
              </Badge>
              <Badge tone="neutral" className="capitalize">
                {current.type}
              </Badge>
              <Badge tone="neutral" className="capitalize">
                {current.status}
              </Badge>
              {current.latestChapter !== null ? (
                <Badge tone="neutral">Ch. {current.latestChapter}</Badge>
              ) : null}
            </div>

            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl lg:text-4xl">
              {current.title}
            </h1>

            {current.synopsis ? (
              <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
                {current.synopsis}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/comic/${encodeURIComponent(current.id)}`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground shadow-soft transition-colors hover:bg-accent-hover"
              >
                View series
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
              >
                Explore all
              </Link>
            </div>

            {slides.length > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Previous featured comic"
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <div className="flex items-center gap-1.5 px-1" role="tablist" aria-label="Spotlight slides">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={index === activeIndex}
                      aria-label={`Show spotlight ${index + 1}: ${slide.title}`}
                      onClick={() => setActiveIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === activeIndex
                          ? "w-6 bg-accent"
                          : "w-2 bg-border-strong hover:bg-ink-muted"
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Next featured comic"
                  onClick={goNext}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
