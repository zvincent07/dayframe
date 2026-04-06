import { z } from "zod";

export const workoutRoutineExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.number().int().min(1),
  targetReps: z.string().min(1),
  targetRPE: z.number().min(1).max(10),
  targetWeight: z.string().optional().default(""),
  restTime: z.string().min(1),
});

export const workoutRoutineSchema = z.object({
  routineId: z.string().min(1),
  name: z.string().min(1),
  exercises: z.array(workoutRoutineExerciseSchema).default([]),
});

export const workoutScheduleSchema = z.object({
  sunday: z.string().min(1),
  monday: z.string().min(1),
  tuesday: z.string().min(1),
  wednesday: z.string().min(1),
  thursday: z.string().min(1),
  friday: z.string().min(1),
  saturday: z.string().min(1),
});

export const workoutConfigSchema = z.object({
  routines: z.array(workoutRoutineSchema).default([]),
  schedule: workoutScheduleSchema.optional(),
});

export type WorkoutRoutineInput = z.infer<typeof workoutRoutineSchema>;
export type WorkoutScheduleInput = z.infer<typeof workoutScheduleSchema>;
export type WorkoutConfig = z.infer<typeof workoutConfigSchema>;

