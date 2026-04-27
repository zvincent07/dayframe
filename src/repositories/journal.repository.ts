import { Journal } from "@/models/Journal";
import type { IJournal } from "@/models/Journal";
import { JournalMedia } from "@/models/JournalMedia";
import { JournalFood, IFoodLog } from "@/models/JournalFood";
import { JournalSpending, ISpendingEntry, IJournalSpending } from "@/models/JournalSpending";
import { JournalTasks, ITaskEntry } from "@/models/JournalTasks";
import { JournalWorkouts, IWorkoutEntry } from "@/models/JournalWorkouts";
import { DailyTask } from "@/models/DailyTask";
import connectDB, { toObjectId } from "@/lib/mongodb";
import { decryptJsonFromDb, encryptJsonForDb } from "@/lib/db-encryption";

function decryptCore(coreRaw: Record<string, unknown>): Record<string, unknown> {
  const enc = coreRaw.enc;
  const decrypted = decryptJsonFromDb<{ mainTask?: string; notes?: string; mentorsComments?: unknown }>(enc);
  if (!decrypted) return coreRaw;
  return {
    ...coreRaw,
    ...(decrypted.mainTask !== undefined ? { mainTask: decrypted.mainTask } : {}),
    ...(decrypted.notes !== undefined ? { notes: decrypted.notes } : {}),
    ...(decrypted.mentorsComments !== undefined ? { mentorsComments: decrypted.mentorsComments } : {}),
  };
}

function decryptFood(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const decrypted = decryptJsonFromDb<{ food?: IFoodLog }>(doc.enc);
  if (!decrypted) return doc;
  return { ...doc, ...(decrypted.food ? { food: decrypted.food } : {}) };
}

function decryptMedia(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const decrypted = decryptJsonFromDb<{ images?: string[]; foodImages?: string[] }>(doc.enc);
  if (!decrypted) return doc;
  return {
    ...doc,
    ...(decrypted.images ? { images: decrypted.images } : {}),
    ...(decrypted.foodImages ? { foodImages: decrypted.foodImages } : {}),
  };
}

function decryptTasks(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const decrypted = decryptJsonFromDb<{ tasks?: ITaskEntry[] }>(doc.enc);
  if (!decrypted) return doc;
  return { ...doc, ...(decrypted.tasks ? { tasks: decrypted.tasks } : {}) };
}

function decryptSpending(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const decrypted = decryptJsonFromDb<{ spending?: ISpendingEntry[] }>(doc.enc);
  if (!decrypted) return doc;
  return { ...doc, ...(decrypted.spending ? { spending: decrypted.spending } : {}) };
}

function decryptWorkouts(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const decrypted = decryptJsonFromDb<{ workouts?: IWorkoutEntry[]; notes?: string }>(doc.enc);
  if (!decrypted) return doc;
  return {
    ...doc,
    ...(decrypted.workouts ? { workouts: decrypted.workouts } : {}),
    ...(decrypted.notes !== undefined ? { notes: decrypted.notes } : {}),
  };
}

export class JournalRepository {
  static async findSpendingByDateRange(userId: string, startDate: string, endDate: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const rows = await JournalSpending.find({
      userId: uid,
      date: { $gte: startDate, $lte: endDate },
    })
      .select("date currency spending totalSpent enc")
      .lean<Record<string, unknown>[]>();
    return rows.map((r) => decryptSpending(r) as Record<string, unknown>);
  }
  static async findFoodByDateRange(userId: string, startDate: string, endDate: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const rows = await JournalFood.find({
      userId: uid,
      date: { $gte: startDate, $lte: endDate },
    })
      .select("date food enc")
      .lean<Record<string, unknown>[]>();
    return rows.map((r) => decryptFood(r) as Record<string, unknown>);
  }

  static async findTasksByDateRange(userId: string, startDate: string, endDate: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const rows = await JournalTasks.find({
      userId: uid,
      date: { $gte: startDate, $lte: endDate },
    })
      .select("date tasks enc")
      .lean<Record<string, unknown>[]>();
    return rows.map((r) => decryptTasks(r) as Record<string, unknown>);
  }

  static async findJournalDates(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return Journal.find({ userId: uid }).select("date").lean<{ date: string }[]>();
  }

  static async countJournalEntriesWithContent(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    
    // An entry is "real" if it has notes OR mainTask OR is bookmarked.
    // We use explicit strict equality checks instead of complex regex to ensure fast and reliable counts.
    return Journal.countDocuments({
      userId: uid,
      $or: [
        { hasContent: true },
        { isBookmarked: true },
        { bookmarked: true }
      ],
    });
  }

  static async findCompletedTasks(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return DailyTask.find({
      userId: uid,
      isCompleted: true,
      lastCompletedAt: { $ne: null },
    })
      .select("lastCompletedAt")
      .lean<{ lastCompletedAt: Date }[]>();
  }

  /** Distinct calendar days (YYYY-MM-DD) on which the user had a task marked complete. */
  static async findTaskCompletedDateKeys(userId: string): Promise<string[]> {
    await connectDB();
    const uid = toObjectId(userId);
    const rows = await DailyTask.find({
      userId: uid,
      lastCompletedDateKey: { $nin: [null, ""] },
    })
      .select("lastCompletedDateKey")
      .lean<{ lastCompletedDateKey?: string | null }[]>();
    const keys = new Set<string>();
    for (const r of rows) {
      const k = (r.lastCompletedDateKey || "").trim();
      if (k) keys.add(k);
    }
    return [...keys];
  }

  static async findFullJournalEntry(userId: string, date: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const filter = { userId: uid, date };

    const [coreRawBase, mediaBase, foodBase, spendingBase, tasksBase, workoutsBase] = await Promise.all([
      Journal.collection.findOne(filter) as Promise<Record<string, unknown> | null>,
      JournalMedia.findOne(filter).lean<Record<string, unknown> | null>(),
      JournalFood.findOne(filter).lean<Record<string, unknown> | null>(),
      JournalSpending.findOne(filter).lean<Record<string, unknown> | null>(),
      JournalTasks.findOne(filter).lean<Record<string, unknown> | null>(),
      JournalWorkouts.findOne(filter).lean<Record<string, unknown> | null>(),
    ]);

    if (!coreRawBase) return null;
    const coreRaw = decryptCore(coreRawBase);
    const media = decryptMedia(mediaBase);
    const food = decryptFood(foodBase);
    const spending = decryptSpending(spendingBase);
    const tasks = decryptTasks(tasksBase);
    const workouts = decryptWorkouts(workoutsBase);

    return {
      core: coreRaw,
      media,
      food,
      spending,
      tasks,
      workouts,
    };
  }

  static async upsertJournalEntry(
    userId: string,
    date: string,
    updates: {
      mainTask?: string;
      notes?: string;
      images?: string[];
      foodImages?: string[];
      food?: IFoodLog;
      currency?: string;
      spending?: ISpendingEntry[];
      tasks?: ITaskEntry[];
      workouts?: IWorkoutEntry[];
    }
  ) {
    await connectDB();
    const uid = toObjectId(userId);
    const filter = { userId: uid, date };
    const opts = { returnDocument: "after" as const, upsert: true };

    const promises: Promise<unknown>[] = [];

    if (updates.mainTask !== undefined || updates.notes !== undefined) {
      const mainTask = updates.mainTask !== undefined ? String(updates.mainTask ?? "") : undefined;
      const notes = updates.notes !== undefined ? String(updates.notes ?? "") : undefined;
      const hasContent =
        (typeof mainTask === "string" && mainTask.trim().length > 0) ||
        (typeof notes === "string" && notes.trim().length > 0);
      const enc = encryptJsonForDb({ mainTask, notes });
      promises.push(
        Journal.findOneAndUpdate(
          filter,
          {
            $set: {
              ...(updates.mainTask !== undefined && { mainTask: "" }),
              ...(updates.notes !== undefined && { notes: "" }),
              hasContent,
              enc,
            },
          },
          opts
        )
      );
    }

    if (updates.images !== undefined || updates.foodImages !== undefined) {
      const images = updates.images !== undefined ? (Array.isArray(updates.images) ? [...updates.images] : []) : undefined;
      const foodImages = updates.foodImages !== undefined ? (Array.isArray(updates.foodImages) ? [...updates.foodImages] : []) : undefined;
      const enc = encryptJsonForDb({ images, foodImages });
      promises.push(
        JournalMedia.findOneAndUpdate(
          filter,
          {
            $set: {
              ...(updates.images !== undefined && { images: [] }),
              ...(updates.foodImages !== undefined && { foodImages: [] }),
              enc,
            },
          },
          opts
        )
      );
    }

    if (updates.food !== undefined) {
      const enc = encryptJsonForDb({ food: updates.food });
      promises.push(JournalFood.findOneAndUpdate(filter, { $set: { food: {}, enc } }, opts));
    }

    if (updates.currency !== undefined || updates.spending !== undefined) {
      const spendingUpdate: Partial<Pick<IJournalSpending, "currency" | "spending" | "totalSpent">> = {};
      if (updates.currency !== undefined) spendingUpdate.currency = updates.currency;
      if (updates.spending !== undefined) {
        spendingUpdate.spending = [];
        spendingUpdate.totalSpent = updates.spending.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        (spendingUpdate as Record<string, unknown>).enc = encryptJsonForDb({ spending: updates.spending });
      }
      promises.push(
        JournalSpending.findOneAndUpdate(
          filter,
          {
            $set: spendingUpdate,
          },
          opts
        )
      );
    }

    if (updates.tasks !== undefined) {
      const enc = encryptJsonForDb({ tasks: updates.tasks });
      promises.push(JournalTasks.findOneAndUpdate(filter, { $set: { tasks: [], enc } }, opts));
    }

    if (updates.workouts !== undefined) {
      const enc = encryptJsonForDb({ workouts: updates.workouts });
      promises.push(
        JournalWorkouts.findOneAndUpdate(filter, { $set: { workouts: [], enc } }, opts)
      );
    }

    await Promise.all(promises);
  }

  static async updateFoodAndCurrencyOnly(
    userId: string,
    date: string,
    foodImages: string[],
    currency: string
  ) {
    await connectDB();
    const uid = toObjectId(userId);
    const filter = { userId: uid, date };
    const opts = { upsert: true };

    const mediaEnc = encryptJsonForDb({ foodImages: Array.isArray(foodImages) ? [...foodImages] : [] });
    await Promise.all([
      JournalMedia.findOneAndUpdate(
        filter,
        { $set: { foodImages: [], enc: mediaEnc } },
        opts
      ),
      JournalSpending.findOneAndUpdate(
        filter,
        { $set: { currency: String(currency || "USD") } },
        opts
      ),
    ]);
  }

  static async findByDate(userId: string, date: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const doc = await Journal.findOne({ userId: uid, date }).lean<Record<string, unknown> | null>();
    if (!doc) return null;
    return decryptCore(doc);
  }

  static async updateIsBookmarked(userId: string, date: string, isBookmarked: boolean) {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) return null;
    const result = await Journal.findOneAndUpdate(
      { userId: uid, date },
      { 
        $set: { isBookmarked, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { returnDocument: "after", upsert: true }
    );
    return result;
  }

  static async create(userId: string, date: string, data: Partial<IJournal>) {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) throw new Error("Invalid userId");
    return Journal.create({ userId: uid, date, ...data });
  }

  static async findJournalHistory(userId: string, limit: number = 20) {
    await connectDB();
    const uid = toObjectId(userId);
    
    // We need to aggregate data from multiple collections to provide a complete history overview
    const journalEntries = await Journal.find({ userId: uid })
      .select("date mainTask notes isBookmarked bookmarked updatedAt createdAt enc hasContent")
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    // Enhance entries with data from other collections (images, food, spending)
    const dates = journalEntries.map(e => e.date);
    
    const [mediaDocs, foodDocs, spendingDocs] = await Promise.all([
      JournalMedia.find({ userId: uid, date: { $in: dates } }).select("date images foodImages enc").lean(),
      JournalFood.find({ userId: uid, date: { $in: dates } }).select("date food enc").lean(),
      JournalSpending.find({ userId: uid, date: { $in: dates } }).select("date spending currency enc").lean()
    ]);

    const mediaMap = new Map(mediaDocs.map(d => [d.date, decryptMedia(d as unknown as Record<string, unknown>)]));
    const foodMap = new Map(foodDocs.map(d => [d.date, decryptFood(d as unknown as Record<string, unknown>)]));
    const spendingMap = new Map(spendingDocs.map(d => [d.date, decryptSpending(d as unknown as Record<string, unknown>)]));

    return journalEntries.map(entry => {
      const core = decryptCore(entry as unknown as Record<string, unknown>);
      const media = mediaMap.get(entry.date);
      const foodDoc = foodMap.get(entry.date);
      const spendingDoc = spendingMap.get(entry.date);

      const images = Array.isArray((media as Record<string, unknown> | null)?.images) ? ((media as Record<string, unknown>).images as string[]) : [];
      const foodImages = Array.isArray((media as Record<string, unknown> | null)?.foodImages) ? ((media as Record<string, unknown>).foodImages as string[]) : [];
      const foodData = foodDoc?.food || null;
      const spendingData = Array.isArray((spendingDoc as Record<string, unknown> | null)?.spending) ? ((spendingDoc as Record<string, unknown>).spending as ISpendingEntry[]) : [];
      const currency = typeof (spendingDoc as Record<string, unknown> | null)?.currency === "string" ? ((spendingDoc as Record<string, unknown>).currency as string) : "USD";

      return {
        ...core,
        imagesCount: (images.length || 0) + (foodImages.length || 0),
        hasFoodLog: foodData && Object.values(foodData || {}).some(v => typeof v === 'string' && v.trim().length > 0),
        food: foodData,
        spendingCount: spendingData.length || 0,
        spending: spendingData,
        currency: currency
      };
    });
  }

  static async findJournalsByUser(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const rows = await Journal.find({ userId: uid })
      .select("date mainTask notes isBookmarked bookmarked enc hasContent")
      .lean<Record<string, unknown>[]>();
    return rows.map((r) => decryptCore(r));
  }

  static async findMediaByUser(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const rows = await JournalMedia.find({ userId: uid })
      .select("date images foodImages enc")
      .lean<Record<string, unknown>[]>();
    return rows.map((r) => decryptMedia(r) as Record<string, unknown>);
  }

  static async findFoodByUser(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    const rows = await JournalFood.find({ userId: uid })
      .select("date food enc")
      .lean<Record<string, unknown>[]>();
    return rows.map((r) => decryptFood(r) as Record<string, unknown>);
  }

  static async findSpendingByUser(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalSpending.find({ userId: uid })
      .select("date totalSpent")
      .lean();
  }
}
