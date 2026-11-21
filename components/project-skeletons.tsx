import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectGridSkeleton() {
    return (
        <div role="status" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <span className="sr-only">Loading projects…</span>
            {[0, 1, 2].map(index => (
                <Card key={index} aria-hidden="true" className="overflow-hidden">
                    <Skeleton className="aspect-video rounded-none" />
                    <div className="space-y-3 p-6">
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                </Card>
            ))}
        </div>
    );
}

export function ProjectDetailSkeleton() {
    return (
        <div role="status">
            <span className="sr-only">Loading project…</span>
            <Skeleton className="h-9 w-3/4 sm:h-12" />
            <Skeleton className="mt-3 h-5 w-5/6" />
            <Skeleton className="mt-8 aspect-[2] rounded-xl" />
        </div>
    );
}
