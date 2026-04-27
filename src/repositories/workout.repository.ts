import mongoose from "mongoose";
import connectDB, { toObjectId } from "@/lib/mongodb";
import { WorkoutRoutine, IWorkoutRoutine } from "@/models/WorkoutRoutine";
import { WorkoutPlan, IWorkoutPlan } from "@/models/WorkoutPlan";
import { JournalWorkouts, IWorkoutEntry } from "@/models/JournalWorkouts";
import { decryptJsonFromDb, encryptJsonForDb } from "@/lib/db-encryption";

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
    const doc = await JournalWorkouts.findOne({ userId: uid, date }).lean<Record<string, unknown> | null>();
    if (!doc) return null;
    const decrypted = decryptJsonFromDb<{ workouts?: IWorkoutEntry[]; notes?: string }>(doc.enc);
    if (!decrypted) return doc;
    return {
      ...doc,
      workouts: decrypted.workouts ?? (doc.workouts as IWorkoutEntry[] | undefined) ?? [],
      notes: decrypted.notes ?? (doc.notes as string | undefined) ?? "",
    };
  }

  static async upsertWorkoutLog(userId: string, date: string, workouts: IWorkoutEntry[], finished?: boolean, notes?: string) {
    await connectDB();
    const uid = toObjectId(userId);

    const updateFields: Record<string, unknown> = {
      workouts: [],
      notes: "",
      enc: encryptJsonForDb({ workouts, notes: notes ?? "" }),
    };
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
    const rows = await JournalWorkouts.find({
      userId: uid,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: -1 })
      .lean<Record<string, unknown>[]>();
    return rows.map((doc) => {
      const decrypted = decryptJsonFromDb<{ workouts?: IWorkoutEntry[]; notes?: string }>(doc.enc);
      if (!decrypted) return doc;
      return {
        ...doc,
        workouts: decrypted.workouts ?? (doc.workouts as IWorkoutEntry[] | undefined) ?? [],
        notes: decrypted.notes ?? (doc.notes as string | undefined) ?? "",
      };
    });
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
   * Profile stats. With encrypted-at-rest workout payloads, we compute in Node after decrypting.
   */
  static async getProfileWorkoutAggregates(
    userId: string,
  ): Promise<{ workoutsLogged: number; totalVolumeKg: number }> {
    await connectDB();
    const uid = toObjectId(userId);
    const docs = await JournalWorkouts.find({ userId: uid })
      .select("enc workouts notes")
      .lean<Record<string, unknown>[]>();

    let workoutsLogged = 0;
    let totalVolumeKg = 0;

    for (const doc of docs) {
      const decrypted = decryptJsonFromDb<{ workouts?: IWorkoutEntry[] }>(doc.enc);
      const workouts = decrypted?.workouts ?? (doc.workouts as IWorkoutEntry[] | undefined) ?? [];
      if (workouts.length > 0) workoutsLogged += 1;

      for (const w of workouts) {
        const history = Array.isArray(w.history) ? w.history : [];
        for (const h of history) {
          if (!h?.completed) continue;
          const reps = typeof h.actualReps === "number" ? h.actualReps : typeof h.targetReps === "number" ? h.targetReps : 0;
          const rawWeight = h.actualWeight ?? h.targetWeight ?? 0;
          const weight = typeof rawWeight === "number" ? rawWeight : 0;
          totalVolumeKg += weight * reps;
        }
      }
    }

    return { workoutsLogged, totalVolumeKg: Math.round(totalVolumeKg) };
  }
}
