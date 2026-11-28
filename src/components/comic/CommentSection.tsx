"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Flag, MessageSquare, Pencil, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiRequest, ClientApiError } from "@/lib/http/client-api";
import type { CommentRecord, CommentReportReason, CommentScope } from "@/types/comment";

export interface CommentSectionProps {
  scope: CommentScope;
  comicId: string;
  chapterRawId?: string | null;
  heading?: string;
}

const REPORT_REASONS: Array<{ value: CommentReportReason; label: string }> = [
  { value: "spam", label: "Spam or self-promotion" },
  { value: "spoiler", label: "Unmarked spoiler" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other issue" }
];

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function CommentSection({
  scope,
  comicId,
  chapterRawId,
  heading
}: CommentSectionProps) {
  const { user, getIdToken } = useAuth();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reportTarget, setReportTarget] = useState<CommentRecord | null>(null);
  const [reportReason, setReportReason] = useState<CommentReportReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams({ scope, comicId });
    if (scope === "chapter" && chapterRawId) {
      params.set("chapterRawId", chapterRawId);
    }
    return params.toString();
  }, [scope, comicId, chapterRawId]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiRequest<CommentRecord[]>(`/api/comments?${buildQueryString()}`);
      setComments(res.data);
    } catch (error) {
      if (error instanceof ClientApiError && error.code === "COMMENTS_UNAVAILABLE") {
        setLoadError("Comments will be available once Firebase Admin is configured on the server.");
      } else {
        setLoadError("Unable to load comments right now.");
      }
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function handlePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      return;
    }
    setActionError(null);
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setActionError("Please sign in to post a comment.");
        return;
      }
      const res = await apiRequest<CommentRecord>("/api/comments", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          scope,
          comicId,
          ...(scope === "chapter" && chapterRawId ? { chapterRawId } : {}),
          body: body.trim()
        })
      });
      setComments((prev) => [res.data, ...prev]);
      setBody("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(commentId: string) {
    if (!editBody.trim()) {
      return;
    }
    setActionError(null);
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setActionError("Please sign in again to edit your comment.");
        return;
      }
      const res = await apiRequest<CommentRecord>(
        `/api/comments/${encodeURIComponent(commentId)}?${buildQueryString()}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ body: editBody.trim() })
        }
      );
      setComments((prev) => prev.map((item) => (item.id === commentId ? res.data : item)));
      setEditingId(null);
      setEditBody("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setActionError(null);
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setActionError("Please sign in again to delete your comment.");
        return;
      }
      await apiRequest(`/api/comments/${encodeURIComponent(commentId)}?${buildQueryString()}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments((prev) => prev.filter((item) => item.id !== commentId));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportTarget) {
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setActionError("Please sign in to report a comment.");
        return;
      }
      await apiRequest(`/api/comments/${encodeURIComponent(reportTarget.id)}?${buildQueryString()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails.trim() || undefined
        })
      });
      setReportFeedback("Report submitted. Thank you for helping keep discussions clean.");
      setReportTarget(null);
      setReportDetails("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-accent" aria-hidden="true" />
          <h2 id="comments-heading" className="font-display text-lg font-semibold text-ink">
            {heading || (scope === "chapter" ? "Chapter Comments" : "Series Comments")}
          </h2>
        </div>
        <span className="text-xs text-ink-muted">{comments.length} posted</span>
      </div>

      <Card className="p-4 sm:p-5">
        {user ? (
          <form onSubmit={handlePost} className="space-y-3">
            <label htmlFor={`comment-input-${scope}`} className="sr-only">
              Write a comment
            </label>
            <textarea
              id={`comment-input-${scope}`}
              rows={3}
              maxLength={1000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                scope === "chapter"
                  ? "Share your thoughts on this chapter..."
                  : "Share your thoughts on this series..."
              }
              className="w-full resize-y rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-ink-muted">{body.length}/1000</span>
              <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Post comment
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-secondary">
              Sign in to join the discussion and post comments.
            </p>
            <Link
              href="/auth"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-4 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Sign in
            </Link>
          </div>
        )}

        {actionError ? (
          <p role="alert" className="mt-3 rounded-xl bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
            {actionError}
          </p>
        ) : null}

        {reportFeedback ? (
          <p role="status" className="mt-3 rounded-xl bg-status-success/10 px-3 py-2 text-xs text-status-success">
            {reportFeedback}
          </p>
        ) : null}
      </Card>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="space-y-2.5 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : loadError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-ink-secondary">{loadError}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadComments()}>
            Retry
          </Button>
        </Card>
      ) : comments.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-ink-secondary">
            No comments yet. Be the first to start the conversation.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isOwner = user?.uid === comment.authorUid;
            const isEditing = editingId === comment.id;

            return (
              <Card key={comment.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                      {comment.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{comment.authorName}</p>
                      <p className="text-xs text-ink-muted">
                        {formatRelativeTime(comment.createdAt)}
                        {comment.edited ? " · Edited" : ""}
                      </p>
                    </div>
                  </div>

                  {user ? (
                    <div className="flex items-center gap-1">
                      {isOwner ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit comment"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditBody(comment.body);
                            }}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete comment"
                            disabled={submitting}
                            onClick={() => void handleDelete(comment.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Report comment"
                          onClick={() => {
                            setReportFeedback(null);
                            setReportTarget(comment);
                          }}
                        >
                          <Flag className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-2.5">
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-accent"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={submitting || !editBody.trim()}
                        onClick={() => void handleSaveEdit(comment.id)}
                      >
                        Save changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-secondary">
                    {comment.body}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        title="Report comment"
        variant="modal"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="report-reason" className="text-sm font-medium text-ink-secondary">
              Reason
            </label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value as CommentReportReason)}
              className="h-11 w-full rounded-xl border border-border bg-canvas px-3 text-sm text-ink focus:border-accent"
            >
              {REPORT_REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="report-details" className="text-sm font-medium text-ink-secondary">
              Additional context (optional)
            </label>
            <textarea
              id="report-details"
              rows={3}
              maxLength={300}
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              placeholder="Briefly describe the issue..."
              className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReportTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              Submit report
            </Button>
          </div>
        </form>
      </Sheet>
    </section>
  );
}
