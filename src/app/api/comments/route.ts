import type { NextRequest } from "next/server";
import { verifyBearerToken } from "@/lib/firebase/admin";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import { consumeCommentRateLimit } from "@/lib/omnify/limiter";
import {
  commentScopeSchema,
  createCommentSchema,
  identifierSchema
} from "@/lib/validation/schemas";
import { createCommentRecord, listCommentsByScope } from "@/services/comments";

const MAX_BODY_BYTES = 4096;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const scopeParsed = commentScopeSchema.safeParse(sp.get("scope") ?? "");
  const comicParsed = identifierSchema.safeParse(sp.get("comicId") ?? "");
  const rawChapter = sp.get("chapterRawId");
  const chapterParsed = rawChapter ? identifierSchema.safeParse(rawChapter) : null;

  if (!scopeParsed.success || !comicParsed.success) {
    return jsonError("INVALID_QUERY", "Valid scope and comicId are required.", 400);
  }
  if (scopeParsed.data === "chapter" && (!chapterParsed || !chapterParsed.success)) {
    return jsonError("INVALID_QUERY", "Valid chapterRawId is required for chapter comments.", 400);
  }

  try {
    const items = await listCommentsByScope(
      scopeParsed.data,
      comicParsed.data,
      chapterParsed?.success ? chapterParsed.data : null
    );
    return jsonOk(items, undefined, 200, "no-store");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError("PAYLOAD_TOO_LARGE", "Request payload exceeds allowed size.", 413);
  }

  const rawText = await request.text();
  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    return jsonError("PAYLOAD_TOO_LARGE", "Request payload exceeds allowed size.", 413);
  }

  const user = await verifyBearerToken(request);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Sign in to post a comment.", 401);
  }

  const rateLimit = await consumeCommentRateLimit(user.uid);
  if (!rateLimit.allowed) {
    return jsonError(
      "RATE_LIMITED",
      "You are commenting too quickly. Please wait a moment.",
      429,
      rateLimit.retryAfterSeconds
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return jsonError("INVALID_JSON", "Malformed JSON request body.", 400);
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("INVALID_PAYLOAD", "Invalid comment payload.", 400);
  }

  try {
    const created = await createCommentRecord(user, parsed.data);
    return jsonOk(created, undefined, 201, "no-store");
  } catch (error) {
    return handleApiError(error);
  }
}
