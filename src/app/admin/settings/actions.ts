"use server";

import { SettingsService } from "@/services/settings.service";
import { SystemConfig } from "@/types/settings";
import { systemConfigSchema } from "@/schemas/settings";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { logger } from "@/lib/logger";

export async function getMaintenanceMode() {
  const session = await auth();
  requirePermission(session?.user, "view:settings");
  return await SettingsService.getMaintenanceMode();
}

export async function setMaintenanceMode(enabled: boolean) {
  const session = await auth();
  requirePermission(session?.user, "manage:maintenance-mode");

  try {
    await SettingsService.setMaintenanceMode(enabled);
    revalidatePath("/admin/settings");
    revalidatePath("/", "layout"); // Revalidate entire site as maintenance affects everything
    return { success: true };
  } catch (error) {
    logger.error("Failed to set maintenance mode", error as unknown);
    return { success: false, error: "Failed to update maintenance mode" };
  }
}

export async function getAuditLogs(
  page: number = 1, 
  limit: number = 20, 
  filter: { actor?: string; action?: string; startDate?: Date; endDate?: Date } = {}
) {
  const session = await auth();
  requirePermission(session?.user, "view:audit-logs");

  try {
    const result = await SettingsService.getAuditLogs(page, limit, filter);
    
    const logs = result.logs.map((log) => ({
      ...log,
      _id: log._id.toString(),
      createdAt: log.createdAt,
      details: log.details || {},
    }));

    return {
      success: true,
      logs,
      total: result.total,
      pages: result.pages,
    };
  } catch (error) {
    logger.error("Failed to fetch audit logs", error as unknown);
    return { success: false, error: "Failed to fetch audit logs", logs: [], total: 0, pages: 0 };
  }
}

export async function exportAuditLogs(filter: { actor?: string; action?: string; startDate?: Date; endDate?: Date } = {}) {
  const session = await auth();
  requirePermission(session?.user, "view:audit-logs");

  try {
    const logs = await SettingsService.exportAuditLogs(filter);
    
    // Convert to CSV
    const header = ["Date", "Actor ID", "Actor Email", "Action", "Target Type", "Target ID", "IP Address", "User Agent", "Details"];
    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.actorId,
      log.actorEmail,
      log.action,
      log.targetType || "",
      log.targetId || "",
      log.ipAddress || "",
      log.details?.userAgent || "",
      JSON.stringify(log.details || "").replace(/"/g, '""') // Escape quotes
    ]);

    const csvContent = [
      header.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    return { success: true, csv: csvContent };
  } catch (error) {
    logger.error("Failed to export audit logs", error as unknown);
    return { success: false, error: "Failed to export audit logs" };
  }
}

export async function getSystemConfig() {
  const session = await auth();
  requirePermission(session?.user, "view:settings");
  return await SettingsService.getSystemConfig();
}

export async function updateSystemConfig(config: Partial<SystemConfig>) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");

  // Validate input using Zod (partial because we might update only a subset of settings)
  const validation = systemConfigSchema.partial().safeParse(config);

  if (!validation.success) {
    // Access the first error message safely
    const errorMessage = validation.error.issues[0]?.message || "Invalid configuration";
    return { success: false, error: "Invalid configuration data: " + errorMessage };
  }

  const validatedConfig = validation.data;

  try {
    // Cast validatedConfig back to Partial<SystemConfig> as Zod partial returns optional fields which matches
    await SettingsService.updateSystemConfig(validatedConfig as Partial<SystemConfig>);
    revalidatePath("/admin/settings");
    revalidatePath("/login"); // Explicitly revalidate login page
    revalidatePath("/", "layout"); // Revalidate everything
    return { success: true };
  } catch (error) {
    logger.error("Failed to update system settings", error as unknown);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function clearCache() {
  const session = await auth();
  requirePermission(session?.user, "update:settings");
  try {
    await SettingsService.clearCache();
    // Revalidate the entire application cache
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logger.error("Failed to clear cache", error as unknown);
    return { success: false, error: "Failed to clear cache" };
  }
}

export async function resetDatabase() {
  const session = await auth();
  requirePermission(session?.user, "update:settings");
  try {
    await SettingsService.resetDatabase();
    return { success: true };
  } catch (error) {
    logger.error("Failed to reset database", error as unknown);
    return { success: false, error: "Failed to reset database" };
  }
}
