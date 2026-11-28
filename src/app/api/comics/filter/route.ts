import type { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { filterQuerySchema } from "@/lib/validation/schemas";
import { fetchFilteredComics } from "@/services/catalog";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = filterQuerySchema.safeParse({
    type: sp.get("type") || undefined,
    status: sp.get("status") || undefined,
    genre: sp.get("genre") || undefined,
    sort: sp.get("sort") || undefined,
    page: sp.get("page") || undefined
  });

  if (!parsed.success) {
    return jsonError("INVALID_QUERY", "Invalid filter parameters.", 400);
  }

  try {
    const result = await fetchFilteredComics(parsed.data);
    return jsonOk(result.items, result.pagination, 200, "public, s-maxage=90, stale-while-revalidate=180");
  } catch (error) {
    return handleApiError(error);
  }
}
