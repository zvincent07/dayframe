import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TOTP, Secret } from "otpauth";
import { UserRepository } from "@/repositories/user.repository";
import { AuditService } from "@/services/audit.service";

function createTOTP(secret: string, email: string) {
  return new TOTP({
    issuer: "Dayframe",
    label: email,
    secret: Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
}

export class SecurityService {
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = await UserRepository.findByIdWithPassword(userId);
    if (!user || !user.password) {
      return { success: false, error: "Cannot change password for OAuth-only accounts" };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await UserRepository.update(userId, { password: hashed } as Record<string, unknown>);

    await AuditService.log("PASSWORD_CHANGED", userId, "User", { method: "changePassword" });
    return { success: true };
  }

  static async generate2FASecret(userId: string): Promise<{ secret: string; otpauthUrl: string } | { error: string }> {
    const user = await UserRepository.findById(userId);
    if (!user) return { error: "User not found" };

    const secret = new Secret();
    const totp = new TOTP({
      issuer: "Dayframe",
      label: user.email,
      secret,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    await UserRepository.updateRaw(userId, {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
    });

    await AuditService.log("2FA_SETUP_STARTED", userId, "User");
    return { secret: secret.base32, otpauthUrl: totp.toString() };
  }

  static async verify2FASetup(
    userId: string,
    token: string
  ): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    const user = await UserRepository.findByIdWithPassword(userId);
    if (!user?.twoFactorSecret) {
      return { success: false, error: "2FA setup not initiated" };
    }

    const totp = createTOTP(user.twoFactorSecret, user.email);
    const delta = totp.validate({ token, window: 1 });
    if (delta === null) {
      return { success: false, error: "Invalid verification code" };
    }

    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );
    const hashedCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 8))
    );

    await UserRepository.updateRaw(userId, {
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashedCodes,
    });

    await AuditService.log("2FA_ENABLED", userId, "User");
    return { success: true, backupCodes };
  }

  static async disable2FA(
    userId: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = await UserRepository.findByIdWithPassword(userId);
    if (!user) return { success: false, error: "User not found" };

    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return { success: false, error: "Incorrect password" };
    }

    await UserRepository.updateRaw(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    });

    await AuditService.log("2FA_DISABLED", userId, "User");
    return { success: true };
  }

  static async validate2FAToken(userId: string, token: string): Promise<boolean> {
    const user = await UserRepository.findByIdWithPassword(userId);
    if (!user?.twoFactorSecret || !user.twoFactorEnabled) return false;

    const totp = createTOTP(user.twoFactorSecret, user.email);
    const delta = totp.validate({ token, window: 1 });
    if (delta !== null) return true;

    // Try backup codes
    if (user.twoFactorBackupCodes?.length) {
      for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
        const isMatch = await bcrypt.compare(token.toUpperCase(), user.twoFactorBackupCodes[i]);
        if (isMatch) {
          const remaining = [...user.twoFactorBackupCodes];
          remaining.splice(i, 1);
          await UserRepository.updateRaw(userId, { twoFactorBackupCodes: remaining });
          await AuditService.log("2FA_BACKUP_CODE_USED", userId, "User");
          return true;
        }
      }
    }

    return false;
  }

  static async get2FAStatus(userId: string): Promise<{ enabled: boolean; hasPassword: boolean }> {
    const user = await UserRepository.findByIdWithPassword(userId);
    return {
      enabled: user?.twoFactorEnabled ?? false,
      hasPassword: !!user?.password,
    };
  }
}
