export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { WorkoutPage } from "@/components/dashboard/workout-page";
import { WorkoutService } from "@/services/workout.service";
import { UserRepository } from "@/repositories/user.repository";

export default async function WorkoutRoute({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const userId = session.user.id;
  if (typeof userId !== "string") redirect("/login");

  const user = await UserRepository.findById(userId);
  const timezone = user?.timezone || "UTC";
  
  // Calculate today in user's timezone if no date param provided
  const { date } = await searchParams;
  const today = date || new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date());

  const [config, logResult] = await Promise.all([
    WorkoutService.getConfig(userId),
    WorkoutService.getWorkoutLog(userId, today),
  ]);

  return (
    <WorkoutPage
      initialConfig={config}
      today={today}
      initialLog={logResult.workouts}
      initialFinished={logResult.finished}
      initialNotes={logResult.notes ?? ""}
      preferredUnits={user?.preferredUnits ?? "metric"}
    />
  );
}

