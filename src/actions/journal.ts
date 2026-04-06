"use server";

import { auth } from "@/auth";
import { JournalService } from "@/services/journal.service";
import { requirePermission } from "@/permissions";
import { journalUpdateSchema, dateParamSchema } from "@/schemas/journal";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { AuditService } from "@/services/audit.service";
import { after } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function getJournalStats() {
  const session = await auth();
  if (!session?.user?.id) return { totalEntries: 0, streak: 0, totalJournalEntries: 0 };
  requirePermission(session.user, "view:own-journal");
  return await JournalService.getStats(session.user.id);
}

export async function getTotalSpent() {
  const session = await auth();
  if (!session?.user?.id)
    return { week: 0, month: 0, year: 0, currency: "USD" };
  requirePermission(session.user, "view:own-journal");
  return await JournalService.getTotalSpent(session.user.id);
}

export async function getJournal(date: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  requirePermission(session.user, "view:own-journal");

  const parsed = dateParamSchema.safeParse(date);
  if (!parsed.success) return null;

  return await JournalService.getJournalEntry(session.user.id, parsed.data);
}

export async function getJournalCore(date: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  requirePermission(session.user, "view:own-journal");

  const parsed = dateParamSchema.safeParse(date);
  if (!parsed.success) return null;

  const entry = await JournalService.getJournalEntry(session.user.id, parsed.data);
  if (!entry) return null;
  // Return only shallow, safe fields for server-rendering
  return {
    notes: (entry as { notes?: string }).notes ?? "",
    mainTask: (entry as { mainTask?: string }).mainTask ?? "",
    currency:
      (entry as { currency?: string }).currency?.trim() ||
      "USD",
    date: (entry as { date?: string }).date ?? parsed.data,
  };
}

export async function updateJournal(date: string, data: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`journal:update:${session.user.id}`, 50);
  if (!allowed) return { error: "Too many requests" };

  const dateParsed = dateParamSchema.safeParse(date);
  if (!dateParsed.success) return { error: "Invalid date" };

  const parsed = journalUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid journal data", details: parsed.error.flatten() };
  }

  try {
    await JournalService.updateJournalEntry(session.user.id, dateParsed.data, parsed.data);
    after(async () => {
      await AuditService.log("JOURNAL_UPDATED", session.user.id, "Journal", { date: dateParsed.data });
    });
    revalidatePath("/user/journal");
    revalidatePath("/user/today");
    return { success: true };
  } catch (err) {
    logger.error("updateJournal error", err as unknown);
    return { error: "Failed to save journal" };
  }
}

/** Update only food photos and currency (same approach as images; ensures they persist even with large main payload). */
export async function updateJournalFoodImagesAndCurrency(
  date: string,
  payload: { foodImages: string[]; currency: string }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`journal:updateFood:${session.user.id}`, 50);
  if (!allowed) return { error: "Too many requests" };

  const dateParsed = dateParamSchema.safeParse(date);
  if (!dateParsed.success) return { error: "Invalid date" };

  const foodImages = Array.isArray(payload.foodImages) ? payload.foodImages : [];
  const currency = typeof payload.currency === "string" ? payload.currency : "USD";

  try {
    await JournalService.updateFoodImagesAndCurrency(
      session.user.id,
      dateParsed.data,
      foodImages,
      currency
    );
    revalidatePath("/user/journal");
    revalidatePath("/user/today");
    return { success: true };
  } catch (err) {
    logger.error("updateJournalFoodImagesAndCurrency error", err as unknown);
    return { error: "Failed to save food photos and currency" };
  }
}

export async function toggleJournalBookmark(date: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-journal");

  const allowed = await rateLimit(`journal:bookmark:${session.user.id}`, 50);
  if (!allowed) return { error: "Too many requests" };

  const dateParsed = dateParamSchema.safeParse(date);
  if (!dateParsed.success) return { error: "Invalid date" };

  try {
    const result = await JournalService.toggleBookmark(session.user.id, dateParsed.data);
    revalidatePath("/user/journal");
    return { success: true, bookmarked: result };
  } catch (err) {
    logger.error("toggleJournalBookmark error", err as unknown);
    return { error: "Failed to toggle bookmark", details: (err as Error).message };
  }
}

export async function getJournalHistory() {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-journal");
  
  const history = await JournalService.getHistory(session.user.id);
  
  // Serialize plain objects for Client Components
  return JSON.parse(JSON.stringify(history));
}
