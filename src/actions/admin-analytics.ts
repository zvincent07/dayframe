"use server";

import { UserActivity } from "@/models/UserActivity";
import { Journal } from "@/models/Journal";
import connectDB from "@/lib/mongodb";
import { format, subDays, startOfDay } from "date-fns";
import { auth } from "@/auth";
import { hasPermission } from "@/permissions";

export async function getAnalyticsGrowth() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, "view:settings")) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const daysToFetch = 14;
  const today = startOfDay(new Date());
  
  // Create an array of the last 14 days formatted as YYYY-MM-DD
  const dateStrings = Array.from({ length: daysToFetch }, (_, i) => {
    return format(subDays(today, daysToFetch - 1 - i), "yyyy-MM-dd");
  });

  const startDate = dateStrings[0];
  const endDate = dateStrings[dateStrings.length - 1];

  // Fetch unique DAU per day
  const dauAgg = await UserActivity.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: "$date", count: { $sum: 1 } } }
  ]);

  // Fetch unique Journals per day
  const journalAgg = await Journal.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: "$date", count: { $sum: 1 } } }
  ]);

  const dauMap = new Map(dauAgg.map(d => [d._id, d.count]));
  const journalMap = new Map(journalAgg.map(d => [d._id, d.count]));

  const series = dateStrings.map(date => {
    const activeUsers = dauMap.get(date) || 0;
    const journals = journalMap.get(date) || 0;
    
    // Conversion rate: (journals / activeUsers) * 100
    // Prevent division by zero
    const conversion = activeUsers > 0 ? Math.round((journals / activeUsers) * 100) : 0;
    
    return {
      date,
      displayDate: format(new Date(date), "MMM dd"),
      activeUsers,
      journals,
      conversion
    };
  });

  return series;
}
