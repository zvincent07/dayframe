import { AuditLogRepository, AuditLogFilter } from "@/repositories/audit-log.repository";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

export class AuditService {
  static async log(action: string, targetId?: string, targetType?: string, details?: Record<string, unknown>, actorOverride?: { id: string; email: string }) {
    const session = await auth();
    const actorId = actorOverride?.id || session?.user?.id || "system";
    const actorEmail = actorOverride?.email || session?.user?.email || "system";
    
    let ipAddress = "unknown";
    let userAgent = "unknown";

    try {
      const headersList = await headers();
      const forwardedFor = headersList.get("x-forwarded-for");
      ipAddress = forwardedFor ? forwardedFor.split(",")[0] : headersList.get("x-real-ip") || "unknown";
      userAgent = headersList.get("user-agent") || "unknown";
    } catch (e) {
      logger.warn("Could not retrieve headers for audit log", { error: e as unknown });
    }

    // Add user agent to details if not present
    const logDetails: Record<string, unknown> = {
      ...details,
      userAgent: details?.userAgent || userAgent,
    };

    await AuditLogRepository.create({
      actorId,
      actorEmail,
      action,
      targetId,
      targetType,
      details: logDetails,
      ipAddress: ipAddress || "unknown", // Ensure ipAddress is never undefined/null
      createdAt: new Date(),
    });
  }

  static async getLogs(page: number, limit: number, filter: AuditLogFilter) {
    return await AuditLogRepository.find(page, limit, filter);
  }

  static async getAllLogs(filter: AuditLogFilter) {
    return await AuditLogRepository.findAll(filter);
  }
}
