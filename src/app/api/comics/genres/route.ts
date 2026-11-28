import { handleApiError, jsonOk } from "@/lib/http/response";
import { fetchGenreCatalog } from "@/services/catalog";

export async function GET() {
  try {
    const catalog = await fetchGenreCatalog();
    return jsonOk(catalog, undefined, 200, "public, s-maxage=3600, stale-while-revalidate=7200");
  } catch (error) {
    return handleApiError(error);
  }
}
