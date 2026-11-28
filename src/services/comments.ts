import "server-only";
import { getAdminDatabase, type VerifiedSessionUser } from "@/lib/firebase/admin";
import { buildCommentScopeKey, sanitizePlainText } from "@/lib/validation/schemas";
import type { CommentRecord, CommentReportReason, CommentScope } from "@/types/comment";

export class CommentServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "CommentServiceError";
    this.code = code;
    this.status = status;
  }
}

function requireAdminDb() {
  const db = getAdminDatabase();
  if (!db) {
    throw new CommentServiceError(
      "COMMENTS_UNAVAILABLE",
      "Comment storage is not configured on the server.",
      503
    );
  }
  return db;
}

export async function listCommentsByScope(
  scope: CommentScope,
  comicId: string,
  chapterRawId?: string | null
): Promise<CommentRecord[]> {
  const db = requireAdminDb();
  const scopeKey = buildCommentScopeKey(scope, comicId, chapterRawId);
  const snap = await db.ref(`comments/${scopeKey}`).orderByChild("createdAt").limitToLast(100).get();
  if (!snap.exists()) {
    return [];
  }
  const raw = snap.val() as Record<string, CommentRecord>;
  return Object.values(raw)
    .filter((item) => !item.deleted)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createCommentRecord(
  user: VerifiedSessionUser,
  input: { scope: CommentScope; comicId: string; chapterRawId?: string | null; body: string }
): Promise<CommentRecord> {
  const db = requireAdminDb();
  const cleanBody = sanitizePlainText(input.body);
  if (!cleanBody) {
    throw new CommentServiceError("INVALID_COMMENT", "Comment body cannot be empty.", 400);
  }

  const scopeKey = buildCommentScopeKey(input.scope, input.comicId, input.chapterRawId);
  const listRef = db.ref(`comments/${scopeKey}`);
  const newRef = listRef.push();
  const id = newRef.key;
  if (!id) {
    throw new CommentServiceError("WRITE_FAILED", "Could not allocate comment identifier.", 500);
  }

  const now = Date.now();
  const record: CommentRecord = {
    id,
    scope: input.scope,
    scopeKey,
    comicId: input.comicId,
    chapterRawId: input.scope === "chapter" ? input.chapterRawId ?? null : null,
    authorUid: user.uid,
    authorName: user.displayName,
    authorAvatar: user.photoURL,
    body: cleanBody,
    createdAt: now,
    updatedAt: now,
    edited: false,
    deleted: false
  };

  await newRef.set(record);
  return record;
}

export async function updateCommentRecord(
  user: VerifiedSessionUser,
  scopeKey: string,
  commentId: string,
  nextBody: string
): Promise<CommentRecord> {
  const db = requireAdminDb();
  const cleanBody = sanitizePlainText(nextBody);
  if (!cleanBody) {
    throw new CommentServiceError("INVALID_COMMENT", "Comment body cannot be empty.", 400);
  }

  const targetRef = db.ref(`comments/${scopeKey}/${commentId}`);
  const snap = await targetRef.get();
  if (!snap.exists()) {
    throw new CommentServiceError("NOT_FOUND", "Comment not found.", 404);
  }

  const existing = snap.val() as CommentRecord;
  if (existing.authorUid !== user.uid) {
    throw new CommentServiceError("FORBIDDEN", "You can only edit your own comments.", 403);
  }

  const updated: CommentRecord = {
    ...existing,
    body: cleanBody,
    updatedAt: Date.now(),
    edited: true
  };
  await targetRef.set(updated);
  return updated;
}

export async function deleteCommentRecord(
  user: VerifiedSessionUser,
  scopeKey: string,
  commentId: string
): Promise<void> {
  const db = requireAdminDb();
  const targetRef = db.ref(`comments/${scopeKey}/${commentId}`);
  const snap = await targetRef.get();
  if (!snap.exists()) {
    throw new CommentServiceError("NOT_FOUND", "Comment not found.", 404);
  }

  const existing = snap.val() as CommentRecord;
  if (existing.authorUid !== user.uid) {
    throw new CommentServiceError("FORBIDDEN", "You can only delete your own comments.", 403);
  }

  await targetRef.remove();
}

export async function reportCommentRecord(
  user: VerifiedSessionUser,
  scopeKey: string,
  commentId: string,
  reason: CommentReportReason,
  details?: string
): Promise<void> {
  const db = requireAdminDb();
  const commentSnap = await db.ref(`comments/${scopeKey}/${commentId}`).get();
  if (!commentSnap.exists()) {
    throw new CommentServiceError("NOT_FOUND", "Comment not found.", 404);
  }

  const reportRef = db.ref(`_internal/commentReports/${scopeKey}/${commentId}/${user.uid}`);
  await reportRef.set({
    reporterUid: user.uid,
    reason,
    details: details ? sanitizePlainText(details).slice(0, 300) : "",
    createdAt: Date.now()
  });
}
