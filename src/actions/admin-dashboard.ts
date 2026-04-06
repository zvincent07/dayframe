"use server";

import os from "os";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import connectDB from "@/lib/mongodb";
import { hasPermission } from "@/permissions";
import { auth } from "@/auth";

export async function getAdminDashboardStats() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, "view:settings")) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const totalUsers = await User.countDocuments();
  
  // Recent Activity
  const rawLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(6).lean();
  const recentLogs = rawLogs.map(log => ({
    title: log.action,
    desc: log.actorEmail,
    time: log.createdAt.toISOString()
  }));

  // System Health
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  
  const cpus = os.cpus();
  const loadAvg = os.loadavg(); 
  const cpuPercent = Math.round((loadAvg[0] / cpus.length) * 100);
  
  const uptimeDays = Math.round(os.uptime() / 86400);

  return {
    kpis: {
      totalUsers,
      activeSubscriptions: 0,
    },
    activity: recentLogs.length > 0 ? recentLogs : [], // We'll fallback in frontend if empty
    health: {
      cpu: cpuPercent,
      memory: usedMemPercent,
      storage: 45, // mock for now
      uptime: uptimeDays
    }
  };
}

export async function toggleMaintenance() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, "manage:maintenance-mode")) {
    return { error: "Unauthorized" };
  }
  
  await connectDB();
  const { SettingsService } = await import("@/services/settings.service");
  const current = await SettingsService.getMaintenanceMode();
  await SettingsService.setMaintenanceMode(!current);
  
  await AuditLog.create({
    actorId: session.user.id || "unknown",
    actorEmail: session.user.email || "system",
    action: current ? "DISABLED_MAINTENANCE_MODE" : "ENABLED_MAINTENANCE_MODE",
    targetType: "System",
  });
  
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/", "layout");
  
  return { success: true, enabled: !current };
}

export async function exportDailyReport() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, "view:settings")) {
    return { error: "Unauthorized" };
  }
  
  await connectDB();
  const stats = await getAdminDashboardStats();
  
  await AuditLog.create({
    actorId: session.user.id || "unknown",
    actorEmail: session.user.email || "system",
    action: "EXPORT_DAILY_REPORT",
    targetType: "System",
  });
  
  const report = {
    date: new Date().toISOString(),
    stats,
    generatedBy: session.user.email
  };
  
  return { success: true, data: JSON.stringify(report, null, 2) };
}
