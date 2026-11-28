import Link from "next/link";
import { Clock, Tags } from "lucide-react";
import { ComicCard } from "@/components/comic/ComicCard";
import { HomeHeroCarousel } from "@/components/comic/HomeHeroCarousel";
import { HomePopularSection } from "@/components/comic/HomePopularSection";
import { Card } from "@/components/ui/Card";
import {
  fetchGenreCatalog,
  fetchLatestComics,
  fetchPopularComics
} from "@/services/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [popularResult, latestResult, genresResult] = await Promise.allSettled([
    fetchPopularComics("trending", 1),
    fetchLatestComics(1),
    fetchGenreCatalog()
  ]);

  const popularItems = popularResult.status === "fulfilled" ? popularResult.value.items : [];
  const popularError =
    popularResult.status === "rejected"
      ? "Catalog data is currently unavailable. Check server configuration or retry."
      : null;
  const latestItems =
    latestResult.status === "fulfilled" ? latestResult.value.items.slice(0, 10) : [];
  const genres =
    genresResult.status === "fulfilled" ? genresResult.value.genres.slice(0, 16) : [];

  return (
    <div className="space-y-10">
      <HomeHeroCarousel items={popularItems} />

      <HomePopularSection initialItems={popularItems} initialError={popularError} />

      <section aria-labelledby="latest-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 id="latest-heading" className="font-display text-xl font-semibold text-ink">
              Latest Releases
            </h2>
          </div>
          <Link
            href="/explore?sort=chapter_updated_at:desc"
            className="text-sm font-medium text-accent hover:underline"
          >
            Browse updates
          </Link>
        </div>

        {latestItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {latestItems.map((comic) => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-ink-secondary">
            Latest releases could not be loaded right now.
          </Card>
        )}
      </section>

      {genres.length > 0 ? (
        <section aria-labelledby="genres-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Tags className="h-5 w-5 text-accent" aria-hidden="true" />
              <h2 id="genres-heading" className="font-display text-xl font-semibold text-ink">
                Browse by Genre
              </h2>
            </div>
            <Link href="/explore" className="text-sm font-medium text-accent hover:underline">
              All genres
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Link
                key={genre.slug}
                href={`/explore?genre=${encodeURIComponent(genre.slug)}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-medium text-ink-secondary transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
              >
                <span>{genre.name}</span>
                {genre.count ? (
                  <span className="text-xs text-ink-muted">{genre.count.toLocaleString()}</span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
