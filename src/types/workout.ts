export type ExerciseCategory = "push" | "pull" | "legs" | "core" | "other";

export interface Exercise {
  id: string;
  name: string;
  targetMuscle: string;
  category: ExerciseCategory;
}

export interface RoutineExercise {
  id?: string;
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  targetRPE: number;
  targetWeight: string;
  restTime: string;
}

export interface Routine {
  routineId: string;
  name: string;
  exercises: RoutineExercise[];
}

export type RoutineId = string;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeeklySchedule = Record<DayOfWeek, RoutineId | "REST">;

export interface WorkoutSet {
  id: string;
  targetWeight: string;
  targetReps: string;
  actualWeight: string;
  actualReps: string;
  isCompleted: boolean;
  userAdded?: boolean;
}

export interface ActiveExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
}

export interface ActiveSession {
  startTime: Date | null;
  exercises: ActiveExercise[];
}
