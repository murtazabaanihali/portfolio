import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PostListSkeleton({ featured = true }: { featured?: boolean }) {
  return (
    <div role="status" className="min-w-0 space-y-8 sm:space-y-10">
      <span className="sr-only">Loading articles…</span>
      {featured && <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2">
          <Skeleton className="aspect-[16/10] rounded-none sm:aspect-video md:aspect-auto md:min-h-[300px]" />
          <div className="flex flex-col justify-center p-5 sm:p-7 md:p-10">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="mt-2.5 h-3.5 w-32 sm:mt-3 sm:h-4" />
            <Skeleton className="mt-3 h-7 w-4/5 sm:mt-4 sm:h-8" />
            <Skeleton className="mt-2.5 h-3.5 w-full sm:mt-3 sm:h-4" />
            <Skeleton className="mt-2 h-3.5 w-2/3 sm:h-4" />
          </div>
        </div>
      </Card>}

      {/* Month divider skeleton */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Skeleton className="h-3.5 w-24 sm:h-4" />
        <Skeleton className="h-px flex-1" />
      </div>

      {/* Post rows skeleton */}
      <ol className="space-y-4 sm:space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <li
            key={i}
            className="flex items-start gap-3.5 border-b border-border/60 pb-4 sm:gap-6 sm:pb-6"
          >
            <Skeleton className="size-16 shrink-0 rounded-lg sm:size-24" />
            <div className="w-full space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-3/4 sm:h-6" />
              <Skeleton className="h-3.5 w-full sm:h-4" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
