import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserRepository } from "@/repositories/user.repository";
import { SettingsRepository } from "@/repositories/settings.repository";
import { SETTINGS_KEYS, DEFAULT_CONFIG } from "@/types/settings";
import { signUpSchema, loginSchema, SignUpInput } from "@/schemas/auth.schema";
import { IUser } from "@/models/User";
import { hasPermission } from "@/permissions";
import { EmailService } from "@/services/email.service";
import { AuditService } from "@/services/audit.service";
import { after } from "next/server";
import { logger } from "@/lib/logger";

export class AuthService {
  static async signUp(input: SignUpInput) {
    // 1. Validate Input (Rule 187)
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.flatten().fieldErrors };
    }

    // Check Public Registration Setting
    const allowPublicRegistration = (await SettingsRepository.get(SETTINGS_KEYS.ALLOW_PUBLIC_REGISTRATION) as boolean) ?? DEFAULT_CONFIG.allowPublicRegistration;
    if (!allowPublicRegistration) {
      return { error: "Public registration is currently disabled." };
    }

    const { email, username, password, name } = parsed.data;

    // 2. Business Logic: Check duplicates
    const existingEmail = await UserRepository.findByEmail(email);
    if (existingEmail) {
      return { error: "Email already exists" };
    }

    const existingUsername = await UserRepository.findByUsername(username);
    if (existingUsername) {
      return { error: "Username already exists" };
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Generate Gravatar URL (if no custom avatar provided)
    // Gravatar URL: https://www.gravatar.com/avatar/{hash}?d=mp
    // hash: MD5 hash of lowercase trimmed email
    const emailHash = crypto
      .createHash("md5")
      .update(email.toLowerCase().trim())
      .digest("hex");
    const avatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=mp`;

    // 5. Create User via Repository
    try {
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
      const emailVerificationExpires = new Date(Date.now() + 24 * 3600000); // 24 hours

      await UserRepository.create({
        email,
        password: hashedPassword,
        name,
        username,
        avatarUrl, // Auto-set avatar
        emailVerificationToken,
        emailVerificationExpires,
      });

      // Send Verification Email (only if required, or always? usually always for email hygiene)
      // The user asked "where can i verify my email", so we should send it.
      const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify-email/${emailVerificationToken}`;
      
      after(async () => {
        try {
          await EmailService.sendVerificationEmail(email, name, verificationLink);
        } catch (error) {
           logger.error("[AuthService] Failed to send verification email", error, { email });
        }
      });

      return { success: true };
    } catch (error) {
      logger.error("[AuthService] SignUp Error", error, { email });
      return { error: "Failed to create account" };
    }
  }

  static async validateCredentials(credentials: unknown): Promise<IUser | null> {
    // 1. Validate Input
    const parsed = loginSchema.safeParse(credentials);
    if (!parsed.success) return null;

    const { username, password } = parsed.data;

    // 2. Retrieve User (Support Email or Username)
    const user = await UserRepository.findByEmailOrUsernameWithPassword(username);
    if (!user || !user.password) return null;

    // 3. Verify Password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    // 4. Check Email Verification (if required; skip for users with view:settings e.g. admin)
    if (!hasPermission(user, "view:settings")) {
      const emailVerificationRequired = (await SettingsRepository.get(SETTINGS_KEYS.EMAIL_VERIFICATION_REQUIRED) as boolean) ?? DEFAULT_CONFIG.emailVerificationRequired;
      if (emailVerificationRequired && !user.emailVerified) {
        throw new Error("Email verification required");
      }
    }

    return user;
  }

  static async verifyEmail(token: string) {
    // 1. Validate Input
    if (!token) {
      return { error: "Invalid token" };
    }

    // 2. Find User by Verification Token
    const { user, error } = await UserRepository.findByVerificationToken(token);
    
    if (error || !user) {
      return { error: error || "Invalid verification token" };
    }

    // 3. Update User
    await UserRepository.verifyEmail(user._id.toString());
    
    return { success: true };
  }

  static async requestPasswordReset(email: string) {
    // 1. Validate Input
    if (!email) {
      return { error: "Email is required" };
    }

    // 2. Find User
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      // Rule 191: Identity verified before authorization.
      // Rule 207: Rate limit auth endpoints (handled in action).
      // Security: Don't reveal if user exists (Generic Message)
      return { success: true, message: "If an account exists, a reset link has been sent." };
    }

    // 3. Generate Reset Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // 4. Save Token to User (Using Repository Pattern)
    const updateResult = await UserRepository.setResetToken(email, resetToken, resetExpires);

    if (!updateResult) {
    logger.error("[AuthService] Failed to save reset token", undefined, { email });
      return { error: "Failed to generate reset token" };
    }
    
    // 5. Send Email (Async/Background)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
    
    // Use Next.js `after` to schedule the email sending after the response
    after(async () => {
      try {
        await EmailService.sendPasswordResetEmail(email, resetUrl);
        await AuditService.log(
          "PASSWORD_RESET_REQUESTED",
          user._id.toString(),
          "User",
          { email },
          { id: user._id.toString(), email }
        );
      } catch (error) {
      logger.error("[AuthService] Background Email Error: Failed to send reset email", error, { email });
      }
    });

    return { success: true, message: "If an account exists, a reset link has been sent." };
  }

  static async resetPassword(token: string, newPassword: string) {
    // 1. Validate Input
    if (!token || !newPassword) {
      return { error: "Invalid request" };
    }
    const cleanToken = token.trim();

    if (newPassword.length < 8) {
        return { error: "Password must be at least 8 characters long" };
    }

    // 2. Find User by Token and Check Expiry
    const { user, error } = await UserRepository.findByResetToken(cleanToken);
    
    if (error || !user) {
      return { error: "This reset link is invalid or has expired. Please request a new one." };
    }

    // 3. Hash New Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update User (Rule 151: All mutations must validate permissions/ownership - implicit here as token *is* the permission)
    await UserRepository.update(String(user._id), {
      password: hashedPassword,
      resetPasswordToken: null, // Clear token
      resetPasswordExpires: null, // Clear expiry
    });

    await AuditService.log(
      "PASSWORD_RESET_COMPLETED",
      user._id.toString(),
      "User",
      { method: "resetPassword" },
      { id: user._id.toString(), email: user.email }
    );

    return { success: true, message: "Password has been reset successfully" };
  }
}
