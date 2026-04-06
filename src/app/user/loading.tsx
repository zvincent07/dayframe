import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function UserSegmentLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
