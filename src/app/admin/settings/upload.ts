"use server";

import { auth } from "@/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { SettingsService } from "@/services/settings.service";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/services/audit.service";
import { requirePermission } from "@/permissions";
import { logger } from "@/lib/logger";

export async function deleteLogoFile(url: string) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");

  if (!url || !url.startsWith("/uploads/branding/")) {
    return { success: false, error: "Invalid file path" };
  }

  const uploadDir = join(process.cwd(), "public", "uploads", "branding");
  const filename = url.split("/").pop();
  if (!filename) return { success: false, error: "Invalid filename" };

  const filepath = join(uploadDir, filename);
  try {
    await unlink(filepath);
    return { success: true };
  } catch (err) {
    logger.warn("Failed to delete logo file", { error: err as unknown });
    // Ignore if file doesn't exist, return success to proceed
    return { success: true }; 
  }
}

export async function uploadLogo(formData: FormData) {
  const session = await auth();
  requirePermission(session?.user, "update:settings");

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validation
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "File must be an image" };
  }

  if (file.size > 2 * 1024 * 1024) { // 2MB limit
    return { success: false, error: "File size must be less than 2MB" };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = file.name.split(".").pop();
    const filename = `logo-${uniqueSuffix}.${extension}`;
    
    // Ensure directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", "branding");
    await mkdir(uploadDir, { recursive: true });

    // Note: We don't delete the old logo here if skipUpdate is true, 
    // because the user hasn't committed the change yet.
    // The cleanup will happen in general-settings.tsx after successful save.

    // Save file
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Generate public URL
    const logoUrl = `/uploads/branding/${filename}`;

    // Update system config if not skipped
    const skipUpdate = formData.get("skipUpdate") === "true";
    if (!skipUpdate) {
      // Only delete old logo if we are committing the change immediately
      const currentConfig = await SettingsService.getSystemConfig();
      if (currentConfig.logoUrl && currentConfig.logoUrl.startsWith("/uploads/branding/")) {
        const oldFilename = currentConfig.logoUrl.split("/").pop();
        if (oldFilename) {
          const oldFilepath = join(uploadDir, oldFilename);
          try {
            await unlink(oldFilepath);
          } catch (err) {
            logger.warn("Failed to delete old logo", { error: err as unknown });
          }
        }
      }

      await SettingsService.updateSystemConfig({ logoUrl });
      revalidatePath("/admin/settings");
      revalidatePath("/login");
      revalidatePath("/", "layout");
    }

    await AuditService.log("LOGO_UPLOAD", session?.user?.id || "system", "System", {
      filename,
      size: file.size,
      mimeType: file.type,
      skipUpdate
    });

    return { success: true, url: logoUrl };
  } catch (error) {
    logger.error("Failed to upload logo", error as unknown);
    return { success: false, error: "Failed to upload logo" };
  }
}

export async function removeLogo() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  requirePermission(session.user, "update:settings");

  try {
    // Delete old logo if it exists
    const currentConfig = await SettingsService.getSystemConfig();
    if (currentConfig.logoUrl && currentConfig.logoUrl.startsWith("/uploads/branding/")) {
      const uploadDir = join(process.cwd(), "public", "uploads", "branding");
      const oldFilename = currentConfig.logoUrl.split("/").pop();
      if (oldFilename) {
        const oldFilepath = join(uploadDir, oldFilename);
        try {
          await unlink(oldFilepath);
        } catch (err) {
          logger.warn("Failed to delete old logo", { error: err as unknown });
        }
      }
    }

    await SettingsService.updateSystemConfig({ logoUrl: "" }); // Empty string or null to remove
    
    await AuditService.log("LOGO_REMOVE", session.user.id, "System", {
      previousUrl: currentConfig.logoUrl
    });

    revalidatePath("/admin/settings");
    revalidatePath("/login");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logger.error("Failed to remove logo", error as unknown);
    return { success: false, error: "Failed to remove logo" };
  }
}
