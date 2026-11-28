import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { ComicSummary } from "@/types/comic";

export interface ComicCardProps {
  comic: ComicSummary;
  priority?: boolean;
}

const TYPE_LABEL: Record<ComicSummary["type"], string> = {
  manga: "Manga",
  manhwa: "Manhwa",
  manhua: "Manhua",
  other: "Comic"
};

export function ComicCard({ comic, priority = false }: ComicCardProps) {
  return (
    <Link
      href={`/comic/${encodeURIComponent(comic.id)}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-subtle">
        {comic.posterUrl ? (
          <Image
            src={comic.posterUrl}
            alt={comic.title}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 28vw, 19vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-muted">
            <BookOpen className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          <Badge tone="accent" className="bg-surface/90 backdrop-blur-sm">
            {TYPE_LABEL[comic.type]}
          </Badge>
        </div>
        {comic.latestChapter !== null ? (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-end">
            <span className="rounded-lg bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              Ch. {comic.latestChapter}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-ink group-hover:text-accent">
          {comic.title}
        </h3>
        <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
          <span className="capitalize">{comic.status}</span>
          {comic.year ? <span>{comic.year}</span> : null}
        </div>
      </div>
    </Link>
  );
}
