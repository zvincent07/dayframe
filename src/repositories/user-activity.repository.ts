import { UserActivity } from "@/models/UserActivity";
import connectDB, { toObjectId } from "@/lib/mongodb";

export class UserActivityRepository {
  /**
   * Records a user activity for a given date if one does not already exist.
   * This is an atomic upsert operation.
   */
  static async recordActivity(userId: string, date: string): Promise<void> {
    await connectDB();
    const uid = toObjectId(userId);

    await UserActivity.findOneAndUpdate(
      { userId: uid, date },
      { $setOnInsert: { userId: uid, date } },
      { upsert: true, returnDocument: 'before' }
    );
  }

  /**
   * Retrieves all unique dates a user has been active.
   */
  static async findActivityDates(userId: string): Promise<string[]> {
    await connectDB();
    const uid = toObjectId(userId);
    const activities = await UserActivity.find({ userId: uid }).select("date -_id").lean();
    return activities.map(a => a.date);
  }
}
