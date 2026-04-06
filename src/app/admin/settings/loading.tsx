import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
           <Skeleton className="h-10 w-full" />
           <Skeleton className="h-10 w-full" />
           <Skeleton className="h-10 w-full" />
        </div>
        <div className="md:col-span-3">
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
