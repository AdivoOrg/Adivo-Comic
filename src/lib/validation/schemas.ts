import { z } from "zod";

export const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9._:-]+$/, "Invalid identifier format");

export const pageNumberSchema = z.coerce.number().int().min(1).max(500).default(1);

export const popularPeriodSchema = z
  .enum(["trending", "follows", "weekly", "monthly", "7d", "30d", "90d", "all", "score"])
  .default("trending");

export const catalogSortSchema = z
  .enum([
    "relevance:desc",
    "chapter_updated_at:desc",
    "created_at:desc",
    "title:asc",
    "title:desc",
    "year:desc",
    "year:asc",
    "score:desc",
    "views_7d:desc",
    "views_30d:desc",
    "views_90d:desc",
    "views_total:desc",
    "follows_total:desc"
  ])
  .default("chapter_updated_at:desc");

export const comicTypeFilterSchema = z.enum(["manga", "manhwa", "manhua"]).optional();

export const comicStatusFilterSchema = z
  .enum(["releasing", "completed", "hiatus", "cancelled"])
  .optional();

export const genreSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/)
  .optional();

export const searchQuerySchema = z.string().trim().min(1).max(120);

export const filterQuerySchema = z.object({
  type: comicTypeFilterSchema,
  status: comicStatusFilterSchema,
  genre: genreSlugSchema,
  sort: catalogSortSchema,
  page: pageNumberSchema
});

export const commentScopeSchema = z.enum(["comic", "chapter"]);

export const createCommentSchema = z
  .object({
    scope: commentScopeSchema,
    comicId: identifierSchema,
    chapterRawId: identifierSchema.optional(),
    body: z.string().trim().min(1).max(1000)
  })
  .refine((data) => (data.scope === "chapter" ? Boolean(data.chapterRawId) : true), {
    message: "chapterRawId is required for chapter comments",
    path: ["chapterRawId"]
  });

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000)
});

export const reportCommentSchema = z.object({
  reason: z.enum(["spam", "spoiler", "harassment", "inappropriate", "other"]),
  details: z.string().trim().max(300).optional()
});

export function sanitizePlainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isSafeInternalRedirect(target: string | null | undefined): string {
  if (!target) {
    return "/";
  }
  const trimmed = target.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/";
  }
  return trimmed;
}

export function buildCommentScopeKey(
  scope: "comic" | "chapter",
  comicId: string,
  chapterRawId?: string | null
): string {
  const safeComic = encodeURIComponent(comicId).replace(/\./g, "%2E");
  if (scope === "chapter" && chapterRawId) {
    const safeChapter = encodeURIComponent(chapterRawId).replace(/\./g, "%2E");
    return `chapter__${safeComic}__${safeChapter}`;
  }
  return `comic__${safeComic}`;
}
