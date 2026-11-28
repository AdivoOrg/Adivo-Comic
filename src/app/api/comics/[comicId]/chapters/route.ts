import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { identifierSchema, pageNumberSchema } from "@/lib/validation/schemas";
import { fetchGroupedChapters } from "@/services/catalog";

const perPageSchema = z.coerce.number().int().min(20).max(100).default(100);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ comicId: string }> }
) {
  const { comicId } = await context.params;
  const idParsed = identifierSchema.safeParse(comicId);
  const pageParsed = pageNumberSchema.safeParse(request.nextUrl.searchParams.get("page") ?? undefined);
  const perPageParsed = perPageSchema.safeParse(
    request.nextUrl.searchParams.get("perPage") ?? undefined
  );

  if (!idParsed.success || !pageParsed.success || !perPageParsed.success) {
    return jsonError("INVALID_QUERY", "Invalid chapter query parameters.", 400);
  }

  try {
    const { grouped, pagination } = await fetchGroupedChapters(
      idParsed.data,
      pageParsed.data,
      perPageParsed.data
    );
    return jsonOk(grouped, pagination, 200, "public, s-maxage=120, stale-while-revalidate=240");
  } catch (error) {
    return handleApiError(error);
  }
}
