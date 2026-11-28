export interface NormalizedChapter {
  rawId: string;
  chapterNumber: number | null;
  displayLabel: string;
  volume: number | null;
  title: string;
  language: string;
  uploadedAgo: string;
  isSpecial: boolean;
  sortKey: number;
}

export interface ChapterLanguageGroup {
  language: string;
  label: string;
  totalCount: number;
  chapters: NormalizedChapter[];
}

export interface GroupedChaptersResponse {
  comicId: string;
  groups: ChapterLanguageGroup[];
  defaultLanguage: string | null;
  totalFetched: number;
}

export interface AdjacentChapterRef {
  rawId: string;
  displayLabel: string;
  chapterNumber: number | null;
}

export interface ReaderPage {
  pageNumber: number;
  imageUrl: string;
}

export interface ReaderChapterData {
  rawId: string;
  chapterNumber: number | null;
  displayLabel: string;
  title: string;
  language: string;
  totalPages: number;
  pages: ReaderPage[];
  upstreamPrev: AdjacentChapterRef | null;
  upstreamNext: AdjacentChapterRef | null;
}
