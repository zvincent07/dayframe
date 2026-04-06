import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/** Mirrors EmbeddedBrowser chrome: tab strip, toolbar, content area. */
export function BrowserSkeleton() {
  return (
    <Card className="flex min-h-[50vh] flex-1 flex-col overflow-hidden md:min-h-[60vh]">
      <div className="flex shrink-0 items-center overflow-x-auto border-b border-border bg-muted/30">
        <div className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-9 min-w-[120px] max-w-[200px] shrink-0 rounded-none border-r border-border"
            />
          ))}
        </div>
        <Skeleton className="mx-1 h-9 w-9 shrink-0 rounded-md" />
        <div className="flex shrink-0 gap-0.5 pr-1">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-1.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
        <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
        <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
        <Skeleton className="h-7 min-w-0 flex-1 rounded-md" />
      </div>
      <CardContent className="min-h-0 flex-1 bg-muted/20 p-0">
        <Skeleton className="h-full min-h-[200px] w-full rounded-none" />
      </CardContent>
    </Card>
  );
}
