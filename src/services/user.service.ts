import { UserRepository, UserFilter } from "@/repositories/user.repository";
import { Role } from "@/permissions/roles";
import { AuditService } from "@/services/audit.service";
import { EmailService } from "@/services/email.service";
import { requirePermission, UserWithRole } from "@/permissions";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { IUser } from "@/models/User";
import { logger } from "@/lib/logger";

export class UserService {
  static async findAll(
    page: number = 1,
    limit: number = 10,
    filter: UserFilter = {}
  ): Promise<{ users: IUser[]; total: number; pages: number }> {
    return UserRepository.findAll(page, limit, filter);
  }

  static async updateRole(
    userId: string, 
    role: Role, 
    adminUser: UserWithRole
  ): Promise<{ success: boolean; error?: string }> {
    requirePermission(adminUser, "update:user-role");

    // 1. Validation
    if (userId === adminUser.id) {
      return { success: false, error: "Cannot change your own role" };
    }

    // 2. Fetch User to verify existence and previous state
    const user = await UserRepository.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    const previousRole = user.role;

    // 3. Update Role
    await UserRepository.update(userId, { role });
    
    // 4. Audit Log
    await AuditService.log("USER_ROLE_UPDATE", userId, "User", {
      previousRole,
      newRole: role,
      adminId: adminUser.id
    });

    return { success: true };
  }

  static async toggleBan(
    userId: string, 
    isBanned: boolean, 
    adminUser: UserWithRole
  ): Promise<{ success: boolean; error?: string }> {
    requirePermission(adminUser, "update:user-status");

    // 1. Validation
    if (userId === adminUser.id) {
      return { success: false, error: "Cannot ban yourself" };
    }

    // 2. Update Status
    await UserRepository.update(userId, { isBanned });
    
    // 3. Audit Log
    await AuditService.log(isBanned ? "USER_BAN" : "USER_UNBAN", userId, "User", {
      isBanned,
      adminId: adminUser.id
    });

    return { success: true };
  }

  static async deleteUser(
    userId: string, 
    adminUser: UserWithRole
  ): Promise<{ success: boolean; error?: string }> {
    requirePermission(adminUser, "delete:user");

    // 1. Validation
    if (userId === adminUser.id) {
      return { success: false, error: "Cannot delete yourself" };
    }

    // 2. Fetch User for audit details
    const user = await UserRepository.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    // 3. Delete User
    await UserRepository.delete(userId);
    
    // 4. Audit Log
    await AuditService.log("USER_DELETE", userId, "User", {
      email: user.email,
      name: user.name,
      adminId: adminUser.id
    });

    return { success: true };
  }

  static async toggleVerification(
    userId: string, 
    isVerified: boolean, 
    adminUser: UserWithRole
  ): Promise<{ success: boolean; error?: string }> {
    requirePermission(adminUser, "update:user-status");

    // 1. Update Verification Status
    await UserRepository.update(userId, { 
      emailVerified: isVerified ? new Date() : null as unknown as Date
    });
    
    // 2. Audit Log
    await AuditService.log(isVerified ? "USER_VERIFY" : "USER_UNVERIFY", userId, "User", {
      isVerified,
      adminId: adminUser.id
    });

    return { success: true };
  }
  static async create(data: {
    name: string;
    email: string;
    role: Role;
    password?: string;
    emailVerified?: boolean | Date;
    auditActor?: UserWithRole; // Changed from ID to full user object for permission check
  }): Promise<{ user: IUser; tempPassword?: string }> {
    // Permission check if actor is provided (admin context)
    if (data.auditActor) {
      requirePermission(data.auditActor, "create:user");
    }

    // Check if user exists
    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password (or generate random one if not provided)
    const passwordToSet = data.password || crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(passwordToSet, 10);

    // Generate Gravatar
    const emailHash = crypto
      .createHash("md5")
      .update(data.email.toLowerCase().trim())
      .digest("hex");
    const avatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=mp`;

    // Create user
    const newUser = await UserRepository.create({
      name: data.name,
      email: data.email,
      role: data.role,
      password: hashedPassword,
      avatarUrl,
      emailVerified: data.emailVerified === true ? new Date() : (data.emailVerified instanceof Date ? data.emailVerified : undefined),
    });

    // Audit Log (if actor provided)
    if (data.auditActor) {
      await AuditService.log("USER_CREATE", data.auditActor.id!, "User", {
        userId: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      });
    }

    // Send welcome email (only if we generated a temp password or explicitly want to)
    // For admin creation, we usually want to send the temp password.
    if (!data.password) {
      // Fire-and-forget email
      EmailService.sendWelcomeEmail(data.email, data.name, passwordToSet).catch((error) => {
        logger.error("Failed to send welcome email", error as unknown);
      });
    }

    return { 
      user: newUser, 
      tempPassword: !data.password ? passwordToSet : undefined 
    };
  }
}
