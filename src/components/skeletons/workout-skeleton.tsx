import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function WorkoutSkeleton() {
  return (
    <div className="space-y-4 pb-10 md:space-y-8 md:pb-0 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-44 sm:h-9 sm:w-52" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
            <Skeleton className="h-3.5 w-52 max-w-full sm:h-4 sm:w-72" />
          </div>
        </div>
        <div className="mt-1 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:flex-row sm:items-center">
          <Skeleton className="hidden h-9 w-24 shrink-0 rounded-md sm:block" />
          <Skeleton className="h-10 w-full rounded-md sm:h-9 sm:w-auto sm:min-w-[148px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          <div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-44 max-w-[60%]" />
              <Skeleton className="h-9 w-32 shrink-0 rounded-md" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-11 rounded-md" />
              ))}
            </div>
          </div>

          {[0, 1].map((card) => (
            <Card key={card} className="bg-card border-border shadow-sm">
              <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-52 max-w-[75vw]" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-14 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
              </CardHeader>
              <CardContent>
                {[0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className="flex flex-col gap-3 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4 sm:w-1/3 sm:flex-none">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-1/2 sm:flex-nowrap">
                      <Skeleton className="h-10 w-[88px] rounded-md sm:h-9" />
                      <Skeleton className="h-10 w-[88px] rounded-md sm:h-9" />
                      <Skeleton className="h-10 w-10 shrink-0 rounded-md sm:h-9 sm:w-9" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4 lg:sticky lg:top-6 order-first lg:order-none">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-full max-w-[220px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16 max-w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-7 w-full" />
                </div>
                <div className="col-span-2 space-y-2 sm:col-span-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-4 w-full max-w-[8rem]" />
                </div>
              </div>
              <Skeleton className="h-11 w-full rounded-md" />
              <div className="flex justify-center">
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
