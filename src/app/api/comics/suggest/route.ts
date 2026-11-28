import type { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { searchQuerySchema } from "@/lib/validation/schemas";
import { suggestComics } from "@/services/catalog";

export async function GET(request: NextRequest) {
  const queryParsed = searchQuerySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!queryParsed.success) {
    return jsonError("INVALID_QUERY", "A valid search query is required.", 400);
  }

  try {
    const suggestions = await suggestComics(queryParsed.data);
    return jsonOk(suggestions, undefined, 200, "public, s-maxage=60, stale-while-revalidate=120");
  } catch (error) {
    return handleApiError(error);
  }
}
