import { WeeklyFocus, IWeeklyFocus } from '@/models/WeeklyFocus';
import connectDB from '@/lib/mongodb';
import { logger } from '@/lib/logger';

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
    const focus = await WeeklyFocus.findOne({ userId }).lean();
    if (!focus) return null;
    
    // Serialize MongoDB object to plain JSON
    return JSON.parse(JSON.stringify(focus));
  }

  static async updateWeeklyFocus(userId: string, tasks: Partial<IWeeklyFocus['tasks']>) {
    await connectDB();
    
    // Construct the update object using dot notation for nested fields
    // This ensures we only update the specific day provided, not replace the whole 'tasks' object
    const update: Record<string, string> = {};
    for (const [key, value] of Object.entries(tasks)) {
      update[`tasks.${key}`] = value as string;
      WeeklyFocusService.logAudit("WEEKLY_FOCUS_UPDATED", userId, { day: key, focus: value }).catch(() => {});
    }

    const focus = await WeeklyFocus.findOneAndUpdate(
      { userId },
      { $set: update },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    ).lean();
    
    // Serialize MongoDB object to plain JSON
    return JSON.parse(JSON.stringify(focus));
  }
}
