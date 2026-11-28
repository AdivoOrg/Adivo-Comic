"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, History, Home, Search } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Bookmark },
  { href: "/history", label: "History", icon: History }
] as const;

export function FloatingNav() {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 64 && currentY > lastY) {
        setCompact(true);
      } else if (currentY < lastY - 12 || currentY <= 32) {
        setCompact(false);
      }
      lastY = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Primary navigation"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3"
    >
      <div
        className={`pointer-events-auto flex items-center gap-1 rounded-full border border-border-strong/80 bg-surface/90 shadow-floating backdrop-blur-md transition-all duration-200 ${
          compact ? "px-2 py-1.5" : "px-2.5 py-2"
        }`}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full transition-all duration-200 ${
                compact ? "px-3" : "px-3.5 sm:px-4"
              } ${
                active
                  ? "bg-accent text-accent-foreground shadow-soft"
                  : "text-ink-secondary hover:bg-surface-elevated hover:text-ink"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span
                className={`text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  compact ? "hidden" : "hidden sm:inline"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
