import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function TodaySkeleton() {
  return (
    <div className="space-y-4 pb-10 md:space-y-8 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1 pr-4">
          <Skeleton className="h-7 w-24 sm:h-9 sm:w-32" />
          <Skeleton className="h-4 w-48 max-w-full sm:h-[18px]" />
          <Skeleton className="mt-1 h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="mt-2 h-11 w-full shrink-0 rounded-md sm:mt-0 sm:h-10 sm:w-40" />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex min-h-[64px] flex-col justify-between rounded-lg border border-border/50 bg-card px-3 py-2 shadow-sm sm:min-h-0 sm:px-4 sm:py-2"
          >
            <Skeleton className="mb-2 h-3 w-24" />
            <div className="flex items-end justify-between">
              <Skeleton className="h-9 w-10 sm:h-10 sm:w-12" />
              <Skeleton className="h-5 w-5 shrink-0 rounded-full sm:h-5 sm:w-5" />
            </div>
          </div>
        ))}
      </div>

      <section className="col-span-full w-full space-y-4" aria-hidden>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-5 w-36 sm:h-6 sm:w-40" />
          </div>
        </div>
        <Skeleton className="h-3 w-56 px-1 md:hidden" />
        <div className="md:hidden -mx-4 flex gap-3 overflow-hidden pb-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-[min(17.5rem,calc(100vw-2rem))] shrink-0 rounded-xl" />
          ))}
        </div>
        <div className="hidden gap-3 md:grid md:grid-cols-7">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:auto-rows-fr">
        <section className="min-h-0 md:h-[450px]">
          <Card className="h-full">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-md" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
        <section className="flex min-h-0 flex-col gap-4 md:h-[450px] md:gap-6">
          <Card className="min-h-0 flex-1">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full rounded-md" />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
