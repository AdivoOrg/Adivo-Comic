import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ComicDetailClient } from "@/components/comic/ComicDetailClient";
import { EmptyState } from "@/components/ui/EmptyState";
import { identifierSchema } from "@/lib/validation/schemas";
import { fetchComicDetail, fetchGroupedChapters } from "@/services/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ comicId: string }>;
}): Promise<Metadata> {
  const { comicId } = await params;
  const parsed = identifierSchema.safeParse(comicId);
  if (!parsed.success) {
    return { title: "Comic Not Found" };
  }
  try {
    const detail = await fetchComicDetail(parsed.data);
    return { title: detail?.title || "Comic Detail" };
  } catch {
    return { title: "Comic Detail" };
  }
}

export default async function ComicDetailPage({
  params
}: {
  params: Promise<{ comicId: string }>;
}) {
  const { comicId } = await params;
  const parsed = identifierSchema.safeParse(comicId);
  if (!parsed.success) {
    notFound();
  }

  const [detailResult, chaptersResult] = await Promise.allSettled([
    fetchComicDetail(parsed.data),
    fetchGroupedChapters(parsed.data, 1, 100)
  ]);

  if (detailResult.status === "rejected") {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
        title="Unable to load series"
        description="The catalog service could not retrieve this series right now. Please try again shortly."
        action={
          <Link
            href="/explore"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Back to Explore
          </Link>
        }
      />
    );
  }

  const comic = detailResult.value;
  if (!comic) {
    notFound();
  }

  const initialChapters =
    chaptersResult.status === "fulfilled"
      ? chaptersResult.value.grouped
      : { comicId: comic.id, groups: [], defaultLanguage: null, totalFetched: 0 };

  const initialPagination =
    chaptersResult.status === "fulfilled" ? chaptersResult.value.pagination : null;

  return (
    <ComicDetailClient
      comic={comic}
      initialChapters={initialChapters}
      initialPagination={initialPagination}
    />
  );
}
