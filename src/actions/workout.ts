"use server";

import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { WorkoutService } from "@/services/workout.service";
import { revalidatePath } from "next/cache";
import { workoutRoutineSchema, workoutScheduleSchema } from "@/schemas/workout";
import type { WorkoutScheduleInput } from "@/schemas/workout";
import { dateParamSchema } from "@/schemas/journal";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const workoutLogSchema = z.array(
  z.object({
    exercise: z.string().min(1),
    sets: z.number().optional(),
    reps: z.string().optional(),
    rpe: z.number().optional(),
    weight: z.union([z.number(), z.string() ]).optional(),
    history: z
      .array(
        z.object({
          set: z.number().int().min(1),
          targetWeight: z.union([z.number(), z.string()]).optional(),
          actualWeight: z.union([z.number(), z.string()]).optional(),
          targetReps: z.number().optional(),
          actualReps: z.number().optional(),
          completed: z.boolean().optional(),
        })
      )
      .optional(),
  })
);
const workoutLogSaveSchema = z.union([
  workoutLogSchema,
  z.object({
    finished: z.boolean().optional(),
    workouts: workoutLogSchema,
    notes: z.string().optional(),
  }),
]);

export async function getWorkoutConfig() {
  const session = await auth();
  if (!session?.user?.id) return null;
  requirePermission(session.user, "view:own-journal");
  return await WorkoutService.getConfig(session.user.id);
}

export async function saveWorkoutRoutines(payload: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`workout:saveRoutines:${session.user.id}`, 20);
  if (!allowed) return { error: "Too many requests" };

  const parsed = z.array(workoutRoutineSchema).safeParse(payload);
  if (!parsed.success) {
    return { error: "Invalid routines", details: parsed.error.flatten() };
  }

  await WorkoutService.saveRoutines(session.user.id, parsed.data);
  revalidatePath("/user/workout");
  revalidatePath("/user/today");
  return { success: true };
}

export async function saveWorkoutSchedule(payload: { schedule?: unknown, title?: string } | unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`workout:saveSchedule:${session.user.id}`, 20);
  if (!allowed) return { error: "Too many requests" };

  // Support both legacy payload (just schedule) and new payload ({ schedule, title })
  const payloadObj = payload as Record<string, unknown>;
  const scheduleData = payloadObj?.schedule || payload;
  const title = payloadObj?.title as string | undefined;

  const parsed = workoutScheduleSchema.safeParse(scheduleData);
  if (!parsed.success) {
    return { error: "Invalid schedule", details: parsed.error.flatten() };
  }

  const plan = await WorkoutService.saveSchedule(session.user.id, parsed.data, title);
  revalidatePath("/user/workout");
  revalidatePath("/user/today");
  return { success: true, schedule: plan?.schedule, title: plan?.title };
}

export async function getWorkoutLog(date: string) {
  const session = await auth();
  if (!session?.user?.id) return { workouts: [], finished: false };
  requirePermission(session.user, "view:own-journal");

  const parsedDate = dateParamSchema.safeParse(date);
  if (!parsedDate.success) return { workouts: [], finished: false };

  return await WorkoutService.getWorkoutLog(session.user.id, parsedDate.data);
}

export async function createWorkoutPlan(payload: { title: string, schedule: unknown }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`workout:createPlan:${session.user.id}`, 10);
  if (!allowed) return { error: "Too many requests" };

  const parsed = workoutScheduleSchema.safeParse(payload.schedule);
  if (!parsed.success) {
    return { error: "Invalid schedule format" };
  }

  try {
    const plan = await WorkoutService.createPlan(session.user.id, payload.title, parsed.data as unknown as WorkoutScheduleInput);
    revalidatePath("/user/workout");
    return { success: true, plan };
  } catch (err) {
    logger.error("createWorkoutPlan error", err as unknown);
    return { error: "Failed to create plan" };
  }
}

export async function deleteWorkoutPlan(planId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`workout:deletePlan:${session.user.id}`, 10);
  if (!allowed) return { error: "Too many requests" };

  try {
    await WorkoutService.deletePlan(session.user.id, planId);
    revalidatePath("/user/workout");
    revalidatePath("/user/today");
    return { success: true };
  } catch (error) {
    logger.error("Delete plan error", error as unknown);
    return { error: "Failed to delete plan" };
  }
}

export async function switchWorkoutPlan(payload: { planId: string, title?: string, schedule?: unknown }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`workout:switchPlan:${session.user.id}`, 20);
  if (!allowed) return { error: "Too many requests" };

  const parsedSchedule = payload.schedule ? workoutScheduleSchema.safeParse(payload.schedule) : null;
  if (parsedSchedule && !parsedSchedule.success) {
    return { error: "Invalid schedule", details: parsedSchedule.error.flatten() };
  }

  const plan = await WorkoutService.updateAndActivatePlan(session.user.id, payload.planId, {
    title: payload.title,
    schedule: parsedSchedule?.data as unknown as WorkoutScheduleInput,
  });
  
  revalidatePath("/user/workout");
  revalidatePath("/user/today");
  return { success: true, plan };
}

export async function saveWorkoutLog(date: string, payload: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`workout:saveLog:${session.user.id}`, 50);
  if (!allowed) return { error: "Too many requests" };

  const parsedDate = dateParamSchema.safeParse(date);
  if (!parsedDate.success) return { error: "Invalid date" };

  const parsed = workoutLogSaveSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Invalid workout log", details: parsed.error.flatten() };
  }

  if (Array.isArray(parsed.data)) {
    await WorkoutService.saveWorkoutLog(session.user.id, parsedDate.data, parsed.data);
  } else {
    await WorkoutService.saveWorkoutLog(session.user.id, parsedDate.data, parsed.data.workouts, parsed.data.finished, parsed.data.notes);
  }
  revalidatePath("/user/workout");
  revalidatePath("/user/today");
  return { success: true };
}

export async function getWorkoutHistory(range?: { start?: string; end?: string; limit?: number }) {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-journal");
  const start = range?.start;
  const end = range?.end;
  const limit = range?.limit ?? 0;
  return await WorkoutService.getWorkoutHistory(session.user.id, start, end, limit);
}

