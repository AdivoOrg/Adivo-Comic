export type CommentScope = "comic" | "chapter";

export type CommentReportReason = "spam" | "spoiler" | "harassment" | "inappropriate" | "other";

export interface CommentRecord {
  id: string;
  scope: CommentScope;
  scopeKey: string;
  comicId: string;
  chapterRawId: string | null;
  authorUid: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: number;
  updatedAt: number;
  edited: boolean;
  deleted: boolean;
}

export interface CreateCommentInput {
  scope: CommentScope;
  comicId: string;
  chapterRawId?: string;
  body: string;
}

export interface UpdateCommentInput {
  body: string;
}

export interface ReportCommentInput {
  reason: CommentReportReason;
  details?: string;
}
