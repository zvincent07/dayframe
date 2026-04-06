import mongoose from "mongoose";
import connectDB, { toObjectId } from "@/lib/mongodb";
import { WorkoutRoutine, IWorkoutRoutine } from "@/models/WorkoutRoutine";
import { WorkoutPlan, IWorkoutPlan } from "@/models/WorkoutPlan";
import { JournalWorkouts, IWorkoutEntry } from "@/models/JournalWorkouts";

async function ensureWorkoutPlanIndexes() {
  await connectDB();
  const indexes = await WorkoutPlan.collection.indexes();
  const legacyUnique = indexes.filter((ix: Record<string, unknown>) => {
    const key = (ix.key as Record<string, unknown>) || {};
    return ix.unique === true && key.userId === 1 && Object.keys(key).length === 1;
  });
  for (const ix of legacyUnique) {
    const name = (ix.name as string) || "userId_1";
    try {
      await WorkoutPlan.collection.dropIndex(name);
    } catch {}
  }
  await WorkoutPlan.collection.createIndex({ userId: 1 });
  await WorkoutPlan.collection.createIndex({ userId: 1, isActive: 1 });
}

export class WorkoutRepository {
  static async ensureIndexes() {
    await ensureWorkoutPlanIndexes();
  }
  static async findConfig(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    // Find active plan, or fallback to the most recently updated plan if none active (legacy support)
    const activePlan = await WorkoutPlan.findOne({ userId: uid, isActive: true }).lean<IWorkoutPlan | null>();
    const plan = activePlan || await WorkoutPlan.findOne({ userId: uid }).sort({ updatedAt: -1 }).lean<IWorkoutPlan | null>();

    return Promise.all([
      WorkoutRoutine.find({ userId: uid }).lean<IWorkoutRoutine[]>(),
      plan,
    ]);
  }

  static async findAllPlans(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return WorkoutPlan.find({ userId: uid }).sort({ updatedAt: -1 }).lean<IWorkoutPlan[]>();
  }

  static async createPlan(userId: string, data: Partial<IWorkoutPlan>) {
    await connectDB();
    await ensureWorkoutPlanIndexes();
    const uid = toObjectId(userId);
    if (!uid) throw new Error("Invalid userId");
    // If setting as active, deactivate others
    if (data.isActive) {
      await WorkoutPlan.updateMany({ userId: uid }, { $set: { isActive: false } });
    }
    return WorkoutPlan.create({ ...data, userId: uid });
  }

  static async updatePlan(userId: string, planId: string, data: Partial<IWorkoutPlan>) {
    await connectDB();
    const uid = toObjectId(userId);
    const pid = toObjectId(planId);
    if (!uid || !pid) return null;
    // If setting as active, deactivate others first
    if (data.isActive) {
      await WorkoutPlan.updateMany({ userId: uid }, { $set: { isActive: false } });
    }
    return WorkoutPlan.findOneAndUpdate(
      { _id: pid, userId: uid },
      { $set: data },
      { returnDocument: 'after' }
    ).lean<IWorkoutPlan | null>();
  }

  static async setActivePlan(userId: string, planId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const pid = toObjectId(planId);
    if (!uid || !pid) return null;
    await WorkoutPlan.updateMany({ userId: uid }, { $set: { isActive: false } });
    return WorkoutPlan.findOneAndUpdate(
      { _id: pid, userId: uid },
      { $set: { isActive: true } },
      { returnDocument: 'after' }
    ).lean<IWorkoutPlan | null>();
  }

  static async deletePlan(userId: string, planId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const pid = toObjectId(planId);
    if (!uid || !pid) return;
    
    // First find if the plan to delete is the active one
    const planToDelete = await WorkoutPlan.findOne({ _id: pid, userId: uid });
    const isActive = planToDelete?.isActive;
    
    await WorkoutPlan.deleteOne({ _id: pid, userId: uid });
    
    // If we deleted the active plan, make the most recently updated one active
    if (isActive) {
      const latestPlan = await WorkoutPlan.findOne({ userId: uid }).sort({ updatedAt: -1 });
      if (latestPlan) {
        await WorkoutPlan.updateOne({ _id: latestPlan._id }, { $set: { isActive: true } });
      }
    }
  }

  static async findRoutinesByUserId(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return WorkoutRoutine.find({ userId: uid })
      .select("routineId")
      .lean<{ routineId: string }[]>();
  }

  static async findRoutines(userId: string): Promise<IWorkoutRoutine[]> {
    await connectDB();
    const uid = toObjectId(userId);
    return WorkoutRoutine.find({ userId: uid }).lean() as unknown as Promise<IWorkoutRoutine[]>;
  }

  static async upsertRoutine(userId: string, routineId: string, data: Partial<IWorkoutRoutine>) {
    await connectDB();
    const uid = toObjectId(userId);
    return WorkoutRoutine.findOneAndUpdate(
      { userId: uid, routineId },
      { $set: data },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  static async deleteRoutines(userId: string, routineIds: string[]) {
    await connectDB();
    const uid = toObjectId(userId);
    return WorkoutRoutine.deleteMany({ userId: uid, routineId: { $in: routineIds } });
  }

  static async upsertSchedule(userId: string, schedule: IWorkoutPlan["schedule"], title?: string) {
    await connectDB();
    await ensureWorkoutPlanIndexes();
    const uid = toObjectId(userId);
    if (!uid) throw new Error("Invalid userId");
    // Find active or latest
    const active = await WorkoutPlan.findOne({ userId: uid, isActive: true });
    
    if (active) {
      active.schedule = schedule;
      if (title !== undefined) active.title = title;
      const doc = await active.save();
      return doc.toObject();
    }

    // Fallback: create new active plan if none exists
    const doc = await WorkoutPlan.create({
      userId: uid,
      schedule,
      title: title ?? "Default Plan",
      isActive: true
    });
    return doc.toObject();
  }

  static async findWorkoutLog(userId: string, date: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalWorkouts.findOne({ userId: uid, date }).lean();
  }

  static async upsertWorkoutLog(userId: string, date: string, workouts: IWorkoutEntry[], finished?: boolean) {
    await connectDB();
    const uid = toObjectId(userId);

    const updateFields: Record<string, unknown> = { workouts };
    if (finished !== undefined) {
      updateFields.finished = !!finished;
      updateFields.completedAt = finished ? new Date() : null;
    }

    return JournalWorkouts.findOneAndUpdate(
      { userId: uid, date },
      { $set: updateFields },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  static async findWorkoutHistory(userId: string, start: string, end: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalWorkouts.find({
      userId: uid,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: -1 })
      .lean();
  }

  /** Date keys only — for heatmaps / calendars without loading full workout payloads. */
  static async findWorkoutDateKeys(userId: string, start: string, end: string): Promise<string[]> {
    await connectDB();
    const uid = toObjectId(userId);
    const keys = await JournalWorkouts.distinct("date", {
      userId: uid,
      date: { $gte: start, $lte: end },
    });
    return keys.map((k) => String(k));
  }

  /**
   * Single aggregation for profile stats — avoids loading every workout document into Node.
   */
  static async getProfileWorkoutAggregates(
    userId: string,
  ): Promise<{ workoutsLogged: number; totalVolumeKg: number }> {
    await connectDB();
    const uid = toObjectId(userId);
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { userId: uid } },
      {
        $facet: {
          loggedDays: [
            { $match: { "workouts.0": { $exists: true } } },
            { $count: "n" },
          ],
          volume: [
            { $unwind: { path: "$workouts", preserveNullAndEmptyArrays: false } },
            { $unwind: { path: "$workouts.history", preserveNullAndEmptyArrays: false } },
            { $match: { "workouts.history.completed": true } },
            {
              $project: {
                w: {
                  $ifNull: [
                    "$workouts.history.actualWeight",
                    { $ifNull: ["$workouts.history.targetWeight", 0] },
                  ],
                },
                r: {
                  $ifNull: [
                    "$workouts.history.actualReps",
                    { $ifNull: ["$workouts.history.targetReps", 0] },
                  ],
                },
              },
            },
            {
              $project: {
                v: { $multiply: ["$w", "$r"] },
              },
            },
            { $group: { _id: null, total: { $sum: "$v" } } },
          ],
        },
      },
    ];
    const rows = await JournalWorkouts.aggregate(pipeline);
    const row = rows[0] as
      | {
          loggedDays: { n: number }[];
          volume: { total: number }[];
        }
      | undefined;
    const workoutsLogged = row?.loggedDays?.[0]?.n ?? 0;
    const totalRaw = row?.volume?.[0]?.total ?? 0;
    return { workoutsLogged, totalVolumeKg: Math.round(Number(totalRaw)) };
  }
}
