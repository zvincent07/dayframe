import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col h-[350px]">
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <Skeleton className="h-full w-full rounded-md" />
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col h-[350px]">
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
