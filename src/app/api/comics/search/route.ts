import type { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { pageNumberSchema, searchQuerySchema } from "@/lib/validation/schemas";
import { searchComics } from "@/services/catalog";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const queryParsed = searchQuerySchema.safeParse(sp.get("q") ?? "");
  const pageParsed = pageNumberSchema.safeParse(sp.get("page") ?? undefined);

  if (!queryParsed.success || !pageParsed.success) {
    return jsonError("INVALID_QUERY", "A valid search query is required.", 400);
  }

  try {
    const result = await searchComics(queryParsed.data, pageParsed.data);
    return jsonOk(result.items, result.pagination, 200, "public, s-maxage=60, stale-while-revalidate=120");
  } catch (error) {
    return handleApiError(error);
  }
}
