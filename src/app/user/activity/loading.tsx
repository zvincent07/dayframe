import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
