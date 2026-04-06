import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <Skeleton className="h-10 w-full sm:max-w-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[130px]" />
            <Skeleton className="h-10 w-[130px]" />
            <Skeleton className="h-10 w-[110px]" />
          </div>
        </div>
        <div className="rounded-md border p-4">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
