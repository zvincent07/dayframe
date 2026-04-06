import { Journal } from "@/models/Journal";
import type { IJournal } from "@/models/Journal";
import { JournalMedia } from "@/models/JournalMedia";
import { JournalFood, IFoodLog } from "@/models/JournalFood";
import { JournalSpending, ISpendingEntry, IJournalSpending } from "@/models/JournalSpending";
import { JournalTasks, ITaskEntry } from "@/models/JournalTasks";
import { JournalWorkouts, IWorkoutEntry } from "@/models/JournalWorkouts";
import { DailyTask } from "@/models/DailyTask";
import connectDB, { toObjectId } from "@/lib/mongodb";

export class JournalRepository {
  static async findSpendingByDateRange(userId: string, startDate: string, endDate: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalSpending.find({
      userId: uid,
      date: { $gte: startDate, $lte: endDate },
    })
      .select("date currency spending totalSpent")
      .lean();
  }
  static async findFoodByDateRange(userId: string, startDate: string, endDate: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalFood.find({
      userId: uid,
      date: { $gte: startDate, $lte: endDate },
    })
      .select("date food")
      .lean();
  }

  static async findTasksByDateRange(userId: string, startDate: string, endDate: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalTasks.find({
      userId: uid,
      date: { $gte: startDate, $lte: endDate },
    })
      .select("date tasks")
      .lean();
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
        { mainTask: { $type: "string", $ne: "" } },
        { notes: { $type: "string", $ne: "" } },
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

    const [coreRaw, media, food, spending, tasks, workouts] = await Promise.all([
      Journal.collection.findOne(filter) as Promise<Record<string, unknown> | null>,
      JournalMedia.findOne(filter).lean(),
      JournalFood.findOne(filter).lean(),
      JournalSpending.findOne(filter).lean(),
      JournalTasks.findOne(filter).lean(),
      JournalWorkouts.findOne(filter).lean(),
    ]);

    if (!coreRaw) return null;

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
      promises.push(
        Journal.findOneAndUpdate(
          filter,
          {
            $set: {
              ...(updates.mainTask !== undefined && { mainTask: updates.mainTask }),
              ...(updates.notes !== undefined && { notes: updates.notes }),
            },
          },
          opts
        )
      );
    }

    if (updates.images !== undefined || updates.foodImages !== undefined) {
      promises.push(
        JournalMedia.findOneAndUpdate(
          filter,
          {
            $set: {
              ...(updates.images !== undefined && { images: updates.images }),
              ...(updates.foodImages !== undefined && { foodImages: updates.foodImages }),
            },
          },
          opts
        )
      );
    }

    if (updates.food !== undefined) {
      promises.push(JournalFood.findOneAndUpdate(filter, { $set: { food: updates.food } }, opts));
    }

    if (updates.currency !== undefined || updates.spending !== undefined) {
      const spendingUpdate: Partial<Pick<IJournalSpending, "currency" | "spending" | "totalSpent">> = {};
      if (updates.currency !== undefined) spendingUpdate.currency = updates.currency;
      if (updates.spending !== undefined) {
        spendingUpdate.spending = updates.spending;
        spendingUpdate.totalSpent = updates.spending.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
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
      promises.push(JournalTasks.findOneAndUpdate(filter, { $set: { tasks: updates.tasks } }, opts));
    }

    if (updates.workouts !== undefined) {
      promises.push(
        JournalWorkouts.findOneAndUpdate(filter, { $set: { workouts: updates.workouts } }, opts)
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

    await Promise.all([
      JournalMedia.findOneAndUpdate(
        filter,
        { $set: { foodImages: Array.isArray(foodImages) ? [...foodImages] : [] } },
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
    return Journal.findOne({ userId: uid, date });
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
      .select("date mainTask notes isBookmarked bookmarked updatedAt createdAt")
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    // Enhance entries with data from other collections (images, food, spending)
    const dates = journalEntries.map(e => e.date);
    
    const [mediaDocs, foodDocs, spendingDocs] = await Promise.all([
      JournalMedia.find({ userId: uid, date: { $in: dates } }).select("date images foodImages").lean(),
      JournalFood.find({ userId: uid, date: { $in: dates } }).select("date food").lean(),
      JournalSpending.find({ userId: uid, date: { $in: dates } }).select("date spending currency").lean()
    ]);

    const mediaMap = new Map(mediaDocs.map(d => [d.date, d]));
    const foodMap = new Map(foodDocs.map(d => [d.date, d]));
    const spendingMap = new Map(spendingDocs.map(d => [d.date, d]));

    return journalEntries.map(entry => {
      const media = mediaMap.get(entry.date);
      const foodDoc = foodMap.get(entry.date);
      const spendingDoc = spendingMap.get(entry.date);

      const images = media?.images || [];
      const foodImages = media?.foodImages || [];
      const foodData = foodDoc?.food || null;
      const spendingData = spendingDoc?.spending || [];
      const currency = spendingDoc?.currency || "USD";

      return {
        ...entry,
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
    return Journal.find({ userId: uid })
      .select("date mainTask notes isBookmarked bookmarked")
      .lean();
  }

  static async findMediaByUser(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalMedia.find({ userId: uid })
      .select("date images foodImages")
      .lean();
  }

  static async findFoodByUser(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalFood.find({ userId: uid })
      .select("date food")
      .lean();
  }

  static async findSpendingByUser(userId: string) {
    await connectDB();
    const uid = toObjectId(userId);
    return JournalSpending.find({ userId: uid })
      .select("date totalSpent")
      .lean();
  }
}
