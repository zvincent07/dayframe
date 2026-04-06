import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, CheckCircle2, Dumbbell, TrendingUp } from "lucide-react";

export interface StatsGridProps {
  workoutsLogged: number;
  totalVolume: number;
  taskCompletionPercent: number;
  totalJournalEntries: number;
  journalStreak: number;
}

export function StatsGrid({
  workoutsLogged,
  totalVolume,
  taskCompletionPercent,
  totalJournalEntries,
  journalStreak,
}: StatsGridProps) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle>All-Time Stats</CardTitle>
        <CardDescription>Overview of your progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group rounded-xl border border-border/50 bg-muted/30 p-5 hover:bg-muted/50 hover:border-border transition-all duration-300 flex flex-col justify-between gap-4 shadow-sm min-h-[112px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Workouts Logged</span>
              <div className="p-2 rounded-md border border-border bg-muted text-muted-foreground group-hover:text-emerald-500 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <span className="text-3xl font-bold tabular-nums text-foreground">{workoutsLogged.toLocaleString()}</span>
          </div>
          <div className="group rounded-xl border border-border/50 bg-muted/30 p-5 hover:bg-muted/50 hover:border-border transition-all duration-300 flex flex-col justify-between gap-4 shadow-sm min-h-[112px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Total Volume</span>
              <div className="p-2 rounded-md border border-border bg-muted text-muted-foreground group-hover:text-emerald-500 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {totalVolume.toLocaleString()}{" "}
              <span className="text-sm font-medium text-muted-foreground">kg</span>
            </span>
          </div>
          <div className="group rounded-xl border border-border/50 bg-muted/30 p-5 hover:bg-muted/50 hover:border-border transition-all duration-300 flex flex-col justify-between gap-4 shadow-sm min-h-[112px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Task Completion</span>
              <div className="p-2 rounded-md border border-border bg-muted text-muted-foreground group-hover:text-emerald-500 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <span className="text-3xl font-bold tabular-nums text-foreground">{taskCompletionPercent}%</span>
          </div>
          <div className="group rounded-xl border border-border/50 bg-muted/30 p-5 hover:bg-muted/50 hover:border-border transition-all duration-300 flex flex-col justify-between gap-4 shadow-sm min-h-[112px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Journaling</span>
              <div className="p-2 rounded-md border border-border bg-muted text-muted-foreground group-hover:text-emerald-500 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {totalJournalEntries.toLocaleString()}
              </span>
              <p className="text-xs text-muted-foreground mt-1">{journalStreak} day streak</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
