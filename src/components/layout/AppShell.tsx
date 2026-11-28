import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { FloatingNav } from "./FloatingNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <FloatingNav />
    </div>
  );
}
