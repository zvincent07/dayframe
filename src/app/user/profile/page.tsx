export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { getJournalStats } from "@/actions/journal";
import { ConsistencyHeatmap } from "@/components/features/profile/consistency-heatmap";
import { ProfileCard } from "@/components/features/profile/profile-card";
import { StatsGrid } from "@/components/features/profile/stats-grid";
import { ExportJournalButton } from "@/components/dashboard/export-journal-button";
import { PageHeader } from "@/components/ui/page-header";
import { UserRepository } from "@/repositories/user.repository";
import { DailyTaskService } from "@/services/task.service";
import { WorkoutService } from "@/services/workout.service";
import { format } from "date-fns";
import { getConsistencyHeatmap } from "./actions";
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return <div>Not authenticated</div>;

  const userId = session.user.id;
  const [journalStats, userDoc, workoutAgg, heatmap, allTimeTasks] = await Promise.all([
    getJournalStats(),
    UserRepository.findById(userId),
    WorkoutService.getProfileWorkoutAggregates(userId),
    getConsistencyHeatmap(),
    DailyTaskService.getAllCompletionSummary(userId),
  ]);

  const { workoutsLogged, totalVolumeRounded } = workoutAgg;
  const joinedLabel = userDoc?.createdAt ? format(new Date(userDoc.createdAt), "MMMM yyyy") : format(new Date(), "MMMM yyyy");
  const bioText = userDoc?.bio || "";
  const goals = Array.isArray(userDoc?.goals) ? userDoc!.goals : [];
  const displayName = (userDoc?.name as string) || session.user.name || session.user.username || "User";
  const totalTasksCount = allTimeTasks.completed + allTimeTasks.missed;
  const taskCompletionPercent = totalTasksCount > 0 ? Math.round((allTimeTasks.completed / totalTasksCount) * 100) : 0;
  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : session.user.username?.slice(0, 2).toUpperCase() || "US";
  const profileData = {
    name: displayName,
    joined: joinedLabel,
    bio: bioText,
    goals,
    stats: {
      workoutsLogged,
      totalVolume: totalVolumeRounded,
      taskCompletionPercent,
      journalStreak: journalStats.streak,
      totalJournalEntries: journalStats.totalJournalEntries,
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User Profile" description="Manage your account settings and view your stats." className="mb-8">
        <ExportJournalButton profileData={profileData} />
      </PageHeader>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <ProfileCard
          displayName={displayName}
          email={session.user.email ?? ""}
          image={session.user.image ?? ""}
          initials={initials}
          joinedLabel={joinedLabel}
          bioText={bioText}
          goals={goals}
        />
        <div className="lg:col-span-8 flex flex-col gap-6">
          <StatsGrid
            workoutsLogged={workoutsLogged}
            totalVolume={totalVolumeRounded}
            taskCompletionPercent={taskCompletionPercent}
            totalJournalEntries={journalStats.totalJournalEntries}
            journalStreak={journalStats.streak}
          />
          <ConsistencyHeatmap heatmap={heatmap} />
        </div>
      </div>
    </div>
  );
}
