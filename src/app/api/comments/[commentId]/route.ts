import type { NextRequest } from "next/server";
import { verifyBearerToken } from "@/lib/firebase/admin";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/response";
import {
  buildCommentScopeKey,
  commentScopeSchema,
  identifierSchema,
  reportCommentSchema,
  updateCommentSchema
} from "@/lib/validation/schemas";
import {
  deleteCommentRecord,
  reportCommentRecord,
  updateCommentRecord
} from "@/services/comments";

const MAX_BODY_BYTES = 4096;

function resolveScopeKeyFromQuery(request: NextRequest): string | null {
  const sp = request.nextUrl.searchParams;
  const scopeParsed = commentScopeSchema.safeParse(sp.get("scope") ?? "");
  const comicParsed = identifierSchema.safeParse(sp.get("comicId") ?? "");
  const rawChapter = sp.get("chapterRawId");
  const chapterParsed = rawChapter ? identifierSchema.safeParse(rawChapter) : null;

  if (!scopeParsed.success || !comicParsed.success) {
    return null;
  }
  if (scopeParsed.data === "chapter" && (!chapterParsed || !chapterParsed.success)) {
    return null;
  }
  return buildCommentScopeKey(
    scopeParsed.data,
    comicParsed.data,
    chapterParsed?.success ? chapterParsed.data : null
  );
}

async function readBoundedJson(request: NextRequest): Promise<{ ok: true; data: unknown } | { ok: false; status: number; code: string; message: string }> {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Request payload exceeds allowed size."
    };
  }
  const rawText = await request.text();
  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Request payload exceeds allowed size."
    };
  }
  try {
    return { ok: true, data: JSON.parse(rawText) };
  } catch {
    return {
      ok: false,
      status: 400,
      code: "INVALID_JSON",
      message: "Malformed JSON request body."
    };
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const bodyResult = await readBoundedJson(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.code, bodyResult.message, bodyResult.status);
  }

  const user = await verifyBearerToken(request);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Sign in to edit a comment.", 401);
  }

  const { commentId } = await context.params;
  const idParsed = identifierSchema.safeParse(commentId);
  const scopeKey = resolveScopeKeyFromQuery(request);
  if (!idParsed.success || !scopeKey) {
    return jsonError("INVALID_QUERY", "Invalid comment reference.", 400);
  }

  const parsed = updateCommentSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError("INVALID_PAYLOAD", "Invalid comment update payload.", 400);
  }

  try {
    const updated = await updateCommentRecord(user, scopeKey, idParsed.data, parsed.data.body);
    return jsonOk(updated, undefined, 200, "no-store");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const user = await verifyBearerToken(request);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Sign in to delete a comment.", 401);
  }

  const { commentId } = await context.params;
  const idParsed = identifierSchema.safeParse(commentId);
  const scopeKey = resolveScopeKeyFromQuery(request);
  if (!idParsed.success || !scopeKey) {
    return jsonError("INVALID_QUERY", "Invalid comment reference.", 400);
  }

  try {
    await deleteCommentRecord(user, scopeKey, idParsed.data);
    return jsonOk({ deleted: true }, undefined, 200, "no-store");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const bodyResult = await readBoundedJson(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.code, bodyResult.message, bodyResult.status);
  }

  const user = await verifyBearerToken(request);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Sign in to report a comment.", 401);
  }

  const { commentId } = await context.params;
  const idParsed = identifierSchema.safeParse(commentId);
  const scopeKey = resolveScopeKeyFromQuery(request);
  if (!idParsed.success || !scopeKey) {
    return jsonError("INVALID_QUERY", "Invalid comment reference.", 400);
  }

  const parsed = reportCommentSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError("INVALID_PAYLOAD", "Invalid report payload.", 400);
  }

  try {
    await reportCommentRecord(
      user,
      scopeKey,
      idParsed.data,
      parsed.data.reason,
      parsed.data.details
    );
    return jsonOk({ reported: true }, undefined, 201, "no-store");
  } catch (error) {
    return handleApiError(error);
  }
}
