import type { PaginationMeta } from "@/types/api";
import type {
  AdjacentChapterRef,
  ChapterLanguageGroup,
  GroupedChaptersResponse,
  NormalizedChapter,
  ReaderChapterData,
  ReaderPage
} from "@/types/chapter";
import type {
  ComicDetail,
  ComicStatus,
  ComicSummary,
  ComicSuggestion,
  ComicType,
  CreatorItem,
  GenreCatalog,
  GenreItem
} from "@/types/comic";

const ALLOWED_IMAGE_PREFIX = "https://premium.omnifylabs.sbs/proxy/image/";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  id: "Indonesian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ru: "Russian",
  th: "Thai",
  vi: "Vietnamese"
};

const LANGUAGE_PRIORITY = ["en", "id"];

export function validateOmnifyImageUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string") {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith(ALLOWED_IMAGE_PREFIX) || trimmed.length > 600) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.origin !== "https://premium.omnifylabs.sbs") {
      return null;
    }
    if (!parsed.pathname.startsWith("/proxy/image/")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeSynopsis(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }

  let text = raw
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, "$1")
    .replace(/\[\/?(?:b|i|u|s|spoiler|quote|center|color=[^\]]*|size=[^\]]*)\]/gi, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, "$1")
    .replace(/https?:\/\/[^\s)>\]]+/gi, "")
    .replace(/\bwww\.[^\s)>\]]+/gi, "");

  const lines = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => {
      if (!line) {
        return true;
      }
      if (/^(?:source|official|original|raw|credit|read more at|licensed by)\s*[:\-]/i.test(line)) {
        return false;
      }
      if (/^\(\s*(?:source|official|raw)\s*\)$/i.test(line)) {
        return false;
      }
      return true;
    });

  text = lines
    .join("\n")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function normalizeComicType(raw: unknown): ComicType {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "manga" || value === "manhwa" || value === "manhua") {
    return value;
  }
  return "other";
}

function normalizeComicStatus(raw: unknown): ComicStatus {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "releasing" || value === "ongoing") {
    return "releasing";
  }
  if (value === "completed" || value === "finished") {
    return "completed";
  }
  if (value === "hiatus") {
    return "hiatus";
  }
  if (value === "cancelled" || value === "canceled") {
    return "cancelled";
  }
  return "unknown";
}

function normalizeNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeGenres(raw: unknown): GenreItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<string>();
  const items: GenreItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const slug =
      typeof record.slug === "string" && record.slug.trim()
        ? record.slug.trim().toLowerCase()
        : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!name || !slug || seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    items.push({
      id: normalizeNumber(record.id) ?? items.length + 1,
      name,
      slug,
      count: normalizeNumber(record.count) ?? undefined
    });
  }
  return items;
}

function normalizeCreators(raw: unknown): CreatorItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<string>();
  const items: CreatorItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name || seen.has(name.toLowerCase())) {
      continue;
    }
    seen.add(name.toLowerCase());
    items.push({
      id: normalizeNumber(record.id) ?? items.length + 1,
      name
    });
  }
  return items;
}

function normalizeLanguageCode(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned === "all") {
    return "";
  }
  const base = cleaned.split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(base) ? base : "";
}

function normalizeLanguagesList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const set = new Set<string>();
  for (const item of raw) {
    const code = normalizeLanguageCode(item);
    if (code) {
      set.add(code);
    }
  }
  return Array.from(set);
}

export function normalizePagination(raw: unknown): PaginationMeta | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const page = normalizeNumber(record.page) ?? 1;
  const perPage = normalizeNumber(record.per_page) ?? 20;
  const itemsCount = normalizeNumber(record.items_count) ?? 0;
  const totalItems = normalizeNumber(record.total_items) ?? itemsCount;
  const totalPages = Math.max(1, normalizeNumber(record.total_pages) ?? 1);
  const hasNextPage = Boolean(record.has_next_page);
  const hasPrevPage = Boolean(record.has_prev_page);

  return {
    page,
    perPage,
    itemsCount,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: normalizeNumber(record.next_page),
    prevPage: normalizeNumber(record.prev_page)
  };
}

export function normalizeComicSummary(raw: unknown): ComicSummary | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!id || !title) {
    return null;
  }

  const altTitles = Array.isArray(record.alt_titles)
    ? record.alt_titles
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
    : [];

  return {
    id,
    title,
    altTitles,
    type: normalizeComicType(record.type),
    status: normalizeComicStatus(record.status),
    contentRating: typeof record.content_rating === "string" ? record.content_rating.trim() : "safe",
    posterUrl: validateOmnifyImageUrl(record.poster),
    synopsis: sanitizeSynopsis(record.synopsis),
    latestChapter: normalizeNumber(record.latest_chapter),
    year: normalizeNumber(record.year),
    genres: normalizeGenres(record.genres),
    languages: normalizeLanguagesList(record.languages)
  };
}

export function normalizeComicDetail(raw: unknown): ComicDetail | null {
  const summary = normalizeComicSummary(raw);
  if (!summary || !raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const recommendations = Array.isArray(record.recommendations)
    ? record.recommendations
        .map((item) => normalizeComicSummary(item))
        .filter((item): item is ComicSummary => item !== null)
    : [];

  return {
    ...summary,
    coversCount: normalizeNumber(record.covers_count) ?? 1,
    authors: normalizeCreators(record.authors),
    artists: normalizeCreators(record.artists),
    tags: normalizeGenres(record.tags),
    recommendations
  };
}

export function normalizeComicSuggestion(raw: unknown): ComicSuggestion | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    posterUrl: validateOmnifyImageUrl(record.poster),
    type: normalizeComicType(record.type),
    status: normalizeComicStatus(record.status),
    latestChapter: normalizeNumber(record.latest_chapter),
    languages: normalizeLanguagesList(record.languages)
  };
}

export function normalizeGenreCatalog(raw: unknown): GenreCatalog {
  if (!raw || typeof raw !== "object") {
    return { genres: [], demographics: [] };
  }
  const record = raw as Record<string, unknown>;
  return {
    genres: normalizeGenres(record.genres),
    demographics: normalizeGenres(record.demographics)
  };
}

export function getLanguageDisplayLabel(code: string): string {
  return LANGUAGE_LABELS[code] || code.toUpperCase();
}

function buildChapterLabel(chapterNumber: number | null, title: string): { displayLabel: string; isSpecial: boolean } {
  const cleanTitle = title.trim();
  const hasSpecialKeyword = /\b(?:special|extra|omake|bonus|prologue|epilogue|side story|oneshot)\b/i.test(
    cleanTitle
  );

  if (chapterNumber !== null) {
    const formatted = Number.isInteger(chapterNumber) ? String(chapterNumber) : String(chapterNumber);
    const isSpecial = hasSpecialKeyword || !Number.isInteger(chapterNumber) || chapterNumber === 0;
    return {
      displayLabel: `Ch. ${formatted}`,
      isSpecial
    };
  }

  if (cleanTitle) {
    return {
      displayLabel: cleanTitle.slice(0, 48),
      isSpecial: true
    };
  }

  return {
    displayLabel: "Special",
    isSpecial: true
  };
}

export function normalizeAndGroupChapters(
  comicId: string,
  rawList: unknown
): GroupedChaptersResponse {
  const items = Array.isArray(rawList) ? rawList : [];
  const seenRawIds = new Set<string>();
  const byLanguage = new Map<string, NormalizedChapter[]>();

  items.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      return;
    }
    const record = raw as Record<string, unknown>;
    const rawId = typeof record.id === "string" ? record.id.trim() : "";
    if (!rawId || seenRawIds.has(rawId)) {
      return;
    }
    seenRawIds.add(rawId);

    const language = normalizeLanguageCode(record.language ?? record.lang) || "unknown";
    const chapterNumber = normalizeNumber(record.chapter ?? record.chapter_number);
    const rawVolume = normalizeNumber(record.volume);
    const volume = rawVolume !== null && rawVolume > 0 ? rawVolume : null;
    const title = sanitizeSynopsis(record.title).replace(/\n/g, " ").trim();
    const uploadedAgo = typeof record.uploaded_ago === "string" ? record.uploaded_ago.trim() : "";
    const { displayLabel, isSpecial } = buildChapterLabel(chapterNumber, title);
    const sortKey = chapterNumber !== null ? chapterNumber : -100000 - index;

    const normalized: NormalizedChapter = {
      rawId,
      chapterNumber,
      displayLabel,
      volume,
      title,
      language,
      uploadedAgo,
      isSpecial,
      sortKey
    };

    const existing = byLanguage.get(language);
    if (existing) {
      existing.push(normalized);
    } else {
      byLanguage.set(language, [normalized]);
    }
  });

  const groups: ChapterLanguageGroup[] = Array.from(byLanguage.entries())
    .map(([language, chapters]) => {
      const sorted = [...chapters].sort((a, b) => {
        if (b.sortKey !== a.sortKey) {
          return b.sortKey - a.sortKey;
        }
        return a.rawId.localeCompare(b.rawId);
      });

      return {
        language,
        label: getLanguageDisplayLabel(language),
        totalCount: sorted.length,
        chapters: sorted
      };
    })
    .sort((a, b) => {
      const priorityA = LANGUAGE_PRIORITY.indexOf(a.language);
      const priorityB = LANGUAGE_PRIORITY.indexOf(b.language);
      if (priorityA !== -1 || priorityB !== -1) {
        if (priorityA === -1) return 1;
        if (priorityB === -1) return -1;
        return priorityA - priorityB;
      }
      if (b.totalCount !== a.totalCount) {
        return b.totalCount - a.totalCount;
      }
      return a.language.localeCompare(b.language);
    });

  return {
    comicId,
    groups,
    defaultLanguage: groups.length > 0 ? groups[0].language : null,
    totalFetched: seenRawIds.size
  };
}

export function resolveAdjacentChapters(
  orderedDescendingChapters: NormalizedChapter[],
  activeRawId: string
): { prevChapter: AdjacentChapterRef | null; nextChapter: AdjacentChapterRef | null } {
  const index = orderedDescendingChapters.findIndex((item) => item.rawId === activeRawId);
  if (index === -1) {
    return { prevChapter: null, nextChapter: null };
  }

  const nextItem = index > 0 ? orderedDescendingChapters[index - 1] : null;
  const prevItem =
    index < orderedDescendingChapters.length - 1 ? orderedDescendingChapters[index + 1] : null;

  return {
    prevChapter: prevItem
      ? {
          rawId: prevItem.rawId,
          displayLabel: prevItem.displayLabel,
          chapterNumber: prevItem.chapterNumber
        }
      : null,
    nextChapter: nextItem
      ? {
          rawId: nextItem.rawId,
          displayLabel: nextItem.displayLabel,
          chapterNumber: nextItem.chapterNumber
        }
      : null
  };
}

function normalizeAdjacentRef(raw: unknown): AdjacentChapterRef | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const rawId = typeof record.id === "string" ? record.id.trim() : "";
  if (!rawId) {
    return null;
  }
  const chapterNumber = normalizeNumber(record.number ?? record.chapter);
  const { displayLabel } = buildChapterLabel(chapterNumber, "");
  return { rawId, displayLabel, chapterNumber };
}

export function normalizeReaderChapter(raw: unknown): ReaderChapterData | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const rawId = typeof record.chapter_id === "string" ? record.chapter_id.trim() : "";
  if (!rawId) {
    return null;
  }

  const chapterNumber = normalizeNumber(record.chapter_number);
  const title = sanitizeSynopsis(record.title).replace(/\n/g, " ").trim();
  const { displayLabel } = buildChapterLabel(chapterNumber, title);
  const language = normalizeLanguageCode(record.language) || "unknown";

  const pages: ReaderPage[] = Array.isArray(record.pages)
    ? record.pages
        .map((item, idx) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const pageRecord = item as Record<string, unknown>;
          const imageUrl = validateOmnifyImageUrl(pageRecord.url);
          if (!imageUrl) {
            return null;
          }
          return {
            pageNumber: normalizeNumber(pageRecord.page) ?? idx + 1,
            imageUrl
          };
        })
        .filter((item): item is ReaderPage => item !== null)
        .sort((a, b) => a.pageNumber - b.pageNumber)
    : [];

  return {
    rawId,
    chapterNumber,
    displayLabel,
    title,
    language,
    totalPages: pages.length,
    pages,
    upstreamPrev: normalizeAdjacentRef(record.prev_chapter),
    upstreamNext: normalizeAdjacentRef(record.next_chapter)
  };
}
