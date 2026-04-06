import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
         <Card className="col-span-4">
            <CardHeader><Skeleton className="h-6 w-32"/></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
         </Card>
         <Card className="col-span-3">
            <CardHeader><Skeleton className="h-6 w-32"/></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
         </Card>
      </div>
    </div>
  );
}
