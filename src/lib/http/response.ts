import { NextResponse } from "next/server";
import { OmnifyApiError } from "@/lib/omnify/client";
import { CommentServiceError } from "@/services/comments";
import type { ApiErrorEnvelope, ApiSuccessEnvelope, PaginationMeta } from "@/types/api";

export function jsonOk<T>(
  data: T,
  pagination?: PaginationMeta | null,
  status = 200,
  cacheControl = "public, s-maxage=60, stale-while-revalidate=120"
) {
  const body: ApiSuccessEnvelope<T> = {
    ok: true,
    data,
    ...(pagination !== undefined ? { pagination } : {})
  };
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": cacheControl
    }
  });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  retryAfterSeconds?: number
) {
  const body: ApiErrorEnvelope = {
    ok: false,
    error: {
      code,
      message,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {})
    }
  };
  const headers: Record<string, string> = {
    "Cache-Control": "no-store"
  };
  if (retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }
  return NextResponse.json(body, { status, headers });
}

export function handleApiError(error: unknown) {
  if (error instanceof OmnifyApiError) {
    return jsonError(error.code, error.message, error.status, error.retryAfterSeconds);
  }
  if (error instanceof CommentServiceError) {
    return jsonError(error.code, error.message, error.status);
  }
  return jsonError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}
