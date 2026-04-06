import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton showActions />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Profile Card */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex w-full items-start justify-between">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <Skeleton className="h-px w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="space-y-2 pt-4">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Heatmap/Charts */}
          <Card className="h-[300px]">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-full w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
