"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  variant?: "bottom" | "modal";
  children: ReactNode;
}

export function Sheet({
  open,
  onClose,
  title,
  variant = "bottom",
  children
}: SheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const isBottom = variant === "bottom";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm ${
        isBottom ? "items-end justify-center sm:items-center sm:p-4" : "items-center justify-center p-4"
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`flex max-h-[85vh] w-full flex-col border border-border bg-surface shadow-floating ${
          isBottom
            ? "max-w-xl rounded-t-3xl sm:rounded-3xl"
            : "max-w-md rounded-2xl"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
