import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft aria-hidden className="size-3.5" /> All articles
      </Link>
      <div role="status">
        <span className="sr-only">Loading article…</span>
        <Skeleton className="mt-6 h-9 w-5/6 sm:h-12" />
        <Skeleton className="mt-5 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-3/5" />
        <div className="mt-7 flex items-center gap-3 border-y py-4">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="mt-8 aspect-video rounded-xl" />
      </div>
    </div>
  );
}
