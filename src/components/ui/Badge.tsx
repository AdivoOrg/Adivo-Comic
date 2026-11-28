import type { ReactNode } from "react";

type BadgeTone = "accent" | "neutral" | "success" | "warning" | "danger";

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  accent: "bg-accent-soft text-accent border-accent/20",
  neutral: "bg-surface-elevated text-ink-secondary border-border",
  success: "bg-status-success/15 text-status-success border-status-success/25",
  warning: "bg-status-warning/15 text-status-warning border-status-warning/25",
  danger: "bg-status-danger/15 text-status-danger border-status-danger/25"
};

export function Badge({ tone = "neutral", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
