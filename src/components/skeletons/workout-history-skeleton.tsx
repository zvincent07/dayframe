import { Skeleton } from "@/components/ui/skeleton";

export function WorkoutHistoryFeedSkeleton() {
  return (
    <div className="flex h-full min-h-[320px] w-full flex-col md:min-h-[420px]">
      <div className="flex shrink-0 flex-col gap-4 border-b border-border pb-4 pl-6 pr-14 pt-6 sm:pr-16 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full max-w-[220px] rounded-md" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
