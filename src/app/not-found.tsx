import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <EmptyState
          icon={<Compass className="h-6 w-6" aria-hidden="true" />}
          title="Page not found"
          description="The page or comic you are looking for does not exist or may have moved."
          action={
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Return home
            </Link>
          }
        />
      </div>
    </div>
  );
}
