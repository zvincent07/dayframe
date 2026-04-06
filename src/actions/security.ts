"use server";

import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { SecurityService } from "@/services/security.service";
import { changePasswordSchema, verify2FASchema } from "@/schemas/security";
import { logger } from "@/lib/logger";

export async function changePassword(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  requirePermission(session.user, "update:own-security");

  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Invalid input" };
  }

  return SecurityService.changePassword(
    session.user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword
  );
}

export async function get2FAStatus() {
  const session = await auth();
  if (!session?.user?.id) return { enabled: false, hasPassword: false };
  return SecurityService.get2FAStatus(session.user.id);
}

export async function setup2FA() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  requirePermission(session.user, "update:own-security");

  const result = await SecurityService.generate2FASecret(session.user.id);
  if ("error" in result) return { error: result.error };

  // Generate QR code data URL server-side
  const QRCode = await import("qrcode");
  const qrDataUrl = await QRCode.toDataURL(result.otpauthUrl);

  return { secret: result.secret, qrDataUrl };
}

export async function verify2FASetup(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  requirePermission(session.user, "update:own-security");

  const parsed = verify2FASchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid code format" };

  return SecurityService.verify2FASetup(session.user.id, parsed.data.token);
}

export async function disable2FA(password: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  requirePermission(session.user, "update:own-security");

  if (!password) return { success: false, error: "Password is required" };
  return SecurityService.disable2FA(session.user.id, password);
}

export async function getMyActivity(page: number = 1) {
  const session = await auth();
  if (!session?.user?.id) return { logs: [], total: 0, pages: 0 };
  requirePermission(session.user, "view:own-activity");

  try {
    const { AuditService } = await import("@/services/audit.service");
    const result = await AuditService.getLogs(page, 20, { actorId: session.user.id });
    return {
      logs: result.logs.map((l) => ({
        id: String(l._id),
        action: l.action,
        targetType: l.targetType || null,
        details: l.details || null,
        ipAddress: l.ipAddress || null,
        createdAt: l.createdAt.toISOString(),
      })),
      total: result.total,
      pages: result.pages,
    };
  } catch (err) {
    logger.error("getMyActivity error", err as unknown);
    return { logs: [], total: 0, pages: 0 };
  }
}
