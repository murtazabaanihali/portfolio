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

        {/* Main column skeleton */}
        <div className="min-w-0 space-y-8 sm:space-y-10">
          {/* Featured post skeleton */}
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-2 gap-2">
              <Skeleton className="min-h-[300px]" />
              <div className="flex flex-col justify-center p-5 sm:p-7 md:p-10">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="mt-2.5 h-3.5 w-32 sm:mt-3 sm:h-4" />
                <Skeleton className="mt-3 h-7 w-4/5 sm:mt-4 sm:h-8" />
                <Skeleton className="mt-2.5 h-3.5 w-full sm:mt-3 sm:h-4" />
                <Skeleton className="mt-2 h-3.5 w-2/3 sm:h-4" />
              </div>
            </div>
          </Card>

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
      </div>
    </main>
  );
}
