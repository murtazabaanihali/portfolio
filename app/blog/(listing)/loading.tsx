import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:px-8"
      aria-busy="true"
    >
      <header className="pb-8">
        <Skeleton className="h-12 w-3/4 max-w-xl sm:h-14" />
        <Skeleton className="mt-4 h-5 w-full max-w-md" />
      </header>

      <Separator className="mb-10" />

      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar skeleton */}
        <aside className="w-full">
          <Card className="p-3">
            <Skeleton className="h-9 w-full" />
            <div className="mt-3 flex flex-col gap-1.5">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </Card>
        </aside>

        {/* Main column skeleton */}
        <div className="min-w-0 space-y-10">
          {/* Featured post skeleton */}
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-2">
              <Skeleton className="aspect-[16/10] md:min-h-[320px]" />
              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="mt-3 h-4 w-32" />
                <Skeleton className="mt-4 h-8 w-4/5" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            </div>
          </Card>

          {/* Month divider skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-px flex-1" />
          </div>

          {/* Post rows skeleton */}
          <ol className="space-y-6">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="flex items-start gap-4 border-b border-border/60 pb-6">
                <Skeleton className="size-20 shrink-0 rounded-lg sm:size-24" />
                <div className="w-full space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}
