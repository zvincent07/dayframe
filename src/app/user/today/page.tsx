import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Book } from "lucide-react";
import { WeeklyPlanner } from "@/components/dashboard/weekly-planner";
import { TaskList } from "@/components/dashboard/task-list";
import { QuoteBoard } from "@/components/dashboard/quote-board";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { getWeeklyFocus } from "@/actions/weekly-focus";
import { getTasks } from "@/actions/tasks";
import { getQuotes } from "@/actions/quotes";
import { getJournalStats } from "@/actions/journal";
import { UserRepository } from "@/repositories/user.repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;


export default async function TodayPage() {
  const session = await auth();

  if (!session?.user) {
    return <div>Not authenticated</div>;
  }

  const { name, username } = session.user;
  const userId = session.user.id;
  if (typeof userId !== "string") {
    return <div>Not authenticated</div>;
  }

  const [weeklyFocus, dailyTasks, quotes, journalStats, dbUser] = await Promise.all([
    getWeeklyFocus(),
    getTasks(),
    getQuotes(),
    getJournalStats(),
    UserRepository.findById(userId),
  ]);

  const tasksCompletedToday = dailyTasks.filter((t: { isCompleted: boolean }) => t.isCompleted).length;
  const dayStreak = journalStats.streak;
  const randomQuote = quotes.length > 0 ? quotes[Math.floor(Math.random() * quotes.length)].content : null;

  const timezone = dbUser?.timezone || "UTC";
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });
  const serverTodayStr = formatter.format(new Date());

  return (
    <div className="w-full space-y-4 pb-10 md:space-y-8 md:pb-0">
      {/* Header: compact on mobile so stats stay above the fold */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Today</h1>
          <p className="text-sm font-medium text-muted-foreground">
            Welcome back, {name || username || "User"}.
          </p>
          {randomQuote && (
            <p className="mt-1 max-w-3xl text-xs sm:text-sm font-medium italic leading-relaxed text-muted-foreground line-clamp-2 sm:line-clamp-none">
              &quot;{randomQuote}&quot;
            </p>
          )}
        </div>
        <Button asChild className="font-semibold shadow-md hover:shadow-lg transition-all w-full sm:w-auto min-h-10 shrink-0 mt-2 sm:mt-0">
          <Link href="/user/journal" className="flex items-center justify-center">
            <Book className="mr-2 h-4 w-4 shrink-0" />
            New Entry
          </Link>
        </Button>
      </div>

      {/* Progress stats: always visible, compact on mobile */}
      <OverviewStats
        tasksCompletedToday={tasksCompletedToday}
        streak={dayStreak}
        totalEntries={journalStats.totalEntries}
      />

      {/* Weekly Planner */}
      <section className="w-full overflow-x-auto" aria-label="Weekly focus">
        <WeeklyPlanner
          initialTasks={weeklyFocus?.tasks || {}}
          weekStartsOn={dbUser?.firstDayOfWeek ?? "sunday"}
        />
      </section>

      {/* Tasks and Quotes: more balanced grid on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start xl:gap-8">
        <section className="lg:col-span-8 h-full" aria-label="Tasks for today">
          <TaskList initialTasks={dailyTasks} initialDateStr={serverTodayStr} />
        </section>
        <section className="lg:col-span-4 h-full flex flex-col gap-4" aria-label="Daily quotes and widgets">
          <QuoteBoard initialQuotes={quotes} />
        </section>
      </div>
    </div>
  );
}
