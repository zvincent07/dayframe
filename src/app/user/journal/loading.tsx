import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingJournalPage() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton showActions />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-12 lg:items-stretch">
        {/* Notes */}
        <Card className="flex flex-col overflow-hidden sm:col-span-12 lg:col-span-8 lg:h-[470px]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-12" />
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0 p-6 pt-0 overflow-hidden">
            <div className="flex flex-col gap-3 h-full">
              <Skeleton className="h-8 w-2/3" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[95%]" />
                <Skeleton className="h-4 w-[92%]" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[88%]" />
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-4 w-[80%]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card className="flex flex-col overflow-hidden sm:col-span-12 lg:col-span-4 lg:h-[470px]">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle>
              <Skeleton className="h-5 w-24" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-full gap-4 p-6 pt-0">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Food track */}
        <Card className="flex flex-col min-h-[320px] sm:col-span-12 lg:col-span-6">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-40" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 min-h-0 p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-3">
                <Skeleton className="h-16 w-16 rounded-md" />
                <Skeleton className="h-16 w-16 rounded-md" />
                <Skeleton className="h-16 w-16 rounded-md" />
                <Skeleton className="h-16 w-16 rounded-md" />
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Today's total spent */}
        <Card className="flex flex-col min-h-[320px] sm:col-span-12 lg:col-span-6">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-28" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 min-h-0 p-6 pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
