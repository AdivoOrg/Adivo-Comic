export type ComicType = "manga" | "manhwa" | "manhua" | "other";

export type ComicStatus = "releasing" | "completed" | "hiatus" | "cancelled" | "unknown";

export type PopularPeriod =
  | "trending"
  | "follows"
  | "weekly"
  | "monthly"
  | "7d"
  | "30d"
  | "90d"
  | "all"
  | "score";

export type CatalogSort =
  | "relevance:desc"
  | "chapter_updated_at:desc"
  | "created_at:desc"
  | "title:asc"
  | "title:desc"
  | "year:desc"
  | "year:asc"
  | "score:desc"
  | "views_7d:desc"
  | "views_30d:desc"
  | "views_90d:desc"
  | "views_total:desc"
  | "follows_total:desc";

export interface GenreItem {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

export interface CreatorItem {
  id: number;
  name: string;
}

export interface ComicSummary {
  id: string;
  title: string;
  altTitles: string[];
  type: ComicType;
  status: ComicStatus;
  contentRating: string;
  posterUrl: string | null;
  synopsis: string;
  latestChapter: number | null;
  year: number | null;
  genres: GenreItem[];
  languages: string[];
}

export interface ComicDetail extends ComicSummary {
  coversCount: number;
  authors: CreatorItem[];
  artists: CreatorItem[];
  tags: GenreItem[];
  recommendations: ComicSummary[];
}

export interface ComicSuggestion {
  id: string;
  title: string;
  posterUrl: string | null;
  type: ComicType;
  status: ComicStatus;
  latestChapter: number | null;
  languages: string[];
}

export interface GenreCatalog {
  genres: GenreItem[];
  demographics: GenreItem[];
}
