import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { identifierSchema } from "@/lib/validation/schemas";
import { fetchReaderChapter } from "@/services/catalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await context.params;
  const parsed = identifierSchema.safeParse(chapterId);
  if (!parsed.success) {
    return jsonError("INVALID_CHAPTER_ID", "Invalid chapter identifier.", 400);
  }

  try {
    const chapter = await fetchReaderChapter(parsed.data);
    if (!chapter) {
      return jsonError("NOT_FOUND", "Chapter not found.", 404);
    }
    return jsonOk(chapter, undefined, 200, "public, s-maxage=300, stale-while-revalidate=600");
  } catch (error) {
    return handleApiError(error);
  }
}
