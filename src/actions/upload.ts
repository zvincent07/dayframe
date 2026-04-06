"use server";

import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { logger } from "@/lib/logger";
import connectDB from "@/lib/mongodb";
import { Image } from "@/models/Image";
import mongoose from "mongoose";

export async function uploadAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided" };
  if (!file.type.startsWith("image/")) return { success: false, error: "File must be an image" };
  if (file.size > 2 * 1024 * 1024) return { success: false, error: "File size must be less than 2MB" };

  try {
    await connectDB();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extension = file.name.split(".").pop() || "png";
    const filename = `avatar-${session.user.id}-${Date.now()}.${extension}`;

    await Image.create({
      userId: new mongoose.Types.ObjectId(session.user.id),
      filename,
      data: buffer,
      contentType: file.type,
      type: "avatar"
    });

    return { success: true, url: `/api/images/${filename}` };
  } catch (error) {
    logger.error("Failed to upload avatar", { error: error as unknown });
    return { success: false, error: "Failed to upload image" };
  }
}

export async function uploadJournalImage(formData: FormData) {
  const session = await auth();
  requirePermission(session?.user, "update:own-journal");

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  if (!file.type.startsWith("image/")) {
    return { success: false, error: "File must be an image" };
  }

  if (file.size > 2 * 1024 * 1024) { // 2MB limit
    return { success: false, error: "File size must be less than 2MB" };
  }

  try {
    await connectDB();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = file.name.split(".").pop() || "png";
    const filename = `journal-${uniqueSuffix}.${extension}`;
    
    await Image.create({
      userId: new mongoose.Types.ObjectId(session.user!.id),
      filename,
      data: buffer,
      contentType: file.type,
      type: "journal"
    });

    const url = `/api/images/${filename}`;

    return { success: true, url };
  } catch (error) {
    logger.error("Failed to upload journal image", { error: error as unknown });
    return { success: false, error: "Failed to upload image" };
  }
}
