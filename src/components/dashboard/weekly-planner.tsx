'use client';

import { useState, useTransition, useLayoutEffect, useRef } from 'react';
import { updateWeeklyFocus } from '@/actions/weekly-focus';
import { toast } from 'sonner';
import { Loader2, Target } from 'lucide-react';
import { DAYS_SUN_FIRST } from '@/lib/constants';

interface WeeklyPlannerProps {
  initialTasks: Record<string, string>;
  /** Server preference; Monday-first reorders columns (Mon–Sun). */
  weekStartsOn?: 'sunday' | 'monday';
}

function orderedDays(weekStartsOn: 'sunday' | 'monday') {
  if (weekStartsOn === 'sunday') return [...DAYS_SUN_FIRST];
  return [...DAYS_SUN_FIRST.slice(1), DAYS_SUN_FIRST[0]];
}

function readFirstDayFromLs(): 'sunday' | 'monday' | null {
  try {
    const v = localStorage.getItem('df_first_day_of_week');
    return v === 'monday' || v === 'sunday' ? v : null;
  } catch {
    return null;
  }
}

/** Prefer server Monday; if server still Sunday, trust localStorage (same-tab settings save). */
function resolveWeekStartsOn(server: 'sunday' | 'monday'): 'sunday' | 'monday' {
  if (server === 'monday') return 'monday';
  const ls = readFirstDayFromLs();
  if (ls === 'monday') return 'monday';
  if (ls === 'sunday') return 'sunday';
  return server;
}

function DayColumn({
  dayLabel,
  isToday,
  value,
  onChange,
  onBlur,
}: {
  dayLabel: string;
  isToday: boolean;
  value: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
}) {
  const wrapperBase = "group flex flex-col items-center justify-center p-4 md:min-h-[128px] rounded-xl border transition-all duration-300 shadow-sm";
  const wrapperClasses = isToday
    ? `${wrapperBase} bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-emerald-500/10`
    : `${wrapperBase} border-border/50 bg-card dark:bg-[#18181b] hover:bg-zinc-50 dark:hover:bg-[#18181b]/90 hover:border-border hover:shadow-md`;
  const labelClasses = isToday
    ? "text-[10px] font-bold uppercase tracking-[0.15em] mb-2 text-emerald-500 dark:text-emerald-400"
    : "text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.15em] mb-2 group-hover:text-foreground transition-colors";
  return (
    <div className={wrapperClasses}>
      <span className={labelClasses}>{dayLabel}</span>
      <input
        type="text"
        maxLength={21}
        className="w-full border-none bg-transparent p-0 text-center text-xs font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 sm:text-sm tracking-tight"
        placeholder="Focus..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
      />
    </div>
  );
}

export function WeeklyPlanner({ initialTasks, weekStartsOn = 'sunday' }: WeeklyPlannerProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const [resolvedWeekStart, setResolvedWeekStart] = useState<'sunday' | 'monday'>(weekStartsOn);

  useLayoutEffect(() => {
    const apply = () => setResolvedWeekStart(resolveWeekStartsOn(weekStartsOn));
    apply();
    window.addEventListener('df-first-day-updated', apply);
    return () => window.removeEventListener('df-first-day-updated', apply);
  }, [weekStartsOn]);

  const days = orderedDays(resolvedWeekStart);

  const handleBlur = async (dayKey: string, value: string) => {
    if (value === initialTasks[dayKey]) return; // No change

    startTransition(async () => {
      const result = await updateWeeklyFocus({ [dayKey]: value });
      if (result.error) {
        toast.error('Failed to save task.');
      }
    });
  };

  const handleChange = (dayKey: string, value: string) => {
    setTasks((prev) => ({ ...prev, [dayKey]: value }));
  };

  const todayDow = new Date().getDay();
  const todayKey = DAYS_SUN_FIRST[todayDow]?.key;
  const todayIndex = todayKey ? days.findIndex((d) => d.key === todayKey) : -1;
  
  // Create an extended array for a pseudo-infinite carousel effect (5 weeks)
  const mobileDays = [...days, ...days, ...days, ...days, ...days];
  const mobileTodayIndex = todayIndex >= 0 ? days.length * 2 + todayIndex : -1;

  const mobileScrollRef = useRef<HTMLDivElement>(null);

  /** Matches slide width `min(17.5rem, calc(100vw - 2rem))` — half-width inset centers first/last slides */
  const mobileCarouselInset =
    "max(0px, calc(50vw - min(8.75rem, calc((100vw - 2rem) / 2))))";

  useLayoutEffect(() => {
    const container = mobileScrollRef.current;
    if (!container || mobileTodayIndex < 0) return;

    const scrollTodayIntoCenter = () => {
      const slide = container.children[mobileTodayIndex] as HTMLElement | undefined;
      if (!slide) return;
      const targetLeft = slide.offsetLeft - container.clientWidth / 2 + slide.offsetWidth / 2;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      container.scrollLeft = Math.min(Math.max(0, targetLeft), maxScroll);
    };

    scrollTodayIntoCenter();
    window.addEventListener("resize", scrollTodayIntoCenter);
    return () => window.removeEventListener("resize", scrollTodayIntoCenter);
  }, [todayIndex, days, resolvedWeekStart]);

  return (
    <div className="col-span-full w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-500" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Weekly Focus</h2>
        </div>
        {isPending && (
          <div className="flex animate-pulse items-center text-xs text-muted-foreground">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden /> Saving...
          </div>
        )}
      </div>

      <p className="px-1 text-xs text-muted-foreground md:hidden">
        Swipe to see each day — today is highlighted.
      </p>

      {/* Mobile: horizontal snap carousel; symmetric inset so first/last slides can center like middle ones */}
      <div
        ref={mobileScrollRef}
        className="md:hidden -mx-4 flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingLeft: mobileCarouselInset,
          paddingRight: mobileCarouselInset,
        }}
        aria-label="Weekly focus by day"
      >
        {mobileDays.map((day, i) => {
          // Emphasize the center "Today" tile, but style all instances of today universally
          const isCenterToday = i === mobileTodayIndex;
          const isToday = day.key === todayKey;
          return (
            <div
              key={`${day.key}-${i}`}
              className="w-[min(17.5rem,calc(100vw-2rem))] shrink-0 snap-center snap-always"
            >
              <DayColumn
                dayLabel={isCenterToday ? `${day.label} · Today` : day.label}
                isToday={isToday}
                value={tasks[day.key] || ''}
                onChange={(v) => handleChange(day.key, v)}
                onBlur={(v) => handleBlur(day.key, v)}
              />
            </div>
          );
        })}
      </div>

      {/* Desktop: full week grid */}
      <div className="hidden gap-3 md:grid md:grid-cols-7">
        {days.map((day) => (
          <DayColumn
            key={day.key}
            dayLabel={day.label}
            isToday={day.key === todayKey}
            value={tasks[day.key] || ''}
            onChange={(v) => handleChange(day.key, v)}
            onBlur={(v) => handleBlur(day.key, v)}
          />
        ))}
      </div>
    </div>
  );
}
