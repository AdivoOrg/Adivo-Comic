import { Suspense } from "react";
import type { Metadata } from "next";
import { ExploreCatalogClient } from "@/components/comic/ExploreCatalogClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Explore"
};

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Card key={index} className="space-y-3 p-3">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-4/5" />
            </Card>
          ))}
        </div>
      }
    >
      <ExploreCatalogClient />
    </Suspense>
  );
}
