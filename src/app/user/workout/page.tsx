import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { WorkoutPage } from "@/components/dashboard/workout-page";
import { WorkoutService } from "@/services/workout.service";
import { UserRepository } from "@/repositories/user.repository";

export default async function WorkoutRoute() {
  const session = await auth();
  if (!session?.user) redirect("/");
  const userId = session.user.id;
  if (typeof userId !== "string") redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");
  const [config, logResult, user] = await Promise.all([
    WorkoutService.getConfig(userId),
    WorkoutService.getWorkoutLog(userId, today),
    UserRepository.findById(userId),
  ]);

  return (
    <WorkoutPage
      initialConfig={config}
      today={today}
      initialLog={logResult.workouts}
      initialFinished={logResult.finished}
      preferredUnits={user?.preferredUnits ?? "metric"}
    />
  );
}

