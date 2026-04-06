import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageHeaderSkeletonProps {
  showDescription?: boolean;
  showActions?: boolean;
  className?: string;
}

export function PageHeaderSkeleton({
  showDescription = true,
  showActions = false,
  className,
}: PageHeaderSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-8 w-44 max-w-full sm:h-9 sm:w-56" />
        {showDescription ? (
          <Skeleton className="h-4 w-full max-w-md sm:h-[18px]" />
        ) : null}
      </div>
      {showActions ? (
        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Skeleton className="h-9 w-full rounded-md sm:w-40" />
        </div>
      ) : null}
    </div>
  );
}
