import { WeeklyFocus, IWeeklyFocus } from '@/models/WeeklyFocus';
import connectDB from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { decryptJsonFromDb, encryptJsonForDb } from "@/lib/db-encryption";

export class WeeklyFocusService {
  private static async logAudit(action: string, userId: string, details?: Record<string, any>) {
    try {
      const { AuditService } = await import("@/services/audit.service");
      const { User } = await import("@/models/User");
      const user = await User.findById(userId).select("email").lean();
      if (user) {
        await AuditService.log(action, undefined, "WeeklyFocus", details, { id: userId, email: user.email || "" });
      }
    } catch (err) {
      logger.error("Failed to log weekly focus audit", err);
    }
  }

  static async getWeeklyFocus(userId: string) {
    await connectDB();
    const focus = await WeeklyFocus.findOne({ userId }).lean<Record<string, unknown> | null>();
    if (!focus) return null;

    const decrypted = decryptJsonFromDb<{ tasks?: IWeeklyFocus["tasks"] }>(focus.enc);
    const merged = decrypted?.tasks ? { ...focus, tasks: decrypted.tasks } : focus;
    return JSON.parse(JSON.stringify(merged));
  }

  static async updateWeeklyFocus(userId: string, tasks: Partial<IWeeklyFocus['tasks']>) {
    await connectDB();

    const existing = await WeeklyFocus.findOne({ userId }).lean<Record<string, unknown> | null>();
    const decrypted = existing ? decryptJsonFromDb<{ tasks?: IWeeklyFocus["tasks"] }>(existing.enc) : null;
    const currentTasks: IWeeklyFocus["tasks"] =
      decrypted?.tasks ??
      (existing?.tasks as IWeeklyFocus["tasks"] | undefined) ??
      { sunday: "", monday: "", tuesday: "", wednesday: "", thursday: "", friday: "", saturday: "" };

    const nextTasks: IWeeklyFocus["tasks"] = { ...currentTasks, ...tasks };
    for (const [key, value] of Object.entries(tasks)) {
      WeeklyFocusService.logAudit("WEEKLY_FOCUS_UPDATED", userId, { day: key, focus: value }).catch(() => {});
    }

    const enc = encryptJsonForDb({ tasks: nextTasks });
    const focus = await WeeklyFocus.findOneAndUpdate(
      { userId },
      { $set: { tasks: { sunday: "", monday: "", tuesday: "", wednesday: "", thursday: "", friday: "", saturday: "" }, enc } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return JSON.parse(JSON.stringify({ ...(focus as Record<string, unknown>), tasks: nextTasks }));
  }
}
