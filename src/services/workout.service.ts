import { IWorkoutEntry } from "@/models/JournalWorkouts";
import { IWorkoutPlan } from "@/models/WorkoutPlan";
import { WorkoutRoutineInput, WorkoutScheduleInput } from "@/schemas/workout";
import { WorkoutRepository } from "@/repositories/workout.repository";
import { UserActivityService } from "./user-activity.service";
import { logger } from "@/lib/logger";

export class WorkoutService {
  private static async logAudit(action: string, userId: string, details?: Record<string, any>) {
    try {
      const { AuditService } = await import("@/services/audit.service");
      const { User } = await import("@/models/User");
      const user = await User.findById(userId).select("email").lean();
      if (user) {
        await AuditService.log(action, undefined, "Workout", details, { id: userId, email: user.email || "" });
      }
    } catch (err) {
      logger.error("Failed to log workout audit", err);
    }
  }

  static async getConfig(userId: string) {
    const [routines, plan] = await WorkoutRepository.findConfig(userId);

    // Get all plans for selection UI
    const allPlans = await WorkoutRepository.findAllPlans(userId);

    // If no plans exist yet, don't return null for schedule if possible, 
    // but the front-end handles null schedule as default.
    // However, we want to return the list of available plans.

    return JSON.parse(
      JSON.stringify({
        routines: routines.map((r) => ({
          routineId: r.routineId,
          name: r.name,
          exercises: r.exercises,
        })),
        schedule: plan?.schedule ?? null,
        title: plan?.title ?? "Push/Pull/Legs split",
        activePlanId: plan?._id,
        plans: allPlans.map(p => ({ id: p._id, title: p.title, isActive: p.isActive, schedule: p.schedule }))
      })
    );
  }

  static async createPlan(userId: string, title: string, schedule: WorkoutScheduleInput) {
    try {
      const plan = await WorkoutRepository.createPlan(userId, {
        title,
        schedule,
        isActive: true
      });
      return JSON.parse(JSON.stringify(plan));
    } catch (err: unknown) {
      const errorObj = err as Error;
      const msg = typeof errorObj?.message === "string" ? errorObj.message : "";
      if (msg.includes("E11000") || msg.toLowerCase().includes("duplicate key")) {
        await WorkoutRepository.ensureIndexes();
        const plan = await WorkoutRepository.createPlan(userId, {
          title,
          schedule,
          isActive: true
        });
        return JSON.parse(JSON.stringify(plan));
      }
      throw err;
    }
  }

  static async updateAndActivatePlan(userId: string, planId: string, data: { title?: string, schedule?: WorkoutScheduleInput }) {
    const updateData: Partial<IWorkoutPlan> & { isActive: boolean } = { isActive: true };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.schedule !== undefined) updateData.schedule = data.schedule as unknown as IWorkoutPlan["schedule"];
    
    const plan = await WorkoutRepository.updatePlan(userId, planId, updateData);
    return JSON.parse(JSON.stringify(plan));
  }

  static async setActivePlan(userId: string, planId: string) {
    const plan = await WorkoutRepository.setActivePlan(userId, planId);
    return JSON.parse(JSON.stringify(plan));
  }

  static async deletePlan(userId: string, planId: string) {
    await WorkoutRepository.deletePlan(userId, planId);
  }

  static async saveRoutines(userId: string, routines: WorkoutRoutineInput[]) {
    const existing = await WorkoutRepository.findRoutinesByUserId(userId);
    const existingIds = new Set(existing.map((r) => r.routineId));
    const incomingIds = new Set(routines.map((r) => r.routineId));

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

    await Promise.all([
      ...routines.map((routine) =>
        WorkoutRepository.upsertRoutine(userId, routine.routineId, {
          name: routine.name,
          exercises: routine.exercises,
        })
      ),
      toDelete.length
        ? WorkoutRepository.deleteRoutines(userId, toDelete)
        : Promise.resolve(),
    ]);
  }

  static async saveSchedule(userId: string, schedule: WorkoutScheduleInput, title?: string) {
    const plan = await WorkoutRepository.upsertSchedule(userId, schedule, title);
    return JSON.parse(JSON.stringify(plan));
  }

  static async getWorkoutLog(userId: string, date: string): Promise<{ workouts: IWorkoutEntry[]; finished: boolean; notes: string }> {
    const doc = await WorkoutRepository.findWorkoutLog(userId, date);
    const workouts = (doc?.workouts as IWorkoutEntry[]) ?? [];
    const finished = !!(doc as Record<string, unknown> | null)?.finished;
    const notes = ((doc as Record<string, unknown> | null)?.notes as string | undefined) ?? "";
    return JSON.parse(JSON.stringify({ workouts, finished, notes }));
  }

  static async saveWorkoutLog(userId: string, date: string, workouts: IWorkoutEntry[], finished?: boolean, notes?: string) {
    if (finished) {
      WorkoutService.logAudit("WORKOUT_FINISHED", userId, { 
        date, 
        count: workouts.length,
        exercises: workouts.map(w => w.exercise)
      }).catch(() => {});
    }
    await Promise.all([
      WorkoutRepository.upsertWorkoutLog(userId, date, workouts, finished, notes),
      UserActivityService.recordActivity(userId),
    ]);
  }

  static async getProfileWorkoutAggregates(userId: string): Promise<{
    workoutsLogged: number;
    totalVolumeRounded: number;
  }> {
    const { workoutsLogged, totalVolumeKg } = await WorkoutRepository.getProfileWorkoutAggregates(userId);
    return { workoutsLogged, totalVolumeRounded: totalVolumeKg };
  }

  static async getWorkoutHistory(userId: string, startDate?: string, endDate?: string, limit: number = 0) {
    let start: string | undefined = startDate;
    let end: string | undefined = endDate;
    if (!start) {
      if (limit > 0) {
        const d = new Date();
        d.setDate(d.getDate() - limit);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        start = `${y}-${m}-${day}`;
      } else {
        start = "2000-01-01"; // effectively no limit
      }
    }
    if (!end) {
      // Use a very far future date if no end date provided, 
      // so we don't accidentally cut off 'today' entries due to timezone differences.
      end = "9999-12-31";
    }
    const docs = await WorkoutRepository.findWorkoutHistory(userId, start, end);
    return JSON.parse(JSON.stringify(docs));
  }
}
