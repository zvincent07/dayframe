import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}
