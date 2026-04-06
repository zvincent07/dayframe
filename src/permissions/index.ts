import { ROLES, Role, Permission } from "./roles";

// Type-safe User interface for permission checks
export interface UserWithRole {
  role: string;
  id?: string;
}

/**
 * Checks if a user has a specific permission.
 * Returns false if user is null or role is invalid.
 */
export function hasPermission(user: UserWithRole | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  
  // Provide a safe fallback for users who might not have a role set in their session
  // Defaulting to "user" role is standard for NextAuth users who just signed up
  const rawRole = user.role || "user";
  
  // Validate role exists in our map
  const role = rawRole as Role;
  if (!ROLES[role]) return false;

  const permissions = ROLES[role] as readonly string[];
  return permissions.includes(permission);
}

/**
 * Throws an error if the user does not have the required permission.
 * Use this in Server Actions and Services.
 */
export function requirePermission(user: UserWithRole | null | undefined, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new Error(`Unauthorized: Missing permission '${permission}'`);
  }
}

/**
 * Checks if a user owns a resource or has admin privileges.
 * useful for "update:own-journal" type checks where ownership is the key factor.
 */
export function isOwnerOrAdmin(user: UserWithRole | null | undefined, resourceOwnerId: string): boolean {
  if (!user || !user.id) return false;
  if (hasPermission(user, "view:all-journals")) return true;
  return user.id === resourceOwnerId;
}
