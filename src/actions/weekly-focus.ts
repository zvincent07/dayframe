'use server';

import { auth } from '@/auth';
import { WeeklyFocusService } from '@/services/weekly-focus.service';
import { revalidatePath } from 'next/cache';
import { logger } from "@/lib/logger";

export async function updateWeeklyFocus(tasks: Record<string, string>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const updated = await WeeklyFocusService.updateWeeklyFocus(session.user.id, tasks);
    revalidatePath('/user/today');
    return { success: updated };
  } catch (error) {
    logger.error('Failed to update weekly focus', error as unknown);
    return { error: 'Failed to update tasks' };
  }
}

export async function getWeeklyFocus() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return await WeeklyFocusService.getWeeklyFocus(session.user.id);
}
