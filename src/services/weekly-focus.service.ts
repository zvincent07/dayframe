import { WeeklyFocus, IWeeklyFocus } from '@/models/WeeklyFocus';
import connectDB from '@/lib/mongodb';

export class WeeklyFocusService {
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
