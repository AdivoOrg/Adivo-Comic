import type { ReactNode } from "react";
import { BrandWordmark } from "@/components/layout/BrandWordmark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <BrandWordmark height={26} priority />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
