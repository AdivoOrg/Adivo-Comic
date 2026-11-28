import type { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { pageNumberSchema, popularPeriodSchema } from "@/lib/validation/schemas";
import { fetchPopularComics } from "@/services/catalog";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const periodParsed = popularPeriodSchema.safeParse(searchParams.get("period") ?? undefined);
  const pageParsed = pageNumberSchema.safeParse(searchParams.get("page") ?? undefined);

  if (!periodParsed.success || !pageParsed.success) {
    return jsonError("INVALID_QUERY", "Invalid popular query parameters.", 400);
  }

  try {
    const result = await fetchPopularComics(periodParsed.data, pageParsed.data);
    return jsonOk(result.items, result.pagination, 200, "public, s-maxage=120, stale-while-revalidate=240");
  } catch (error) {
    return handleApiError(error);
  }
}
