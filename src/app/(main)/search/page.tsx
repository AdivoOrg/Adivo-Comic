import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchCatalogClient } from "@/components/comic/SearchCatalogClient";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Search"
};

export default function SearchPage() {
  return (
    <Suspense fallback={<Skeleton className="h-12 w-full rounded-2xl" />}>
      <SearchCatalogClient />
    </Suspense>
  );
}
