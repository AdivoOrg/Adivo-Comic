import type { ReactNode } from "react";

export default function ReaderGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      {children}
    </div>
  );
}
