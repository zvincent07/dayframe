// Central Permission Map (Rule 87)
export const ROLES = {
  admin: [
    // Content / Journal
    "create:journal",
    "delete:journal",
    "view:all-journals",
    "update:own-journal",
    "view:own-journal",
    "view:own-bookmarks",
    "update:own-bookmarks",
    "view:own-browser-tabs",
    "update:own-browser-tabs",
    "view:own-activity",
    "update:own-activity",
    "update:own-security",
    
    // User Management
    "view:users",
    "create:user",
    "update:user-role",
    "update:user-status", // ban/unban, verify
    "delete:user",
    
    // System Settings
    "view:settings",
    "update:settings",
    "view:audit-logs",
    "manage:maintenance-mode",
  ],
  mentor: [
    "view:assigned-journal",
    "comment:journal",
    "create:journal",
    "update:own-journal",
    "view:own-journal",
    "view:own-bookmarks",
    "update:own-bookmarks",
    "view:own-browser-tabs",
    "update:own-browser-tabs",
    "view:own-activity",
    "update:own-activity",
    "update:own-security",
  ],
  user: [
    "create:journal",
    "update:own-journal",
    "view:own-journal",
    "view:own-bookmarks",
    "update:own-bookmarks",
    "view:own-browser-tabs",
    "update:own-browser-tabs",
    "view:own-activity",
    "update:own-activity",
    "update:own-security",
  ],
} as const;

export type Role = keyof typeof ROLES;
export type Permission = (typeof ROLES)[Role][number];

// Helper to check if a role has a permission
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLES[role] as readonly string[];
  return permissions.includes(permission);
}
