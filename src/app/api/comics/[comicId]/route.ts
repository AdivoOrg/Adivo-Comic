import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { identifierSchema } from "@/lib/validation/schemas";
import { fetchComicDetail } from "@/services/catalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ comicId: string }> }
) {
  const { comicId } = await context.params;
  const parsed = identifierSchema.safeParse(comicId);
  if (!parsed.success) {
    return jsonError("INVALID_COMIC_ID", "Invalid comic identifier.", 400);
  }

  try {
    const detail = await fetchComicDetail(parsed.data);
    if (!detail) {
      return jsonError("NOT_FOUND", "Comic not found.", 404);
    }
    return jsonOk(detail, undefined, 200, "public, s-maxage=300, stale-while-revalidate=600");
  } catch (error) {
    return handleApiError(error);
  }
}
