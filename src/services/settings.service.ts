import { ISystemSetting } from "@/models/SystemSetting";
import { SettingsRepository } from "@/repositories/settings.repository";
import { AuditService } from "@/services/audit.service";
import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import {
  SystemConfig,
  DEFAULT_CONFIG,
  SETTINGS_KEYS,
} from "@/types/settings";
import { cache } from "react";

/** Per-request dedupe; avoid `unstable_cache` here (Next can persist empty cache bodies → JSON.parse throws). */
async function loadSystemConfig(): Promise<SystemConfig> {
  const settings = await SettingsRepository.getAll();

  const logoUrl = settings[SETTINGS_KEYS.LOGO_URL] as string;

  return {
    appName: (settings[SETTINGS_KEYS.APP_NAME] as string) ?? DEFAULT_CONFIG.appName,
    supportEmail: (settings[SETTINGS_KEYS.SUPPORT_EMAIL] as string) ?? DEFAULT_CONFIG.supportEmail,
    maintenanceMode: (settings[SETTINGS_KEYS.MAINTENANCE_MODE] as boolean) ?? DEFAULT_CONFIG.maintenanceMode,
    maintenanceMessage: (settings[SETTINGS_KEYS.MAINTENANCE_MESSAGE] as string) ?? DEFAULT_CONFIG.maintenanceMessage,
    allowPublicRegistration: (settings[SETTINGS_KEYS.ALLOW_PUBLIC_REGISTRATION] as boolean) ?? DEFAULT_CONFIG.allowPublicRegistration,
    emailVerificationRequired: (settings[SETTINGS_KEYS.EMAIL_VERIFICATION_REQUIRED] as boolean) ?? DEFAULT_CONFIG.emailVerificationRequired,
    systemTimezone: (settings[SETTINGS_KEYS.SYSTEM_TIMEZONE] as string) ?? DEFAULT_CONFIG.systemTimezone,
    dateFormat: (settings[SETTINGS_KEYS.DATE_FORMAT] as string) ?? DEFAULT_CONFIG.dateFormat,
    appDescription: (settings[SETTINGS_KEYS.APP_DESCRIPTION] as string) ?? DEFAULT_CONFIG.appDescription,
    logoUrl: logoUrl || undefined,
  };
}

export class SettingsService {
  static getSystemConfig = cache(loadSystemConfig);

  static async updateSystemConfig(config: Partial<SystemConfig>): Promise<void> {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    requirePermission(session.user, "update:settings");

    const currentConfig = await this.getSystemConfig();
    const updates: Promise<ISystemSetting>[] = [];
    const auditDetails: Record<string, { old: unknown; new: unknown }> = {};

    // Helper to check change and queue update
    const updateIfChanged = (key: string, newValue: unknown, oldValue: unknown, description: string) => {
      // Logging removed
      if (newValue !== undefined && newValue !== oldValue) {
        // Logging removed
        updates.push(SettingsRepository.set(key, newValue, session.user.email!, description));
        auditDetails[key] = { old: oldValue, new: newValue };
      }
    };

    updateIfChanged(SETTINGS_KEYS.APP_NAME, config.appName, currentConfig.appName, "Application Name");
    
    updateIfChanged(SETTINGS_KEYS.APP_DESCRIPTION, config.appDescription, currentConfig.appDescription, "Application Description");
    
    updateIfChanged(SETTINGS_KEYS.SUPPORT_EMAIL, config.supportEmail, currentConfig.supportEmail, "Support Email");
    updateIfChanged(SETTINGS_KEYS.MAINTENANCE_MODE, config.maintenanceMode, currentConfig.maintenanceMode, "Maintenance Mode");
    updateIfChanged(SETTINGS_KEYS.MAINTENANCE_MESSAGE, config.maintenanceMessage, currentConfig.maintenanceMessage, "Maintenance Message");
    updateIfChanged(SETTINGS_KEYS.ALLOW_PUBLIC_REGISTRATION, config.allowPublicRegistration, currentConfig.allowPublicRegistration, "Allow Public Registration");
    updateIfChanged(SETTINGS_KEYS.EMAIL_VERIFICATION_REQUIRED, config.emailVerificationRequired, currentConfig.emailVerificationRequired, "Email Verification Required");
    updateIfChanged(SETTINGS_KEYS.SYSTEM_TIMEZONE, config.systemTimezone, currentConfig.systemTimezone, "System Timezone");
    updateIfChanged(SETTINGS_KEYS.DATE_FORMAT, config.dateFormat, currentConfig.dateFormat, "Date Format");
    
    updateIfChanged(SETTINGS_KEYS.LOGO_URL, config.logoUrl, currentConfig.logoUrl, "Logo URL");

    if (updates.length > 0) {
      await Promise.all(updates);
      await AuditService.log("SYSTEM_SETTINGS_UPDATE", session.user.id!, "SystemSetting", auditDetails);
    }
  }

  // Legacy method support (can be deprecated or kept as a wrapper)
  static async getMaintenanceMode(): Promise<boolean> {
    const config = await this.getSystemConfig();
    return config.maintenanceMode;
  }

  static async setMaintenanceMode(enabled: boolean): Promise<void> {
    await this.updateSystemConfig({ maintenanceMode: enabled });
  }

  static async getAuditLogs(page: number = 1, limit: number = 20, filter: { actor?: string; action?: string; startDate?: Date; endDate?: Date } = {}) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    requirePermission(session.user, "view:audit-logs");
    return await AuditService.getLogs(page, limit, filter);
  }

  static async exportAuditLogs(filter: { actor?: string; action?: string; startDate?: Date; endDate?: Date } = {}) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    requirePermission(session.user, "view:audit-logs");
    return await AuditService.getAllLogs(filter);
  }

  static async clearCache(): Promise<void> {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    requirePermission(session.user, "update:settings");
    // TODO: Implement actual cache clearing logic (e.g., Redis flush)
    // For now, we'll just log it.
    await AuditService.log("CACHE_CLEARED", session.user.id!, "System", {});
  }

  static async resetDatabase(): Promise<void> {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    requirePermission(session.user, "update:settings"); // Could be a more specific permission like 'system:reset'
    
    // Safety check: Only allow in development
    if (process.env.NODE_ENV === "production") {
      throw new Error("Database reset is not allowed in production");
    }

    const { connection } = await import("mongoose");
    if (!connection.db) {
      throw new Error("Database connection not established");
    }

    // Drop all collections
    const collections = await connection.db.listCollections().toArray();
    for (const collection of collections) {
      await connection.db.dropCollection(collection.name);
    }
    
    try {
      // Re-create the current admin user so they aren't locked out immediately
      const { UserRepository } = await import("@/repositories/user.repository");
      const bcrypt = (await import("bcryptjs")).default;
      
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const email = session.user.email || "admin@example.com";
      const name = session.user.name || "Admin User";
      const username = (session.user as { username?: string }).username || "admin";
      const image = session.user.image || "";

      await UserRepository.create({
        email,
        name,
        username,
        role: "admin",
        password: hashedPassword,
        emailVerified: new Date(),
        avatarUrl: image,
      });

      // Log the reset
      await AuditService.log("DATABASE_RESET", session.user.id!, "System", {
        note: "Database reset triggered by admin. Default admin account recreated."
      });

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to seed database after reset:", error);
    }
  }
}
