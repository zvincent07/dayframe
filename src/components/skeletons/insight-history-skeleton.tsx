import { Skeleton } from "@/components/ui/skeleton";

export function InsightHistoryFeedSkeleton() {
  return (
    <div className="flex min-h-[320px] w-full flex-1 flex-col md:min-h-[420px]">
      <div className="flex shrink-0 flex-col gap-4 border-b border-zinc-200 p-6 pb-4 pr-14 dark:border-zinc-800/50 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="shrink-0 border-b border-zinc-200 px-6 pb-4 dark:border-zinc-800/50">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6 md:grid md:grid-cols-12">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background/50 md:col-span-4 lg:col-span-4">
          <div className="flex-1 space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="hidden min-h-[240px] flex-col rounded-xl border border-border bg-card/30 p-6 md:col-span-8 md:flex lg:col-span-8">
          <Skeleton className="mb-6 h-8 w-48" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
