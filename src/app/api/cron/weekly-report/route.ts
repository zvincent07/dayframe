import { NextResponse } from "next/server";
import { AIInsightRepository } from "@/repositories/ai-insight.repository";
import { UserRepository } from "@/repositories/user.repository";
import { JournalRepository } from "@/repositories/journal.repository";
import { DailyTaskService } from "@/services/task.service";
import { estimateNutrition } from "@/lib/nutrition";
import { formatCurrency } from "@/lib/journal-utils";
import type { IUser } from "@/models/User";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const secret = process.env.CRON_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "Cron disabled: missing CRON_SECRET" }, { status: 401 });
  }
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const end = new Date();
  while (end.getDay() !== 0) end.setDate(end.getDate() + 1);
  end.setHours(23, 59, 0, 0);
  const start = addDays(end, -6);
  const startKey = fmt(start);
  const endKey = fmt(end);

  let page = 1;
  const pageSize = 100;
  let processed = 0;
  for (;;) {
    const { users, pages } = await UserRepository.findAll(page, pageSize, {});
    for (const u of users as IUser[]) {
      const userId = String(u._id);
      const currencyPref = u.preferredCurrency || "USD";
      const units = (u as IUser).preferredUnits || "metric";
      const foods = await JournalRepository.findFoodByDateRange(userId, startKey, endKey);
      const nutrition = { protein: 0, calories: 0, carbs: 0, fats: 0 };
      for (const f of foods as Array<{ food?: { morning?: string; lunch?: string; noon?: string; dinner?: string } }>) {
        const fd = f.food || {};
        const blocks = [fd.morning || "", fd.lunch || "", fd.noon || "", fd.dinner || ""];
        for (const b of blocks) {
          const n = estimateNutrition(b);
          nutrition.protein += n.protein;
          nutrition.calories += n.calories;
          nutrition.carbs += n.carbs;
          nutrition.fats += n.fats;
        }
      }
      const spendDocs = await JournalRepository.findSpendingByDateRange(userId, startKey, endKey);
      let spendTotal = 0;
      for (const d of spendDocs as Array<{ spending?: Array<{ price?: number }> }>) {
        const s = (d.spending || []).reduce((sum, e) => sum + (e?.price || 0), 0);
        spendTotal += s;
      }
      const taskSummary = await DailyTaskService.getAllCompletionSummary(userId);
      const text =
        `Weekly Summary (${startKey} – ${endKey})\n` +
        `Tasks: Completed ${taskSummary.completed}, Not Completed ${taskSummary.missed}.\n` +
        `Spending: ${formatCurrency(spendTotal, currencyPref)}.\n` +
        `Nutrition (${units}): Protein ${Math.round(nutrition.protein)}g, Carbs ${Math.round(nutrition.carbs)}g, Fats ${Math.round(nutrition.fats)}g, Calories ${Math.round(nutrition.calories)}.`;
      await AIInsightRepository.create(userId, {
        timeframe: "7d",
        startDate: startKey,
        endDate: endKey,
        currency: currencyPref,
        insight: text,
      });
      processed++;
    }
    if (page >= pages) break;
    page++;
  }
  return NextResponse.json({ success: true, processed });
}
