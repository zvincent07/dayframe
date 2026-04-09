"use server";

import connectDB from "@/lib/mongodb";
import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { Announcement } from "@/models/Announcement";
import { BlogPost } from "@/models/BlogPost";
import { EmailTemplate } from "@/models/EmailTemplate";
import { AuditLog } from "@/models/AuditLog";
import { revalidatePath } from "next/cache";

// --- ANNOUNCEMENTS ---
export async function getAnnouncements() {
  const session = await auth();
  requirePermission(session?.user, "view:settings");
  await connectDB();
  const items = await Announcement.find().sort({ createdAt: -1 }).lean();
  return items.map(i => ({ ...i, _id: i._id.toString() }));
}

export async function createAnnouncement(data: { title: string; message: string; type: string }) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");
  await connectDB();
  const item = await Announcement.create({ ...data, createdBy: session?.user?.id || "system" });
  await AuditLog.create({
    actorId: session?.user?.id || "unknown",
    actorEmail: session?.user?.email || "system",
    action: "CREATE_ANNOUNCEMENT",
    targetType: "Announcement",
    targetId: item._id.toString(),
  });
  revalidatePath("/admin/content");
  return { success: true, id: item._id.toString() };
}

export async function deleteAnnouncement(id: string) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");
  await connectDB();
  await Announcement.findByIdAndDelete(id);
  await AuditLog.create({
    actorId: session?.user?.id || "unknown",
    actorEmail: session?.user?.email || "system",
    action: "DELETE_ANNOUNCEMENT",
    targetType: "Announcement",
    targetId: id,
  });
  revalidatePath("/admin/content");
  return { success: true };
}

// --- BLOG POSTS ---
export async function getBlogPosts() {
  const session = await auth();
  requirePermission(session?.user, "view:settings");
  await connectDB();
  const items = await BlogPost.find().sort({ createdAt: -1 }).lean();
  return items.map(i => ({ ...i, _id: i._id.toString() }));
}

export async function createBlogPost(data: { title: string; slug: string; excerpt?: string; content: string; status: string }) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");
  await connectDB();
  const item = await BlogPost.create({ ...data, author: session?.user?.id || "system" });
  await AuditLog.create({
    actorId: session?.user?.id || "unknown",
    actorEmail: session?.user?.email || "system",
    action: "CREATE_BLOG_POST",
    targetType: "BlogPost",
    targetId: item._id.toString(),
  });
  revalidatePath("/admin/content");
  return { success: true, id: item._id.toString() };
}

export async function deleteBlogPost(id: string) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");
  await connectDB();
  await BlogPost.findByIdAndDelete(id);
  await AuditLog.create({
    actorId: session?.user?.id || "unknown",
    actorEmail: session?.user?.email || "system",
    action: "DELETE_BLOG_POST",
    targetType: "BlogPost",
    targetId: id,
  });
  revalidatePath("/admin/content");
  return { success: true };
}

// --- EMAIL TEMPLATES ---
export async function getEmailTemplates() {
  const session = await auth();
  requirePermission(session?.user, "view:settings");
  await connectDB();
  const items = await EmailTemplate.find().sort({ createdAt: -1 }).lean();
  return items.map(i => ({ ...i, _id: i._id.toString() }));
}

export async function createEmailTemplate(data: { name: string; subject: string; bodyHtml: string; description?: string }) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");
  await connectDB();
  const item = await EmailTemplate.create(data);
  await AuditLog.create({
    actorId: session?.user?.id || "unknown",
    actorEmail: session?.user?.email || "system",
    action: "CREATE_EMAIL_TEMPLATE",
    targetType: "EmailTemplate",
    targetId: item._id.toString(),
  });
  revalidatePath("/admin/content");
  return { success: true, id: item._id.toString() };
}

export async function deleteEmailTemplate(id: string) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");
  await connectDB();
  await EmailTemplate.findByIdAndDelete(id);
  await AuditLog.create({
    actorId: session?.user?.id || "unknown",
    actorEmail: session?.user?.email || "system",
    action: "DELETE_EMAIL_TEMPLATE",
    targetType: "EmailTemplate",
    targetId: id,
  });
  revalidatePath("/admin/content");
  return { success: true };
}
