import type { IWorkoutEntry } from "@/models/JournalWorkouts";

interface WorkoutDoc {
  workouts: IWorkoutEntry[];
}

export interface ProfileWorkoutMetrics {
  workoutsLogged: number;
  totalVolumeRounded: number;
}

export function getProfileWorkoutMetrics(workoutHistory: unknown): ProfileWorkoutMetrics {
  if (!Array.isArray(workoutHistory)) {
    return { workoutsLogged: 0, totalVolumeRounded: 0 };
  }
  const docs = workoutHistory as WorkoutDoc[];
  const workoutsLogged = docs.filter((d) => Array.isArray(d.workouts) && d.workouts.length > 0).length;
  const totalVolume = docs.reduce((acc, doc) => {
    const w = Array.isArray(doc.workouts) ? doc.workouts : [];
    return (
      acc +
      w.reduce((s, entry) => {
        const hist = Array.isArray(entry.history) ? entry.history : [];
        return (
          s +
          hist.reduce((sv, h) => {
            const weight =
              typeof h?.actualWeight === "number"
                ? h.actualWeight
                : typeof h?.targetWeight === "number"
                  ? h.targetWeight
                  : 0;
            const reps =
              typeof h?.actualReps === "number" ? h.actualReps : typeof h?.targetReps === "number" ? h.targetReps : 0;
            return sv + (h?.completed ? weight * reps : 0);
          }, 0)
        );
      }, 0)
    );
  }, 0);
  return { workoutsLogged, totalVolumeRounded: Math.round(totalVolume) };
}
