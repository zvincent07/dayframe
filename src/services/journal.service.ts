import type { JournalUpdateInput } from "@/schemas/journal";
import { JournalRepository } from "@/repositories/journal.repository";
import { UserActivityRepository } from "@/repositories/user-activity.repository";
import { UserRepository } from "@/repositories/user.repository";
import { UserActivityService } from "./user-activity.service";
import { Types } from "mongoose";
import { estimateNutrition } from "@/lib/nutrition";
import { logger } from "@/lib/logger";

interface JournalDoc {
  _id: Types.ObjectId | string;
  isBookmarked?: boolean;
  bookmarked?: boolean;
  [key: string]: unknown;
}

type FoodLog = Record<string, string>;

interface JournalHistoryDoc extends JournalDoc {
  date: string;
  updatedAt?: Date;
  imagesCount?: number;
  hasFoodLog?: boolean;
  food?: FoodLog | null;
  spendingCount?: number;
  spending?: { price: number; item: string }[];
  currency?: string;
}

export class JournalService {
  private static async logAudit(action: string, userId: string, details?: Record<string, any>) {
    try {
      const { AuditService } = await import("@/services/audit.service");
      const user = await UserRepository.findById(userId);
      if (user) {
        await AuditService.log(action, undefined, "Journal", details, { id: userId, email: user.email || "" });
      }
    } catch (err) {
      logger.error("Failed to log journal audit", err);
    }
  }

  /**
   * Spending docs often store USD as a schema default. When the user prefers another currency,
   * treat stored USD as unset and use their profile currency for display.
   */
  static resolveJournalCurrency(stored: unknown, preferredCurrency: string | undefined): string {
    const pref = (preferredCurrency || "").trim().toUpperCase() || "USD";
    const s = typeof stored === "string" ? stored.trim().toUpperCase() : "";
    if (!s) return pref;
    if (s === "USD" && pref !== "USD") return pref;
    return s;
  }

  /** Total spent for week (calendar week), month, and year. Dates are YYYY-MM-DD. */
  static async getTotalSpent(
    userId: string
  ): Promise<{ week: number; month: number; year: number; currency: string }> {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const dayOfWeek = now.getDay();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
    const today = fmt(y, m + 1, d);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(d - dayOfWeek);
    const weekStart = fmt(
      startOfWeek.getFullYear(),
      startOfWeek.getMonth() + 1,
      startOfWeek.getDate()
    );
    const monthStart = fmt(y, m + 1, 1);
    const yearStart = fmt(y, 1, 1);

    const docs = await JournalRepository.findSpendingByDateRange(userId, yearStart, today) as Array<{ date: string; currency?: string; spending?: Array<{ price?: number }>; totalSpent?: number }>;

    let week = 0;
    let month = 0;
    let year = 0;
    let currency = "USD";
    const currencyCount = new Map<string, number>();

    for (const doc of docs) {
      const date = doc.date;
      const sum = doc.totalSpent !== undefined ? doc.totalSpent : (doc.spending ?? []).reduce((s: number, e: { price?: number }) => s + (e.price ?? 0), 0);
      if (date >= yearStart) year += sum;
      if (date >= monthStart) month += sum;
      if (date >= weekStart) week += sum;
      
      const c = (doc.currency || "").trim().toUpperCase();
      const spendingCount = (doc.spending || []).length;
      if (c && spendingCount > 0) {
        currencyCount.set(c, (currencyCount.get(c) || 0) + spendingCount);
      }
    }
    
    try {
      const user = await UserRepository.findById(userId);
      const pref = user?.preferredCurrency;
      if (pref && pref.trim()) {
        currency = pref.trim().toUpperCase();
      } else if (currencyCount.size > 0) {
        currency = [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
      }
    } catch {
      if (currencyCount.size > 0) {
        currency = [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
      }
    }
    return { week, month, year, currency };
  }

  static async getStats(userId: string): Promise<{ totalEntries: number; streak: number; totalJournalEntries: number }> {
    const [activityDates, taskActivityDateKeys, totalJournalEntries, user] = await Promise.all([
      UserActivityRepository.findActivityDates(userId),
      JournalRepository.findTaskCompletedDateKeys(userId),
      JournalRepository.countJournalEntriesWithContent(userId),
      UserRepository.findById(userId),
    ]);
    const activitySet = new Set<string>([...activityDates, ...taskActivityDateKeys]);

    const totalEntries = activitySet.size;

    const timezone = user?.timezone || "UTC";
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    });

    const today = new Date();
    const todayKey = formatter.format(today);

    let streak = 0;
    let cursor: Date | null = null;

    if (activitySet.has(todayKey)) {
      cursor = new Date(today);
    } else {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = formatter.format(yesterday);
      if (activitySet.has(yesterdayKey)) {
        cursor = yesterday;
      }
    }

    if (cursor) {
      while (activitySet.has(formatter.format(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    return { totalEntries, streak, totalJournalEntries };
  }

  static async getJournalEntry(userId: string, date: string) {
    const [fullEntry, user] = await Promise.all([
      JournalRepository.findFullJournalEntry(userId, date),
      UserRepository.findById(userId),
    ]);

    if (!fullEntry) {
      return null;
    }

    const { core, media, food, spending, tasks, workouts } = fullEntry;
    const legacy = core as Record<string, unknown>;
    
    const defaultFood = { morning: "", lunch: "", noon: "", dinner: "" };
    const merged = {
      _id: legacy._id,
      userId: legacy.userId,
      date: legacy.date,
      mainTask: legacy.mainTask ?? "",
      notes: legacy.notes ?? "",
      isBookmarked: legacy.isBookmarked ?? legacy.bookmarked ?? false,
      mentorsComments: legacy.mentorsComments ?? [],
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
      images: media?.images ?? [],
      foodImages: media?.foodImages ?? [],
      food: food?.food ?? defaultFood,
      currency: JournalService.resolveJournalCurrency(spending?.currency, user?.preferredCurrency),
      spending: spending?.spending ?? [],
      tasks: tasks?.tasks ?? [],
      workouts: workouts?.workouts ?? [],
    };
    return JSON.parse(JSON.stringify(merged));
  }

  static async updateJournalEntry(
    userId: string,
    date: string,
    data: JournalUpdateInput
  ): Promise<Record<string, unknown> | null> {
    const foodDefault = { morning: "", lunch: "", noon: "", dinner: "" };
    const food =
      data.food && typeof data.food === "object"
        ? {
            morning: String((data.food as { morning?: string }).morning ?? ""),
            lunch: String((data.food as { lunch?: string }).lunch ?? ""),
            noon: String((data.food as { noon?: string }).noon ?? ""),
            dinner: String((data.food as { dinner?: string }).dinner ?? ""),
          }
        : foodDefault;

    const spending = Array.isArray(data.spending)
      ? data.spending
          .map((e) => ({
            price: Number(e.price),
            item: String(e.item ?? "").trim(),
            description:
              e.description != null && String(e.description).trim() !== ""
                ? String(e.description).trim()
                : undefined,
          }))
          .filter((e) => e.item.length > 0)
      : [];

    // Audit individual activities
    if (spending.length > 0) {
      JournalService.logAudit("SPENDING_LOGGED", userId, { 
        date, 
        count: spending.length, 
        items: spending.map(s => s.item).join(", ") 
      }).catch(() => {});
    }

    const hasFood = data.food && Object.values(data.food).some(v => v && String(v).trim().length > 0);
    if (hasFood) {
      const foodText = Object.values(data.food as Record<string, string>).join(" ");
      const nutrition = estimateNutrition(foodText);
      JournalService.logAudit("FOOD_LOGGED", userId, { 
        date, 
        calories: nutrition.calories 
      }).catch(() => {});
    }

    await Promise.all([
      JournalRepository.upsertJournalEntry(userId, date, {
        mainTask: data.mainTask?.trim(),
        notes: data.notes?.trim(),
        images: Array.isArray(data.images) ? data.images : [],
        foodImages: Array.isArray(data.foodImages) ? data.foodImages : [],
        food,
        currency: String(data.currency ?? "USD"),
        spending,
        tasks: Array.isArray(data.tasks)
          ? data.tasks.map((t) => ({
              title: t.title,
              duration: t.duration ?? "",
              done: t.done ?? false,
            }))
          : [],
        workouts: Array.isArray(data.workouts) ? data.workouts : [],
      }),
      UserActivityService.recordActivity(userId),
    ]);

    return this.getJournalEntry(userId, date);
  }

  static async updateFoodImagesAndCurrency(
    userId: string,
    date: string,
    foodImages: string[],
    currency: string
  ): Promise<void> {
    await Promise.all([
      JournalRepository.updateFoodAndCurrencyOnly(userId, date, foodImages, currency),
      UserActivityService.recordActivity(userId),
    ]);
  }

  static async toggleBookmark(userId: string, date: string): Promise<boolean> {
    const entry = await JournalRepository.findByDate(userId, date) as JournalDoc | null;
    
    // Determine new status (default to true if entry doesn't exist or isBookmarked is undefined/false)
    const currentStatus = entry ? (entry.isBookmarked ?? entry.bookmarked ?? false) : false;
    const newStatus = !currentStatus;
    
    // Use the repository method which bypasses Mongoose schema caching via collection.findOneAndUpdate
    await JournalRepository.updateIsBookmarked(userId, date, newStatus);
    
    return newStatus;
  }

  static async getHistory(userId: string) {
    const rawHistory = await JournalRepository.findJournalHistory(userId) as unknown as JournalHistoryDoc[];
    
    const estimateCalories = (food: FoodLog | null | undefined) => {
      if (!food) return 0;
      
      let totalCalories = 0;
      
      Object.values(food).forEach((mealEntry) => {
        if (typeof mealEntry === 'string') {
          // 1. Try to use the shared nutrition estimator first (handles "100g chicken" -> 165 kcal)
          const nutrition = estimateNutrition(mealEntry);
          if (nutrition.calories > 0) {
            totalCalories += nutrition.calories;
            return; // If we successfully estimated nutrition, skip manual regex parsing for this entry to avoid double counting
          }

          let text = mealEntry;

          // 2. Fallback: Match "500 kcal", "500kcal", "500 calories" (Number then Unit)
          text = text.replace(/([\d,]+)\s*(?:k?cals?|calories?)/gi, (match, numberPart) => {
             const num = parseInt(numberPart.replace(/,/g, ''), 10);
             if (!isNaN(num)) totalCalories += num;
             return " "; 
          });

          // 3. Fallback: Match "Kcal: 618", "Calories 1200", "Cal - 500" (Unit then Number)
          text = text.replace(/(?:k?cals?|calories?)\s*[:=-]?\s*([\d,]+)/gi, (match, numberPart) => {
             const num = parseInt(numberPart.replace(/,/g, ''), 10);
             if (!isNaN(num)) totalCalories += num;
             return " "; 
          });

          // 4. Fallback: Implicit numbers (10-8000)
          const implicitMatches = text.matchAll(/(?:^|[\s,;:\(\)-])([\d,]{2,5})(?:$|[\s,;:\(\)-])/g);
          
          for (const match of implicitMatches) {
             const num = parseInt(match[1].replace(/,/g, ''), 10);
             if (!isNaN(num) && num >= 10 && num <= 8000) {
               totalCalories += num;
             }
          }
        }
      });
      
      return totalCalories;
    };
    
    // Helper to calculate total spent
    const calculateTotalSpent = (spending: { price: number }[] | undefined) => {
      if (!spending || !Array.isArray(spending)) return 0;
      return spending.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    };

    return rawHistory.map((entry) => ({
      ...entry,
      isBookmarked: entry.isBookmarked ?? entry.bookmarked ?? false,
      lastEdited: entry.updatedAt ? entry.updatedAt.toISOString() : undefined,
      imagesCount: entry.imagesCount || 0,
      calories: estimateCalories(entry.food),
      totalSpent: calculateTotalSpent(entry.spending),
      currency: entry.currency || "USD",
      hasLogged: !!(entry.mainTask || entry.notes || entry.imagesCount || entry.hasFoodLog || entry.spendingCount),
    }));
  }
}
