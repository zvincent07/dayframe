import { CheckCircle2, Flame, BookOpen } from "lucide-react";
interface OverviewStatsProps {
  tasksCompletedToday: number;
  streak: number;
  totalEntries: number;
}

export function OverviewStats({
  tasksCompletedToday,
  streak,
  totalEntries,
}: OverviewStatsProps) {
  const stats = [
    {
      label: "Done today",
      value: tasksCompletedToday,
      icon: CheckCircle2,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Day streak",
      value: streak,
      icon: Flame,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Journal entries",
      value: totalEntries,
      icon: BookOpen,
      accent: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
      {stats.map(({ label, value, icon: Icon, accent }) => {
        const isZero = value === 0;
        return (
          <div
            key={label}
            className="flex min-h-[64px] flex-col justify-between rounded-lg border border-border/50 bg-card px-3 py-2 shadow-sm sm:min-h-0 sm:px-4 sm:py-2"
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <div className="mt-1 flex items-baseline justify-between gap-1 sm:mt-1.5">
              <span
                className={`tabular-nums tracking-tight font-bold text-3xl ${isZero ? "text-muted-foreground/70" : "text-foreground"}`}
              >
                {value}
              </span>
              <Icon
                className={`h-4 w-4 shrink-0 opacity-80 sm:h-5 sm:w-5 ${accent}`}
                aria-hidden
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
