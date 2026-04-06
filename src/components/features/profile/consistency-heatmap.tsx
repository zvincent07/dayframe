import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface ConsistencyHeatmapProps {
  heatmap: { date: string; level: number }[];
}

export function ConsistencyHeatmap({ heatmap }: ConsistencyHeatmapProps) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle>Consistency</CardTitle>
        <CardDescription>Daily activity overview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-2 w-full px-1">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
        <div className="grid grid-cols-24 gap-[3px]">
          {heatmap.map(({ date, level }) => {
            const cls =
              level === 0
                ? "bg-muted dark:bg-zinc-800/40"
                : level === 1
                  ? "bg-emerald-200 dark:bg-emerald-900/50"
                  : level === 2
                    ? "bg-emerald-300 dark:bg-emerald-700/60"
                    : "bg-emerald-400 dark:bg-emerald-500/70";
            return (
              <div
                key={date}
                className={`h-3 w-3 rounded-sm ${cls}`}
                title={`${date} • Level ${level}`}
                aria-label={`${date} activity level ${level}`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div>Last 365 days</div>
          <div className="flex items-center gap-2">
            <span>Less</span>
            <div className="h-3 w-3 rounded-sm bg-muted dark:bg-zinc-800/30" />
            <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/50" />
            <div className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-800/60" />
            <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-600/70" />
            <div className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-400/80" />
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
