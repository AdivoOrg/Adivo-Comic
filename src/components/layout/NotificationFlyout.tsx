"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { listNotifications, markNotificationRead } from "@/services/user-data";
import type { UserNotification } from "@/types/user";

export function NotificationFlyout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await listNotifications(user.uid);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (user) {
      void loadItems();
    }
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, user, loadItems]);

  const unreadCount = items.filter((item) => !item.read).length;

  async function handleMarkRead(notificationId: string) {
    if (!user) {
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    );
    try {
      await markNotificationRead(user.uid, notificationId);
    } catch {
      void loadItems();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-4 shadow-floating"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-display text-sm font-semibold text-ink">Notifications</h2>
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </span>
          </div>

          {!user ? (
            <div className="space-y-3 py-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm text-ink-secondary">
                Sign in to receive chapter update alerts and comment replies.
              </p>
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-4 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
              >
                Sign in
              </Link>
            </div>
          ) : loading ? (
            <div className="py-6 text-center text-xs text-ink-muted">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="space-y-2 py-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm text-ink-secondary">
                No new chapter releases or comment replies yet.
              </p>
            </div>
          ) : (
            <ul className="mt-2 max-h-80 space-y-1.5 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href.startsWith("/") ? item.href : "/"}
                    onClick={() => {
                      if (!item.read) {
                        void handleMarkRead(item.id);
                      }
                      setOpen(false);
                    }}
                    className={`block rounded-xl p-2.5 transition-colors hover:bg-surface-elevated ${
                      item.read ? "opacity-75" : "bg-accent-soft/40"
                    }`}
                  >
                    <p className="text-xs font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-secondary">{item.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
