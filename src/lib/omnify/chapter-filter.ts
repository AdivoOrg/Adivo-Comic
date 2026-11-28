import type { NormalizedChapter } from "@/types/chapter";

export function filterChapters(
  chapters: NormalizedChapter[],
  rawQuery: string
): NormalizedChapter[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return chapters;
  }

  const normalizedQuery = query.replace(/^ch\.?\s*/i, "").replace(/^chapter\s*/i, "").trim();
  const isNumericQuery = /^\d+(?:\.\d+)?$/.test(normalizedQuery);

  return chapters.filter((chapter) => {
    const label = chapter.displayLabel.toLowerCase();
    const title = chapter.title.toLowerCase();
    const numStr = chapter.chapterNumber !== null ? String(chapter.chapterNumber) : "";

    if (isNumericQuery) {
      if (numStr === normalizedQuery || numStr.startsWith(normalizedQuery)) {
        return true;
      }
      if (title.includes(normalizedQuery)) {
        return true;
      }
      return false;
    }

    if (query === "special" || query === "extra") {
      if (chapter.isSpecial) {
        return true;
      }
    }

    return (
      label.includes(query) ||
      title.includes(query) ||
      (normalizedQuery.length > 0 && numStr.includes(normalizedQuery))
    );
  });
}
