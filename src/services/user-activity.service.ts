import { UserRepository } from "@/repositories/user.repository";
import { UserActivityRepository } from "@/repositories/user-activity.repository";

export class UserActivityService {
  /**
   * Records an activity for the current day based on the user's timezone.
   */
  static async recordActivity(userId: string): Promise<void> {
    const user = await UserRepository.findById(userId);
    const timezone = user?.timezone || "UTC"; // Default to UTC if no timezone is set

    // Use Intl.DateTimeFormat with the en-CA locale to reliably get YYYY-MM-DD format
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    });

    const dateStr = formatter.format(new Date());

    await UserActivityRepository.recordActivity(userId, dateStr);
  }
}
