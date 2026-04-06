import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <div className="p-6 pt-0">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
