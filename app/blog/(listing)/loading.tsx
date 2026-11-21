import { PostListSkeleton } from "@/components/blog/post-list-skeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 md:px-8"
      aria-busy="true"
    >
      <header className="pb-6 sm:pb-8">
        <Skeleton className="h-10 w-3/4 max-w-xl sm:h-14" />
        <Skeleton className="mt-3 h-4 w-full max-w-md sm:mt-4 sm:h-5" />
      </header>

      <Separator className="mb-6 sm:mb-10" />

      <div className="grid gap-6 sm:gap-8 md:gap-10 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar skeleton */}
        <aside className="w-full min-w-0">
          <Card className="min-w-0 p-3">
            <Skeleton className="h-9 w-full" />
            <div className="-mx-3 flex gap-3 overflow-hidden px-3 pt-3 md:mx-0 md:flex-col md:px-0 md:pt-3">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton
                  key={i}
                  className="h-7 w-20 shrink-0 rounded-full md:h-8 md:w-full md:shrink md:rounded-md"
                />
              ))}
            </div>
          </Card>
        </aside>

        <PostListSkeleton />
      </div>
    </main>
  );
}
