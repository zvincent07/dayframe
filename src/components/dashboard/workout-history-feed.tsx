"use client";

import { Fragment, useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addWeeks, endOfWeek, format as fmt, startOfWeek, addDays } from "date-fns";
import type { IWorkoutEntry } from "@/models/JournalWorkouts";
import { WorkoutHistoryFeedSkeleton } from "@/components/skeletons/workout-history-skeleton";

export interface WorkoutDoc {
  _id: string;
  date: string;
  workouts: IWorkoutEntry[];
  finished?: boolean;
}

function computeSummary(doc: WorkoutDoc) {
  let totalSets = 0;
  let completedSets = 0;
  let volume = 0;
  const completedExerciseNames: string[] = [];

  doc.workouts.forEach((w: IWorkoutEntry) => {
    const history: NonNullable<IWorkoutEntry["history"]> = Array.isArray(w.history) ? w.history : [];
    const setsCount = history.length || (typeof w.sets === "number" ? w.sets : 0);
    totalSets += setsCount;

    const isCompleted = history.some((h) => !!h?.completed || h?.actualWeight != null || h?.actualReps != null);
    if (isCompleted) completedExerciseNames.push(String(w.exercise));

    history.forEach((h) => {
      const didComplete = !!h?.completed || h?.actualWeight != null || h?.actualReps != null;
      if (didComplete) {
        completedSets += 1;
        const weight = typeof h.actualWeight === "number" ? h.actualWeight : (typeof h.targetWeight === "number" ? h.targetWeight : 0);
        const reps = typeof h.actualReps === "number" ? h.actualReps : (typeof h.targetReps === "number" ? h.targetReps : 0);
        volume += weight * reps;
      }
    });
  });

  return { totalSets, completedSets, volume, completedExerciseNames };
}

function formatDatePretty(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function WorkoutDayDetailContent({ doc }: { doc: WorkoutDoc }) {
  const list = Array.isArray(doc.workouts) ? doc.workouts : [];

  if (list.length === 0) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>No exercises were stored for this day.</p>
        {doc.finished ? (
          <p className="text-foreground">
            It was marked finished, but the log had no exercise rows (often an empty routine or an older save bug). New finishes save your session correctly; add exercises to this day&apos;s routine and complete a workout again if you need a full log.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {doc.finished ? (
        <p className="text-xs text-muted-foreground">Finished workout — sets below include targets even if not all were checked off in the log.</p>
      ) : null}
      {list.map((w: IWorkoutEntry, idx: number) => {
        const history: NonNullable<IWorkoutEntry["history"]> = Array.isArray(w.history) ? w.history : [];
        const completedRows = history.filter(
          (h) => !!h?.completed || h?.actualWeight != null || h?.actualReps != null,
        );

        return (
          <div key={`${doc._id}-detail-${idx}`} className="border-b border-border pb-4 last:border-0 last:pb-0">
            <h3 className="text-sm font-semibold text-foreground">{String(w.exercise)}</h3>
            {history.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs">
                {history.map((h, sidx: number) => {
                  const wgt = h?.actualWeight ?? h?.targetWeight ?? "—";
                  const reps = h?.actualReps ?? h?.targetReps ?? "—";
                  const done = !!h?.completed || h?.actualWeight != null || h?.actualReps != null;
                  return (
                    <li
                      key={`set-${String(idx)}-${String(sidx)}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/40 px-2 py-1.5"
                    >
                      <span className="text-muted-foreground">Set {String(h?.set ?? sidx + 1)}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {String(wgt)} kg × {String(reps)} reps
                      </span>
                      {done ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Logged
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                          Not logged
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {typeof w.sets === "number" || w.reps
                  ? `Planned: ${typeof w.sets === "number" ? String(w.sets) : "—"} sets${w.reps ? ` · ${String(w.reps)}` : ""}`
                  : "No set rows stored for this exercise."}
              </p>
            )}
            {history.length > 0 && completedRows.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">No sets marked complete — expand targets above.</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const compactCardInteractiveClass =
  "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function WorkoutHistoryFeed({ initialHistory, isLoading }: { initialHistory: WorkoutDoc[], isLoading?: boolean }) {
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(0);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  /** Inline expand — nested Dialog inside the history modal blocked clicks. */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Load first-day-of-week preference
  useEffect(() => {
    try {
      const pref = localStorage.getItem("df_first_day_of_week");
      const ws = pref === "monday" ? 1 : 0;
      setWeekStartsOn(ws);
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: ws }));
    } catch {
      setWeekStartsOn(0);
    }
  }, []);
  const history: WorkoutDoc[] = useMemo(() => (Array.isArray(initialHistory) ? initialHistory : []), [initialHistory]);
  const weekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn }), [currentWeekStart, weekStartsOn]);
  const weekRangeLabel = useMemo(
    () =>
      `${fmt(currentWeekStart, "MMM d, yyyy")} — ${fmt(weekEnd, "MMM d, yyyy")}`,
    [currentWeekStart, weekEnd]
  );

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const fullWeekData = useMemo(() => {
    return weekDates.map(date => {
      const dateStr = fmt(date, "yyyy-MM-dd");
      const foundWorkout = history.find((doc: WorkoutDoc) => {
        const raw = String(doc.date);
        const key = raw.length >= 10 ? raw.slice(0, 10) : raw;
        return key === dateStr;
      });
      
      if (foundWorkout) return { ...foundWorkout, isEmpty: false };
      
      return { 
        _id: `empty-${dateStr}`, 
        date: dateStr, 
        workouts: [], 
        isEmpty: true 
      } as WorkoutDoc & { isEmpty: boolean };
    });
  }, [history, weekDates]);

  if (isLoading) {
    return <WorkoutHistoryFeedSkeleton />;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border shrink-0 pt-6 pl-6 pb-4 pr-14 sm:pr-16">
        <div className="m-0 space-y-1 text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
            Workout History
          </h2>
          <p className="text-sm text-muted-foreground">Recent workout entries</p>
        </div>

        <div className="flex items-center gap-4 bg-muted/50 p-1 rounded-md border border-border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous week"
            onClick={() => setCurrentWeekStart((prev) => addWeeks(prev, -1))}
          >
            ‹
          </Button>
          <span className="text-sm font-medium text-foreground px-2">{weekRangeLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Next week"
            onClick={() => setCurrentWeekStart((prev) => addWeeks(prev, 1))}
          >
            ›
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start items-start">
        {fullWeekData.map((doc: WorkoutDoc & { isEmpty?: boolean }) => {
          const prettyDate = formatDatePretty(doc.date);

          if (doc.isEmpty) {
            return (
              <div key={doc._id} className="flex items-center justify-between rounded-xl border border-border bg-card/80 p-4">
                <span className="text-sm font-medium text-muted-foreground">{prettyDate}</span>
                <Badge variant="outline" className="border-border bg-transparent text-muted-foreground">
                  Rest / No Data
                </Badge>
              </div>
            );
          }

          if (!doc.workouts || doc.workouts.length === 0) {
            return (
              <Fragment key={doc._id}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex items-center justify-between rounded-xl border border-border bg-card/80 p-4 ${compactCardInteractiveClass}`}
                  onClick={() => toggleExpand(doc._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(doc._id);
                    }
                  }}
                  aria-expanded={expandedId === doc._id}
                  aria-label={`View workout details for ${prettyDate}`}
                >
                  <span className="text-sm font-medium text-muted-foreground">{prettyDate}</span>
                  <Badge variant="outline" className="border-border bg-transparent text-muted-foreground">
                    {doc.finished ? "Finished" : "Rest / No Data"}
                  </Badge>
                </div>
                {expandedId === doc._id ? (
                  <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">{prettyDate}</h3>
                    <WorkoutDayDetailContent doc={doc} />
                  </div>
                ) : null}
              </Fragment>
            );
          }

          const summary = computeSummary(doc);

          if (summary.completedSets === 0) {
            return (
              <Fragment key={doc._id}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex items-center justify-between rounded-xl border border-border bg-card/80 p-4 ${compactCardInteractiveClass}`}
                  onClick={() => toggleExpand(doc._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(doc._id);
                    }
                  }}
                  aria-expanded={expandedId === doc._id}
                  aria-label={`View workout details for ${prettyDate}`}
                >
                  <span className="text-sm font-medium text-muted-foreground">{prettyDate}</span>
                  <Badge variant="outline" className="border-border bg-transparent text-muted-foreground">
                    {doc.finished ? "Finished" : "Rest / No Data"}
                  </Badge>
                </div>
                {expandedId === doc._id ? (
                  <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">{prettyDate}</h3>
                    <WorkoutDayDetailContent doc={doc} />
                  </div>
                ) : null}
              </Fragment>
            );
          }

        return (
          <Card key={doc._id} className="bg-card border-border shadow-sm">
            <CardHeader className="mb-2 flex flex-col items-start border-b border-border pb-4 text-left">
              <CardTitle className="text-lg font-bold text-foreground mb-2">{prettyDate}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 justify-start text-xs text-muted-foreground">
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs text-primary">Volume: {Math.round(summary.volume).toLocaleString()}kg</Badge>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs text-primary">Sets: {String(summary.completedSets)} / {String(summary.totalSets)}</Badge>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs text-primary">Exercises: {String(doc.workouts.length)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.isArray(doc.workouts) && doc.workouts.map((w: IWorkoutEntry, idx: number) => {
                const sets: NonNullable<IWorkoutEntry["history"]> = Array.isArray(w.history)
                  ? w.history.filter((h) => h?.completed || h?.actualWeight != null || h?.actualReps != null)
                  : [];
                if (sets.length === 0) return null;
                const best = sets.reduce<{ weight: number; reps: number } | null>((acc, h) => {
                  const weight = typeof h.actualWeight === "number" ? h.actualWeight : (typeof h.targetWeight === "number" ? h.targetWeight : 0);
                  const reps = typeof h.actualReps === "number" ? h.actualReps : (typeof h.targetReps === "number" ? h.targetReps : 0);
                  if (!acc) return { weight, reps };
                  const accVol = acc.weight * acc.reps;
                  const vol = weight * reps;
                  return vol > accVol ? { weight, reps } : acc;
                }, null);
                return (
                  <div key={`${doc._id}-${idx}`} className="mb-4 last:mb-0">
                    <h4 className="text-sm font-semibold text-foreground mb-1">{String(w.exercise)}</h4>
                    {best && (best.weight > 0 || best.reps > 0) && (
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        Best set: {String(best.weight)}kg × {String(best.reps)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {sets.map((h, sidx: number) => {
                        const weight = h?.actualWeight ?? h?.targetWeight ?? 0;
                        const reps = h?.actualReps ?? h?.targetReps ?? 0;
                        return (
                      <span
                            key={`${doc._id}-${idx}-set-${sidx}`}
                            className="inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {String(weight)}kg × {String(reps)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
        </div>
        <div className="h-6 w-full shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
