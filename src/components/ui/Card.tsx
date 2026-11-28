import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  children: ReactNode;
}

export function Card({ elevated = false, className = "", children, ...props }: CardProps) {
  const surfaceClass = elevated ? "bg-surface-elevated shadow-soft" : "bg-surface";
  return (
    <div
      className={`rounded-2xl border border-border ${surfaceClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
