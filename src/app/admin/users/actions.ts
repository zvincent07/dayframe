"use server";

import { auth } from "@/auth";
import { UserRepository, UserFilter } from "@/repositories/user.repository";
import { revalidatePath } from "next/cache";
import { Role } from "@/permissions/roles";
import { UserService } from "@/services/user.service";
import { AuditService } from "@/services/audit.service";
import { EmailService } from "@/services/email.service";
import { requirePermission } from "@/permissions";
import crypto from "crypto";
import { logger } from "@/lib/logger";

export async function createUser(data: {
  name: string;
  email: string;
  role: Role;
  password?: string;
}) {
  const session = await auth();
  requirePermission(session?.user, "create:user");

  try {
    const { user, tempPassword } = await UserService.create({
      name: data.name,
      email: data.email,
      role: data.role,
      password: data.password,
      emailVerified: new Date(), // Auto-verify admin-created users
      auditActor: session!.user,
    });

    revalidatePath("/admin/users");
    
    // Convert to plain object manually to ensure Next.js serialization
    const serializedUser = {
      ...user,
      _id: user._id.toString(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
    };
    
    return { success: true, user: serializedUser, tempPassword };
  } catch (error) {
    logger.error("Failed to create user", error as unknown);
    // Return the specific error message if it's a known error (like duplicate user)
    const errorMessage = error instanceof Error ? error.message : "Failed to create user";
    return { success: false, error: errorMessage };
  }
}


export async function getUsers(
  page: number = 1,
  limit: number = 10,
  filter: UserFilter = {}
) {
  const session = await auth();
  requirePermission(session?.user, "view:users");

  try {
    const result = await UserService.findAll(page, limit, filter);
    
    // Convert _id to string just in case
    const users = result.users.map(user => ({
      ...user,
      _id: user._id.toString(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
    }));

    return {
      users,
      total: result.total,
      pages: result.pages
    };
  } catch (error) {
    logger.error("Failed to fetch users", error as unknown);
    throw new Error("Failed to fetch users");
  }
}

export async function updateUserRole(userId: string, role: Role) {
  const session = await auth();
  requirePermission(session?.user, "update:user-role");

  try {
    const result = await UserService.updateRole(userId, role, session!.user);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update user role", error as unknown);
    return { success: false, error: "Failed to update user role" };
  }
}

export async function toggleUserBan(userId: string, isBanned: boolean) {
  const session = await auth();
  requirePermission(session?.user, "update:user-status");

  try {
    const result = await UserService.toggleBan(userId, isBanned, session!.user);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update ban status", error as unknown);
    return { success: false, error: "Failed to update ban status" };
  }
}

export async function deleteUser(userId: string) {
  const session = await auth();
  requirePermission(session?.user, "delete:user");

  try {
    const result = await UserService.deleteUser(userId, session!.user);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete user", error as unknown);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function sendPasswordResetLink(userId: string) {
  const session = await auth();
  requirePermission(session?.user, "update:user-status");

  try {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Save token to user
    await UserRepository.setResetToken(user.email, token, expires);

    // Generate link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password/${token}`;

    // Send email
    await EmailService.sendPasswordResetEmail(user.email, resetLink);
    
    await AuditService.log("PASSWORD_RESET_LINK_SENT", userId, "User", {
      email: user.email,
      adminId: session!.user.id
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to send reset link", error as unknown);
    return { success: false, error: "Failed to send reset link" };
  }
}

export async function toggleUserVerification(userId: string, isVerified: boolean) {
  const session = await auth();
  requirePermission(session?.user, "update:user-status");

  try {
    const result = await UserService.toggleVerification(userId, isVerified, session!.user);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update verification status", error as unknown);
    return { success: false, error: "Failed to update verification status" };
  }
}
