import "server-only";
import { requestOmnify } from "@/lib/omnify/client";
import {
  normalizeAndGroupChapters,
  normalizeComicDetail,
  normalizeComicSuggestion,
  normalizeComicSummary,
  normalizeGenreCatalog,
  normalizePagination,
  normalizeReaderChapter
} from "@/lib/omnify/normalizers";
import type { PaginationMeta } from "@/types/api";
import type { GroupedChaptersResponse, ReaderChapterData } from "@/types/chapter";
import type {
  CatalogSort,
  ComicDetail,
  ComicSuggestion,
  ComicSummary,
  GenreCatalog,
  PopularPeriod
} from "@/types/comic";

const TTL_POPULAR_MS = 3 * 60 * 1000;
const TTL_LATEST_MS = 2 * 60 * 1000;
const TTL_GENRES_MS = 6 * 60 * 60 * 1000;
const TTL_FILTER_MS = 2 * 60 * 1000;
const TTL_SEARCH_MS = 90 * 1000;
const TTL_SUGGEST_MS = 90 * 1000;
const TTL_DETAIL_MS = 10 * 60 * 1000;
const TTL_CHAPTERS_MS = 3 * 60 * 1000;
const TTL_READER_MS = 15 * 60 * 1000;

export interface PaginatedComicsResult {
  items: ComicSummary[];
  pagination: PaginationMeta | null;
}

export interface CatalogFilterParams {
  type?: "manga" | "manhwa" | "manhua";
  status?: "releasing" | "completed" | "hiatus" | "cancelled";
  genre?: string;
  sort?: CatalogSort;
  page?: number;
}

export async function fetchPopularComics(
  period: PopularPeriod = "trending",
  page = 1
): Promise<PaginatedComicsResult> {
  const raw = await requestOmnify<unknown[]>("/comic/popular", { period, page }, TTL_POPULAR_MS);
  const items = Array.isArray(raw.data)
    ? raw.data.map(normalizeComicSummary).filter((item): item is ComicSummary => item !== null)
    : [];
  return {
    items,
    pagination: normalizePagination(raw.pagination)
  };
}

export async function fetchLatestComics(page = 1): Promise<PaginatedComicsResult> {
  const raw = await requestOmnify<unknown[]>("/comic/latest", { page }, TTL_LATEST_MS);
  const items = Array.isArray(raw.data)
    ? raw.data.map(normalizeComicSummary).filter((item): item is ComicSummary => item !== null)
    : [];
  return {
    items,
    pagination: normalizePagination(raw.pagination)
  };
}

export async function fetchGenreCatalog(): Promise<GenreCatalog> {
  const raw = await requestOmnify<unknown>("/comic/genres", {}, TTL_GENRES_MS);
  return normalizeGenreCatalog(raw.data);
}

export async function fetchFilteredComics(
  params: CatalogFilterParams
): Promise<PaginatedComicsResult> {
  const raw = await requestOmnify<unknown[]>(
    "/comic/filter",
    {
      type: params.type,
      status: params.status,
      genre: params.genre,
      sort: params.sort,
      page: params.page ?? 1
    },
    TTL_FILTER_MS
  );
  const items = Array.isArray(raw.data)
    ? raw.data.map(normalizeComicSummary).filter((item): item is ComicSummary => item !== null)
    : [];
  return {
    items,
    pagination: normalizePagination(raw.pagination)
  };
}

export async function searchComics(query: string, page = 1): Promise<PaginatedComicsResult> {
  const raw = await requestOmnify<unknown[]>(
    "/comic/search",
    { q: query, page },
    TTL_SEARCH_MS
  );
  const items = Array.isArray(raw.data)
    ? raw.data.map(normalizeComicSummary).filter((item): item is ComicSummary => item !== null)
    : [];
  return {
    items,
    pagination: normalizePagination(raw.pagination)
  };
}

export async function suggestComics(query: string): Promise<ComicSuggestion[]> {
  const raw = await requestOmnify<unknown[]>("/comic/suggest", { q: query }, TTL_SUGGEST_MS);
  return Array.isArray(raw.data)
    ? raw.data.map(normalizeComicSuggestion).filter((item): item is ComicSuggestion => item !== null)
    : [];
}

export async function fetchComicDetail(comicId: string): Promise<ComicDetail | null> {
  const raw = await requestOmnify<unknown>("/comic/detail", { id: comicId }, TTL_DETAIL_MS);
  return normalizeComicDetail(raw.data);
}

export async function fetchGroupedChapters(
  comicId: string,
  page = 1,
  perPage = 100
): Promise<{ grouped: GroupedChaptersResponse; pagination: PaginationMeta | null }> {
  const clampedPerPage = Math.max(20, Math.min(100, perPage));
  const raw = await requestOmnify<unknown[]>(
    "/comic/chapters",
    { id: comicId, lang: "all", page, per_page: clampedPerPage },
    TTL_CHAPTERS_MS
  );
  return {
    grouped: normalizeAndGroupChapters(comicId, raw.data),
    pagination: normalizePagination(raw.pagination)
  };
}

export async function fetchReaderChapter(chapterRawId: string): Promise<ReaderChapterData | null> {
  const raw = await requestOmnify<unknown>("/comic/read", { id: chapterRawId }, TTL_READER_MS);
  return normalizeReaderChapter(raw.data);
}
