import { DailyTask, IDailyTask } from '@/models/DailyTask';
import { JournalTasks, ITaskEntry } from '@/models/JournalTasks';
import connectDB from '@/lib/mongodb';
import { UserActivityService } from './user-activity.service';
import { JournalRepository } from "@/repositories/journal.repository";
import { UserRepository } from "@/repositories/user.repository";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";

export class DailyTaskService {
  /**
   * Syncs the current state of Daily Tasks to the JournalTasks collection for the current day.
   * This ensures history is preserved even if the user doesn't manually create a journal entry.
   */
  static async syncToJournal(userId: string, dateKey?: string) {
    await connectDB();
    // Use user timezone-aware date key for today if not explicitly provided
    const targetKey = dateKey || await DailyTaskService.formatUserDateKey(userId, new Date());
    const tasks = await DailyTask.find({ userId }).sort({ createdAt: 1 }).lean();
    const taskEntries = tasks.map(t => ({
      title: t.title,
      duration: t.duration,
      done: t.lastCompletedDateKey === targetKey
    }));
    
    // Use upsertJournalEntry to save tasks history
    try {
      await JournalRepository.upsertJournalEntry(userId, targetKey, {
        tasks: taskEntries
      });
    } catch (err) {
      logger.error("Failed to sync tasks to journal", err, { userId, targetKey });
    }
  }

  static async getCompletionSummary(userId: string, startKey: string, endKey: string) {
    await connectDB();
    const journalTasks = await JournalTasks.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startKey, $lte: endKey }
    }).lean();

    let completed = 0;
    let missed = 0;
    for (const entry of journalTasks) {
      for (const t of entry.tasks) {
        if ((t as ITaskEntry).done) completed++;
        else missed++;
      }
    }
    return { completed, missed };
  }
  static async getTasks(userId: string) {
    await connectDB();

    // Resolve user timezone keys for today and yesterday efficiently
    const user = await UserRepository.findById(userId);
    const timezone = user?.timezone || "UTC";
    
    const today = new Date();
    const todayKey = DailyTaskService.formatDateKeyWithTz(today, timezone);
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = DailyTaskService.formatDateKeyWithTz(yesterdayDate, timezone);

    // Optional catch-up: if the app hasn't been opened for several days, backfill prior days as "missed"
    try {
      const latest = await JournalTasks.find({ userId: new mongoose.Types.ObjectId(userId) })
        .select("date")
        .sort({ date: -1 })
        .limit(1)
        .lean<{ date: string }[]>();
      
      const lastSnapshotKey = latest?.[0]?.date;
      
      if (lastSnapshotKey && lastSnapshotKey < yesterdayKey) {
        const tasksForSnapshot = await DailyTask.find({ userId }).sort({ createdAt: 1 }).lean();
        // Create entries for each missing day between lastSnapshotKey (exclusive) and yesterdayKey (inclusive)
        const missingKeys: string[] = [];
        const cursor = new Date(lastSnapshotKey);
        const end = new Date(yesterdayKey);
        // advance one day after last snapshot
        cursor.setDate(cursor.getDate() + 1);
        while (cursor <= end) {
          missingKeys.push(DailyTaskService.formatLocalDateKey(cursor));
          cursor.setDate(cursor.getDate() - 0 + 1);
        }
        
        if (missingKeys.length > 0) {
          await Promise.allSettled(
            missingKeys.map(key => {
              const entriesForDay = tasksForSnapshot
                .filter(t => {
                   const createdKey = DailyTaskService.formatDateKeyWithTz(t.createdAt, timezone);
                   return createdKey <= key;
                })
                .map(t => {
                  const done = t.lastCompletedDateKey === key;
                  return {
                    title: t.title,
                    duration: t.duration,
                    done
                  };
                });
              // Only insert if it doesn't exist, don't overwrite
              return JournalTasks.updateOne(
                { userId: new mongoose.Types.ObjectId(userId), date: key },
                { $setOnInsert: { tasks: entriesForDay } },
                { upsert: true }
              );
            })
          );
        }
      }
    } catch (err) {
      logger.error("Failed to persist yesterday task snapshot", err);
    }

    // Snapshot: tasks that were not completed yesterday get recorded in "not completed" for yesterday
    // Mark tasks not touched today as "yesterday" to persist missed stats
    await DailyTask.updateMany(
      {
        userId,
        isCompleted: false,
        $or: [
          { lastTouchedDateKey: { $ne: todayKey } },
          { lastTouchedDateKey: { $exists: false } },
          { lastTouchedDateKey: null }
        ],
      },
      { $set: { lastTouchedDateKey: yesterdayKey } }
    );

    const tasks = await DailyTask.find({ userId }).sort({ isCompleted: 1, createdAt: 1 }).lean();
    
    // Ensure today's journal has a record of these tasks (snapshots "Missed" count if nothing done yet)
    // Fire and forget to avoid slowing down read
    DailyTaskService.syncToJournal(userId).catch(err => logger.error("Failed to sync initial tasks", err));

    const tasksForToday = tasks.map(t => ({
      ...t,
      isCompleted: t.lastCompletedDateKey === todayKey
    })).sort((a, b) => {
      if (a.isCompleted === b.isCompleted) {
        const ad = new Date(a.createdAt as unknown as string).getTime();
        const bd = new Date(b.createdAt as unknown as string).getTime();
        return ad - bd;
      }
      return a.isCompleted ? 1 : -1;
    });

    logger.debug("[TaskService] Tasks fetched", {
      userId,
      dateKey: todayKey,
      total: tasksForToday.length,
      completed: tasksForToday.filter(t => t.isCompleted).length
    });

    return JSON.parse(JSON.stringify(tasksForToday));
  }

  static async getAllCompletionSummary(userId: string) {
    await connectDB();
    const uid = new mongoose.Types.ObjectId(userId);
    const rows = await JournalTasks.aggregate<{ completed: number; missed: number }>([
      { $match: { userId: uid } },
      { $unwind: { path: "$tasks", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: null,
          completed: { $sum: { $cond: [{ $eq: ["$tasks.done", true] }, 1, 0] } },
          missed: { $sum: { $cond: [{ $eq: ["$tasks.done", true] }, 0, 1] } },
        },
      },
    ]);
    const row = rows[0];
    return {
      completed: row?.completed ?? 0,
      missed: row?.missed ?? 0,
    };
  }

  static async getCompletedTasksByDate(userId: string, date: string) {
    await connectDB();
    const journalTasks = await JournalTasks.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date
    }).lean();

    if (!journalTasks) return [];

    const tasks = (journalTasks.tasks || [])
      .filter((t: ITaskEntry) => t.done === true)
      .map((t: ITaskEntry & { _id?: mongoose.Types.ObjectId }) => ({
        _id: t._id?.toString() || Math.random().toString(36).substring(7),
        title: t.title,
        duration: t.duration || "",
        isCompleted: true,
      }));

    return JSON.parse(JSON.stringify(tasks));
  }

  static async getIncompleteTasksByDate(userId: string, date: string) {
    await connectDB();
    const journalTasks = await JournalTasks.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date
    }).lean();

    if (!journalTasks) return [];

    const tasks = (journalTasks.tasks || [])
      .filter((t: ITaskEntry) => !t.done)
      .map((t: ITaskEntry & { _id?: mongoose.Types.ObjectId }) => ({
        _id: t._id?.toString() || Math.random().toString(36).substring(7),
        title: t.title,
        duration: t.duration || "",
        isCompleted: false,
      }));

    return JSON.parse(JSON.stringify(tasks));
  }

  static formatLocalDateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /** Format a YYYY-MM-DD key in the user's timezone */
  static async formatUserDateKey(userId: string, d: Date) {
    try {
      const user = await UserRepository.findById(userId);
      const timezone = user?.timezone || "UTC";
      return DailyTaskService.formatDateKeyWithTz(d, timezone);
    } catch {
      return DailyTaskService.formatLocalDateKey(d);
    }
  }

  /** Format a YYYY-MM-DD key using a known timezone to avoid DB lookups */
  static formatDateKeyWithTz(d: Date, timezone: string) {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: timezone,
      });
      return formatter.format(d);
    } catch {
      return DailyTaskService.formatLocalDateKey(d);
    }
  }

  static async createTask(userId: string, data: { title: string; duration: string }) {
    await connectDB();
    const todayKey = await DailyTaskService.formatUserDateKey(userId, new Date());
    const task = await DailyTask.create({ userId, ...data, lastTouchedDateKey: todayKey });
    // Sync to Journal history
    await DailyTaskService.syncToJournal(userId, todayKey);
    return JSON.parse(JSON.stringify(task));
  }

  static async updateTask(userId: string, taskId: string, data: Partial<IDailyTask> & { completedDateKey?: string }) {
    await connectDB();
    
    const updateData: Record<string, unknown> = { ...data };
    const clientDateKey = typeof data.completedDateKey === "string" && data.completedDateKey.length > 0 
      ? data.completedDateKey 
      : await DailyTaskService.formatUserDateKey(userId, new Date());

    // Always record a touch key for this date
    updateData.lastTouchedDateKey = clientDateKey;
    
    if (data.isCompleted === true) {
      updateData.lastCompletedAt = new Date();
      updateData.lastCompletedDateKey = clientDateKey;
      await UserActivityService.recordActivity(userId);
    } else if (data.isCompleted === false) {
      // Unchecking should clear today's completed key
      updateData.lastCompletedDateKey = null;
      updateData.lastCompletedAt = null;
    }

    const task = await DailyTask.findOneAndUpdate(
      { _id: taskId, userId },
      { $set: updateData },
      { returnDocument: 'after' }
    ).lean();
    
    // Sync to Journal history
    if (task) await DailyTaskService.syncToJournal(userId, clientDateKey);
    
    return task ? JSON.parse(JSON.stringify(task)) : null;
  }

  static async deleteTask(userId: string, taskId: string) {
    await connectDB();
    await DailyTask.deleteOne({ _id: taskId, userId });
    // Sync to Journal history
    await DailyTaskService.syncToJournal(userId);
    return { success: true };
  }

  /** Days (YYYY-MM-DD) where the user completed at least one task. Used for streak. */
  static async getCompletionStreak(userId: string): Promise<number> {
    await connectDB();
    const journalTasks = await JournalTasks.find({
      userId: new mongoose.Types.ObjectId(userId)
    }).select('date tasks').lean();

    const datesSet = new Set<string>();
    for (const entry of journalTasks) {
      if (entry.tasks.some((t: ITaskEntry) => t.done)) {
        datesSet.add(entry.date);
      }
    }

    if (datesSet.size === 0) return 0;

    const user = await UserRepository.findById(userId);
    const timezone = user?.timezone || "UTC";
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    });

    const today = new Date();
    const todayKey = formatter.format(today);
    let cursor = new Date(today);
    
    if (!datesSet.has(todayKey)) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = formatter.format(yesterday);
      if (datesSet.has(yesterdayKey)) {
        cursor = yesterday;
      } else {
        return 0;
      }
    }

    let streak = 0;
    while (datesSet.has(formatter.format(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
}
