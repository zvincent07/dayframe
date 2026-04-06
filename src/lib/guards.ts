import { auth } from "@/auth";
import { hasPermission as coreHasPermission, requirePermission as coreRequirePermission, isOwnerOrAdmin } from "@/permissions";
import type { Permission } from "@/permissions/roles";

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Checks if the current user has the specified permission.
 * Returns false if not authenticated or permission is missing.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await auth();
  return coreHasPermission(session?.user ?? null, permission);
}

/**
 * Enforces that the current user has the specified permission.
 * Throws AuthenticationError if not logged in.
 * Throws AuthorizationError if permission is missing.
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new AuthenticationError();
  }

  coreRequirePermission(session.user, permission);
}

/**
 * Enforces that the current user owns the resource.
 * Throws AuthenticationError if not logged in.
 * Throws AuthorizationError if user is not the owner.
 */
export async function requireOwnership(resourceUserId: string | { toString(): string }): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const resourceOwnerId = typeof resourceUserId === 'string' ? resourceUserId : resourceUserId.toString();
  if (!isOwnerOrAdmin(session.user, resourceOwnerId)) {
    throw new AuthorizationError("You do not own this resource");
  }
}
