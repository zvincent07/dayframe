"use server";

import connectDB from "@/lib/mongodb";
import { Notification } from "@/models/Notification";
import { AuditLog } from "@/models/AuditLog";
import { auth } from "@/auth";
import { hasPermission } from "@/permissions";
import { revalidatePath } from "next/cache";

export async function createGlobalAlert(title: string, message: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, "view:settings")) {
    throw new Error("Unauthorized: Cannot manage announcements");
  }

  await connectDB();

  const newAlert = await Notification.create({
    title,
    message,
    type: "alert",
    isGlobal: true,
    status: "published",
  });

  await AuditLog.create({
    actorId: session.user.id || "unknown",
    actorEmail: session.user.email || "no-reply@dayframe.app",
    action: "CREATE_GLOBAL_ALERT",
    targetType: "Notification",
    targetId: newAlert._id.toString(),
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getGlobalNotifications() {
  const session = await auth();
  if (!session?.user) {
    return [];
  }

  await connectDB();

  // Fetch the latest 5 published global notifications
  const alerts = await Notification.find({ 
    isGlobal: true, 
    status: "published" 
  })
  .sort({ createdAt: -1 })
  .limit(5)
  .lean();

  return alerts.map(a => ({
    _id: a._id.toString(),
    title: a.title,
    message: a.message,
    type: a.type,
    createdAt: a.createdAt.toISOString()
  }));
}
