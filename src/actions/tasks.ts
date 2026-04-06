'use server';

import { auth } from '@/auth';
import { DailyTaskService } from '@/services/task.service';
import { revalidatePath } from 'next/cache';
import { dateParamSchema } from '@/schemas/journal';
import { taskCreateSchema, taskUpdateSchema } from '@/schemas/tasks';
import { rateLimit } from '@/lib/rate-limit';
import { requirePermission } from '@/permissions';

export async function getTasks() {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-activity");
  return await DailyTaskService.getTasks(session.user.id);
}

export async function getTaskStreak() {
  const session = await auth();
  if (!session?.user?.id) return 0;
  requirePermission(session.user, "view:own-activity");
  return await DailyTaskService.getCompletionStreak(session.user.id);
}

export async function getCompletedTasksByDate(date: string) {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-activity");
  const parsed = dateParamSchema.safeParse(date);
  if (!parsed.success) return [];
  return await DailyTaskService.getCompletedTasksByDate(session.user.id, parsed.data);
}

export async function getIncompleteTasksByDate(date: string) {
  const session = await auth();
  if (!session?.user?.id) return [];
  requirePermission(session.user, "view:own-activity");
  const parsed = dateParamSchema.safeParse(date);
  if (!parsed.success) return [];
  return await DailyTaskService.getIncompleteTasksByDate(session.user.id, parsed.data);
}

export async function createTask(title: string, duration: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  requirePermission(session.user, "update:own-activity");
  
  const allowed = await rateLimit(`tasks:create:${session.user.id}`, 20);
  if (!allowed) return { error: 'Too many requests' };
  
  const parsed = taskCreateSchema.safeParse({ title, duration });
  if (!parsed.success) {
    return { error: 'Invalid task data', details: parsed.error.flatten() };
  }

  try {
    const task = await DailyTaskService.createTask(session.user.id, parsed.data);
    revalidatePath('/user/today');
    return { success: true, task };
  } catch {
    return { error: 'Failed to create task' };
  }
}

export async function updateTask(taskId: string, data: { title?: string; duration?: string; isCompleted?: boolean; completedDateKey?: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  requirePermission(session.user, "update:own-activity");
  
  const allowed = await rateLimit(`tasks:update:${session.user.id}`, 50);
  if (!allowed) return { error: 'Too many requests' };

  const parsed = taskUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid task update', details: parsed.error.flatten() };
  }

  try {
    await DailyTaskService.updateTask(session.user.id, taskId, parsed.data);
    revalidatePath('/user/today');
    return { success: true };
  } catch {
    return { error: 'Failed to update task' };
  }
}

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  requirePermission(session.user, "update:own-activity");
  
  const allowed = await rateLimit(`tasks:delete:${session.user.id}`, 20);
  if (!allowed) return { error: 'Too many requests' };

  try {
    await DailyTaskService.deleteTask(session.user.id, taskId);
    revalidatePath('/user/today');
    return { success: true };
  } catch {
    return { error: 'Failed to delete task' };
  }
}
