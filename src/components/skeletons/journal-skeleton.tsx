import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function JournalSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Editor Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-12 lg:items-stretch">
        <Card className="flex flex-col overflow-hidden sm:col-span-12 lg:col-span-8 lg:h-[470px]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 shrink-0">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-16" />
          </CardHeader>
          <CardContent className="flex-1 p-4">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>

        {/* Sidebar Skeletons */}
        <div className="flex flex-col gap-6 sm:col-span-12 lg:col-span-4 lg:h-[470px]">
          <Card className="flex-1">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-20 w-20 rounded-md" />
                <Skeleton className="h-20 w-20 rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
