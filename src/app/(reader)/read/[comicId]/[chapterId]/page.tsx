import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ReaderClient } from "@/components/comic/ReaderClient";
import { EmptyState } from "@/components/ui/EmptyState";
import { resolveAdjacentChapters } from "@/lib/omnify/normalizers";
import { identifierSchema } from "@/lib/validation/schemas";
import {
  fetchComicDetail,
  fetchGroupedChapters,
  fetchReaderChapter
} from "@/services/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reader"
};

export default async function ReaderPage({
  params,
  searchParams
}: {
  params: Promise<{ comicId: string; chapterId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { comicId, chapterId } = await params;
  const { lang } = await searchParams;

  const comicIdParsed = identifierSchema.safeParse(comicId);
  const chapterIdParsed = identifierSchema.safeParse(chapterId);
  if (!comicIdParsed.success || !chapterIdParsed.success) {
    notFound();
  }

  const [chapterResult, detailResult, groupedResult] = await Promise.allSettled([
    fetchReaderChapter(chapterIdParsed.data),
    fetchComicDetail(comicIdParsed.data),
    fetchGroupedChapters(comicIdParsed.data, 1, 100)
  ]);

  if (chapterResult.status === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
            title="Unable to load chapter"
            description="We could not fetch this chapter right now. Please try again in a moment."
            action={
              <Link
                href={`/comic/${encodeURIComponent(comicIdParsed.data)}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
              >
                Back to series
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const chapter = chapterResult.value;
  if (!chapter) {
    notFound();
  }

  const comic = detailResult.status === "fulfilled" ? detailResult.value : null;
  const grouped = groupedResult.status === "fulfilled" ? groupedResult.value.grouped : null;

  const requestedLang =
    typeof lang === "string" && lang.trim() && lang.trim().toLowerCase() !== "all"
      ? lang.trim().toLowerCase()
      : chapter.language;

  const activeGroup =
    grouped?.groups.find((group) => group.language === requestedLang) ||
    grouped?.groups.find((group) => group.language === chapter.language) ||
    grouped?.groups[0] ||
    null;

  const activeLanguage = activeGroup?.language || requestedLang || "en";
  const languageChapters = activeGroup?.chapters || [];
  const adjacentFromGroup = resolveAdjacentChapters(languageChapters, chapter.rawId);

  const prevChapter = adjacentFromGroup.prevChapter ?? chapter.upstreamPrev;
  const nextChapter = adjacentFromGroup.nextChapter ?? chapter.upstreamNext;

  return (
    <ReaderClient
      comicId={comicIdParsed.data}
      comicTitle={comic?.title || "Comic Reader"}
      comicPosterUrl={comic?.posterUrl ?? null}
      activeLanguage={activeLanguage}
      chapter={chapter}
      languageChapters={languageChapters}
      prevChapter={prevChapter}
      nextChapter={nextChapter}
    />
  );
}
