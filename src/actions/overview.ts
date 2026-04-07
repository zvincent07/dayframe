"use server";

import { auth } from "@/auth";
import { WorkoutService } from "@/services/workout.service";
import { JournalRepository } from "@/repositories/journal.repository";
import { DailyTaskService } from "@/services/task.service";
import { UserRepository } from "@/repositories/user.repository";
import { AIInsightRepository } from "@/repositories/ai-insight.repository";
import { requirePermission } from "@/permissions";

type Timeframe = "7d" | "30d" | "1y" | "all";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthLabel(m: number) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[m] || "";
}

function weekdayLabel(d: Date) {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return days[d.getDay()];
}

export async function getVolumeTrend(timeframe: Timeframe) {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-activity");
  const end = new Date();
  let start: Date;
  if (timeframe === "7d") start = addDays(end, -6);
  else if (timeframe === "30d") start = addDays(end, -29);
  else if (timeframe === "1y") {
    start = new Date(end.getFullYear(), 0, 1);
  } else {
    // "all" - practically use a far past date
    start = new Date(2020, 0, 1);
  }
  const startKey = formatDateKey(start);
  const endKey = formatDateKey(end);
  const docs = await WorkoutService.getWorkoutHistory(session.user.id, startKey, endKey, 400);
  const byDate = new Map<string, number>();
  for (const doc of docs as Array<{ date: string; workouts: Array<{ history?: Array<{ targetWeight?: number; actualWeight?: number; targetReps?: number; actualReps?: number; completed?: boolean }> }> }>) {
    let v = 0;
    const workouts = Array.isArray(doc.workouts) ? doc.workouts : [];
    for (const w of workouts) {
      const hist = Array.isArray(w.history) ? w.history : [];
      for (const h of hist) {
        const weight = typeof h.actualWeight === "number" ? h.actualWeight : (typeof h.targetWeight === "number" ? h.targetWeight : 0);
        const reps = typeof h.actualReps === "number" ? h.actualReps : (typeof h.targetReps === "number" ? h.targetReps : 0);
        if (h?.completed) v += weight * reps;
      }
    }
    byDate.set(doc.date, (byDate.get(doc.date) || 0) + v);
  }
  if (timeframe === "1y" || timeframe === "all") {
    const months = new Array(12).fill(0);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const key = formatDateKey(d);
      const vol = byDate.get(key) || 0;
      months[d.getMonth()] += vol;
    }
    return months.map((v, i) => ({ day: monthLabel(i), volume: Math.round(v) }));
  }
  const result: Array<{ day: string; volume: number }> = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const key = formatDateKey(d);
    const vol = byDate.get(key) || 0;
    const label = timeframe === "7d" ? weekdayLabel(d) : String(d.getDate());
    result.push({ day: label, volume: Math.round(vol) });
  }
  return result;
}

import { getMostFrequentCurrency } from "@/lib/journal-utils";
import { WorkoutRepository } from "@/repositories/workout.repository";

export async function getSpendingBreakdown(timeframe: Timeframe) {
  const session = await auth();
  if (!session?.user?.id) return { series: [], currency: "USD" };
  requirePermission(session.user, "view:own-activity");
  const end = new Date();
  let start: Date;
  if (timeframe === "7d") start = addDays(end, -6);
  else if (timeframe === "30d") start = addDays(end, -29);
  else if (timeframe === "1y") {
    start = new Date(end.getFullYear(), 0, 1);
  } else {
    start = new Date(2020, 0, 1);
  }
  const startKey = formatDateKey(start);
  const endKey = formatDateKey(end);
  const docs = await JournalRepository.findSpendingByDateRange(session.user.id, startKey, endKey);
  const byDate = new Map<string, number>();
  for (const doc of docs as Array<{ date: string; currency?: string; spending?: Array<{ price?: number }>; totalSpent?: number }>) {
    const sum = doc.totalSpent !== undefined ? doc.totalSpent : (doc.spending || []).reduce((s, e) => s + (e?.price || 0), 0);
    byDate.set(doc.date, (byDate.get(doc.date) || 0) + sum);
  }

  let currency = "USD";
  try {
    const user = await UserRepository.findById(session.user.id);
    const pref = user?.preferredCurrency;
    if (pref && pref.trim()) {
      currency = pref.trim().toUpperCase();
    } else {
      currency = getMostFrequentCurrency(
        docs as Array<{ currency?: string; spending?: Array<{ price?: number }> }>,
        currency
      );
    }
  } catch {
    currency = getMostFrequentCurrency(
      docs as Array<{ currency?: string; spending?: Array<{ price?: number }> }>,
      currency
    );
  }
  if (timeframe === "1y" || timeframe === "all") {
    const months = new Array(12).fill(0);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const key = formatDateKey(d);
      months[d.getMonth()] += byDate.get(key) || 0;
    }
    return { series: months.map((v, i) => ({ day: monthLabel(i), amount: Math.round(v) })), currency };
  }
  const result: Array<{ day: string; amount: number }> = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const key = formatDateKey(d);
    const amt = byDate.get(key) || 0;
    const label = timeframe === "7d" ? weekdayLabel(d) : String(d.getDate());
    result.push({ day: label, amount: Math.round(amt) });
  }
  return { series: result, currency };
}

export async function getTaskCompletion(timeframe: Timeframe) {
  const session = await auth();
  if (!session?.user?.id) return [{ name: "Completed", value: 0 }, { name: "Missed", value: 0 }];
  requirePermission(session.user, "view:own-activity");
  
  const end = new Date();
  let start: Date;
  if (timeframe === "7d") start = addDays(end, -6);
  else if (timeframe === "30d") start = addDays(end, -29);
  else if (timeframe === "1y") {
    start = new Date(end.getFullYear(), 0, 1);
  } else {
    start = new Date(2020, 0, 1);
  }

  const startKey = formatDateKey(start);
  const endKey = formatDateKey(end);

  const taskDocs = await JournalRepository.findTasksByDateRange(session.user.id, startKey, endKey);
  const currentTasksRaw = await DailyTaskService.getTasks(session.user.id);
  // Ensure we have an array
  const currentTasks = Array.isArray(currentTasksRaw) ? currentTasksRaw : [];
  
  const todayKey = formatDateKey(new Date());

  let completed = 0;
  let missed = 0;
  const coveredDates = new Set<string>();

  // Aggregate from historical journal records
  if (Array.isArray(taskDocs)) {
    for (const doc of taskDocs as Array<{ date: string; tasks?: Array<{ title?: string; duration?: string; done?: boolean }> }>) {
      // Skip "today" from journal history (if it exists), we will use live data
      if (doc.date === todayKey) continue;
      
      coveredDates.add(doc.date);
      const tasks = Array.isArray(doc.tasks) ? doc.tasks : [];
      for (const t of tasks) {
        if (t.done) completed++;
        else missed++;
      }
    }
  }

  // Always use live data for today if today is in range
  if (todayKey >= startKey && todayKey <= endKey) {
    for (const t of currentTasks) {
      if (t.isCompleted) completed++;
      else missed++;
    }
    coveredDates.add(todayKey);
  }

  // Fallback for days in range that have no journal entry but have a lastCompletedDateKey
  // This recovers "last completion" history for users with no journal entries
  for (const t of currentTasks) {
    const key = t.lastCompletedDateKey;
    if (key && key >= startKey && key <= endKey && !coveredDates.has(key)) {
      // We found a task completed on a day that has no journal record.
      // Count it as completed.
      completed++;
    }
  }

  return [
    { name: "Completed", value: completed },
    { name: "Missed", value: missed },
  ];
}

export async function getUpNext() {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-activity");

  const items: Array<{ kind: "workout" | "task" | "journal"; label: string; tag?: string; badge?: string }> = [];

  const now = new Date();
  const todayKey = formatDateKey(now);

  // 1) Planned workout (if scheduled and not logged)
  try {
    const [routines, plan] = await WorkoutRepository.findConfig(session.user.id);
    if (plan && plan.schedule) {
      const dow = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][now.getDay()] as keyof typeof plan.schedule;
      const planned = (plan.schedule[dow] || "").trim();
      if (planned && planned.toUpperCase() !== "REST") {
        const log = await WorkoutRepository.findWorkoutLog(session.user.id, todayKey);
        const hasAny = !!(log && Array.isArray(log.workouts) && log.workouts.length > 0);
        if (!hasAny) {
          // Resolve routineId to friendly name if available
          let display = planned;
          try {
            const routine = (routines || []).find(r => r.routineId === planned || r.name === planned);
            if (routine?.name) display = routine.name;
          } catch {}
          items.push({ kind: "workout", label: `${display} Workout`, badge: "Scheduled" });
        }
      }
    }
  } catch {}

  // 2) First 2-3 incomplete tasks for today
  try {
    const incomplete = await DailyTaskService.getIncompleteTasksByDate(session.user.id, todayKey);
    for (const t of (incomplete || []).slice(0, 3)) {
      items.push({ kind: "task", label: t.title || "Untitled task", tag: "Task" });
    }
  } catch {}

  // 3) Journal reminder if after 20:00 local time and no journal entry
  try {
    // Try to use user's timezone if available
    let hour = now.getHours();
    try {
      const user = await UserRepository.findById(session.user.id);
      const tz = user?.timezone || "UTC";
      const hourStr = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(now);
      hour = parseInt(hourStr, 10);
    } catch {}

    if (hour >= 20) {
      const journal = await JournalRepository.findByDate(session.user.id, todayKey);
      if (!journal) {
        items.push({ kind: "journal", label: "Write today's journal entry", tag: "Journal" });
      }
    }
  } catch {}

  return items;
}

export async function getInsightHistory(page: number = 1, limit: number = 20) {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-activity");
  const { items } = await AIInsightRepository.findByUser(session.user.id, page, limit);
  // Sanitize for Client Components: convert ObjectId/Date to strings and drop non-serializable fields
  const safe = (Array.isArray(items) ? items : []).map((i) => ({
    _id: i?._id?.toString() ?? String(i?._id ?? ""),
    createdAt: i?.createdAt instanceof Date ? i.createdAt.toISOString() : String(i?.createdAt ?? ""),
    insight: typeof i?.insight === "string" ? i.insight : String(i?.insight ?? ""),
    timeframe: typeof i?.timeframe === "string" ? i.timeframe : String(i?.timeframe ?? ""),
  }));
  return safe;
}

export async function getPreviousTotals(timeframe: Timeframe) {
  const session = await auth();
  if (!session?.user?.id) return { volume: 0, spending: 0, completed: 0 };
  
  // We can silently continue for previous totals or require permission
  requirePermission(session.user, "view:own-activity");

  const end = new Date();
  let start: Date;
  let prevEnd: Date;

  if (timeframe === "7d") {
    prevEnd = addDays(end, -7);
    start = addDays(end, -13);
  } else if (timeframe === "30d") {
    prevEnd = addDays(end, -30);
    start = addDays(end, -59);
  } else if (timeframe === "1y") {
    prevEnd = new Date(end.getFullYear() - 1, 11, 31);
    start = new Date(end.getFullYear() - 1, 0, 1);
  } else {
    // For "all", there's no "previous" all, so return 0
    return { volume: 0, spending: 0, completed: 0 };
  }

  const startKey = formatDateKey(start);
  const endKey = formatDateKey(prevEnd);

  // 1. Volume
  const workoutDocs = await WorkoutService.getWorkoutHistory(session.user.id, startKey, endKey, 400);
  let volume = 0;
  for (const doc of workoutDocs as Array<{ workouts?: Array<{ history?: Array<{ targetWeight?: number; actualWeight?: number; targetReps?: number; actualReps?: number; completed?: boolean }> }> }>) {
    const workouts = Array.isArray(doc.workouts) ? doc.workouts : [];
    for (const w of workouts) {
      const hist = Array.isArray(w.history) ? w.history : [];
      for (const h of hist) {
        const weight = typeof h.actualWeight === "number" ? h.actualWeight : (typeof h.targetWeight === "number" ? h.targetWeight : 0);
        const reps = typeof h.actualReps === "number" ? h.actualReps : (typeof h.targetReps === "number" ? h.targetReps : 0);
        if (h?.completed) volume += weight * reps;
      }
    }
  }

  // 2. Spending
  const journalDocs = await JournalRepository.findSpendingByDateRange(session.user.id, startKey, endKey);
  let spending = 0;
  for (const doc of journalDocs as Array<{ totalSpent?: number; spending?: Array<{ price?: number }> }>) {
    const sum = doc.totalSpent !== undefined ? doc.totalSpent : (doc.spending || []).reduce((s, e) => s + (e?.price || 0), 0);
    spending += sum;
  }

  // 3. Completed tasks
  const taskDocs = await JournalRepository.findTasksByDateRange(session.user.id, startKey, endKey);
  let completed = 0;
  if (Array.isArray(taskDocs)) {
    for (const doc of taskDocs as Array<{ tasks?: Array<{ title?: string; duration?: string; done?: boolean }> }>) {
      const tasks = Array.isArray(doc.tasks) ? doc.tasks : [];
      for (const t of tasks) {
        if (t.done) completed++;
      }
    }
  }

  return { volume: Math.round(volume), spending: Math.round(spending), completed };
}

export async function getTaskBreakdown(timeframe: Timeframe) {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-activity");

  const end = new Date();
  let start: Date;
  if (timeframe === "7d") start = addDays(end, -6);
  else if (timeframe === "30d") start = addDays(end, -29);
  else if (timeframe === "1y") {
    start = new Date(end.getFullYear(), 0, 1);
  } else {
    start = new Date(2020, 0, 1);
  }

  const startKey = formatDateKey(start);
  const endKey = formatDateKey(end);

  const taskDocs = await JournalRepository.findTasksByDateRange(session.user.id, startKey, endKey);
  const currentTasksRaw = await DailyTaskService.getTasks(session.user.id);
  const currentTasks = Array.isArray(currentTasksRaw) ? currentTasksRaw : [];

  const todayKey = formatDateKey(new Date());
  const coveredDates = new Set<string>();
  const stats = new Map<string, { completed: number; missed: number; duration: string }>();

  const recordTask = (title: string, done: boolean, duration: string = "") => {
    if (!title) return;
    if (!stats.has(title)) stats.set(title, { completed: 0, missed: 0, duration: duration || "" });
    const stat = stats.get(title)!;
    if (done) stat.completed++;
    else stat.missed++;
    if (duration && !stat.duration) stat.duration = duration;
  };

  if (Array.isArray(taskDocs)) {
    for (const doc of taskDocs as Array<{ date: string; tasks?: Array<{ title?: string; duration?: string; done?: boolean }> }>) {
      if (doc.date === todayKey) continue;
      coveredDates.add(doc.date);
      const tasks = Array.isArray(doc.tasks) ? doc.tasks : [];
      for (const t of tasks) {
        if (t.title) recordTask(t.title, Boolean(t.done), t.duration);
      }
    }
  }

  if (todayKey >= startKey && todayKey <= endKey) {
    for (const t of currentTasks) {
      if (t.title) recordTask(t.title, Boolean(t.isCompleted), t.duration);
    }
    coveredDates.add(todayKey);
  }

  for (const t of currentTasks) {
    const key = t.lastCompletedDateKey;
    if (key && key >= startKey && key <= endKey && !coveredDates.has(key)) {
      if (t.title) recordTask(t.title, true, t.duration);
    }
  }

  const result: Array<{ title: string; completed: number; missed: number; total: number; duration: string }> = [];
  for (const [title, data] of stats.entries()) {
    result.push({
      title,
      completed: data.completed,
      missed: data.missed,
      total: data.completed + data.missed,
      duration: data.duration,
    });
  }

  return result.sort((a, b) => b.completed - a.completed || b.total - a.total);
}

