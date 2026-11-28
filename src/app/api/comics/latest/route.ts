import type { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { pageNumberSchema } from "@/lib/validation/schemas";
import { fetchLatestComics } from "@/services/catalog";

export async function GET(request: NextRequest) {
  const pageParsed = pageNumberSchema.safeParse(request.nextUrl.searchParams.get("page") ?? undefined);
  if (!pageParsed.success) {
    return jsonError("INVALID_QUERY", "Invalid page parameter.", 400);
  }

  try {
    const result = await fetchLatestComics(pageParsed.data);
    return jsonOk(result.items, result.pagination, 200, "public, s-maxage=90, stale-while-revalidate=180");
  } catch (error) {
    return handleApiError(error);
  }
}
