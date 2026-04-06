"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { UserRepository } from "@/repositories/user.repository";
import { isOwnerOrAdmin } from "@/permissions";
import { WorkoutService } from "@/services/workout.service";
import { WorkoutRepository } from "@/repositories/workout.repository";
import { JournalRepository } from "@/repositories/journal.repository";
import { IWorkoutEntry } from "@/models/JournalWorkouts";
import { logger } from "@/lib/logger";
import { estimateNutrition } from "@/lib/nutrition";
import { AuditService } from "@/services/audit.service";
import { after } from "next/server";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().min(1).max(100).optional(),
  goals: z.string().optional(),
  avatarUrl: z.string().max(500).optional(),
});

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const raw = {
    name: formData.get("name")?.toString(),
    bio: formData.get("bio")?.toString(),
    timezone: formData.get("timezone")?.toString(),
    goals: formData.get("goals")?.toString(),
    avatarUrl: formData.get("avatarUrl")?.toString(),
  };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid input", details: parsed.error.flatten() };
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};
  if (data.name) update.name = data.name.trim();
  if (data.bio !== undefined) update.bio = data.bio?.trim() || "";
  if (data.timezone) update.timezone = data.timezone;
  if (data.avatarUrl) update.avatarUrl = data.avatarUrl;
  if (data.goals !== undefined) {
    const goalsArr =
      data.goals
        ?.split(",")
        .map((g) => g.trim())
        .filter((g) => g.length > 0) ?? [];
    update.goals = goalsArr;
  }

  if (!isOwnerOrAdmin(session.user, session.user.id)) {
    return { error: "Unauthorized" };
  }

  try {
    await UserRepository.update(session.user.id, update);
    after(async () => {
      await AuditService.log("PROFILE_UPDATED", session.user.id, "User", { fields: Object.keys(update) });
    });
    revalidatePath("/user/profile");
    return { success: true };
  } catch (err) {
    logger.error("updateUserProfile error", err as unknown);
    return { error: "Failed to update profile" };
  }
}

export async function getConsistencyHeatmap(): Promise<{ date: string; level: number }[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const userId = session.user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startStr = fmt(start);
  const endStr = fmt(today);

  const journalDocs = await JournalRepository.findJournalDates(userId);
  const journalDates = new Set(
    (journalDocs || [])
      .map(d => d.date)
      .filter((d) => d >= startStr && d <= endStr)
  );

  const tasksDocs = await JournalRepository.findCompletedTasks(userId);
  const latestEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const taskDates = new Set(
    (tasksDocs || [])
      .map(t => t.lastCompletedAt)
      .filter(Boolean)
      .filter((dt) => {
        const d = new Date(dt as Date);
        return d >= start && d <= latestEnd;
      })
      .map(dt => fmt(new Date(dt as Date)))
  );

  const workoutDateKeys = await WorkoutRepository.findWorkoutDateKeys(userId, startStr, endStr);
  const workoutDates = new Set<string>(workoutDateKeys);

  // Build heatmap array
  const days: { date: string; level: number }[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 365; i++) {
    const key = fmt(cursor);
    let level = 0;
    if (workoutDates.has(key)) level++;
    if (journalDates.has(key)) level++;
    if (taskDates.has(key)) level++;
    days.push({ date: key, level });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function getJournalHistoryForExport() {
  const session = await auth();
  if (!session?.user?.id) return [];
  
  const userId = session.user.id;
  const [journals, medias, foods, spendings] = await Promise.all([
    JournalRepository.findJournalsByUser(userId),
    JournalRepository.findMediaByUser(userId),
    JournalRepository.findFoodByUser(userId),
    JournalRepository.findSpendingByUser(userId),
  ]);

  interface JournalExportEntry {
    date: string;
    mainTask: string;
    notes: string;
    isBookmarked: boolean;
    images: Array<string | { url: string }>;
    foodImages: Array<string | { url: string }>;
    macros: { calories?: number; protein?: number; carbs?: number; fats?: number } | null;
    foodText: string | null;
    todaySpent: number;
  }
  const mapByDate = new Map<string, JournalExportEntry>();

  for (const j of journals) {
    mapByDate.set(j.date, {
      date: j.date,
      mainTask: j.mainTask || "",
      notes: j.notes || "",
      isBookmarked: !!(j.isBookmarked),
      images: [],
      foodImages: [],
      macros: null,
      foodText: null,
      todaySpent: 0
    });
  }

  for (const m of medias) {
    if (!mapByDate.has(m.date)) {
      mapByDate.set(m.date, { date: m.date, mainTask: "", notes: "", isBookmarked: false, images: [], foodImages: [], macros: null, foodText: null, todaySpent: 0 });
    }
    const e1 = mapByDate.get(m.date)!;
    e1.images = m.images || [];
    e1.foodImages = m.foodImages || [];
  }

  for (const f of foods) {
    if (!mapByDate.has(f.date)) {
      mapByDate.set(f.date, { date: f.date, mainTask: "", notes: "", isBookmarked: false, images: [], foodImages: [], macros: null, foodText: null, todaySpent: 0 });
    }
    if (f.food) {
      const allText = [f.food.morning, f.food.lunch, f.food.noon, f.food.dinner].filter(Boolean).join("\\n");
      const macros = estimateNutrition(allText);
      
      const foodParts = [];
      if (f.food.morning) foodParts.push(`Morning: ${f.food.morning}`);
      if (f.food.lunch) foodParts.push(`Lunch: ${f.food.lunch}`);
      if (f.food.noon) foodParts.push(`Snack: ${f.food.noon}`);
      if (f.food.dinner) foodParts.push(`Dinner: ${f.food.dinner}`);
      
      const e2 = mapByDate.get(f.date)!;
      e2.macros = macros;
      if (foodParts.length > 0) {
        e2.foodText = foodParts.join("\\n");
      }
    }
  }

  for (const s of spendings) {
    if (!mapByDate.has(s.date)) {
      mapByDate.set(s.date, { date: s.date, mainTask: "", notes: "", isBookmarked: false, images: [], foodImages: [], macros: null, foodText: null, todaySpent: 0 });
    }
    const e3 = mapByDate.get(s.date)!;
    e3.todaySpent = s.totalSpent || 0;
  }

  // Sort by date descending
  const sortedDates = Array.from(mapByDate.keys()).sort((a, b) => b.localeCompare(a));
  
  return sortedDates.map(date => mapByDate.get(date) as JournalExportEntry);
}

export async function getWorkoutHistoryForExport() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const docs = await WorkoutService.getWorkoutHistory(session.user.id, undefined, undefined, 0);
  const arr = Array.isArray(docs) ? docs as Array<{ date: string; workouts: IWorkoutEntry[] }> : [];
  const sorted = arr.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return sorted.map(d => ({
    date: d.date,
    workouts: Array.isArray(d.workouts) ? d.workouts : []
  }));
}
