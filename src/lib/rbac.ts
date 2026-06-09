import type { UserRole } from "@/types";

type Permission =
  | "dashboard:view"
  | "licenses:view"   | "licenses:create"  | "licenses:edit"  | "licenses:delete"
  | "products:view"   | "products:create"  | "products:edit"  | "products:delete"
  | "resellers:view"  | "resellers:create" | "resellers:edit" | "resellers:delete"
  | "discord:view"    | "discord:manage"
  | "telegram:view"   | "telegram:manage"
  | "automation:view" | "automation:manage"
  | "logs:view"
  | "settings:view"   | "settings:manage"
  | "users:view"      | "users:manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "dashboard:view",
    "licenses:view", "licenses:create", "licenses:edit", "licenses:delete",
    "products:view", "products:create", "products:edit", "products:delete",
    "resellers:view", "resellers:create", "resellers:edit", "resellers:delete",
    "discord:view", "discord:manage",
    "telegram:view", "telegram:manage",
    "automation:view", "automation:manage",
    "logs:view",
    "settings:view", "settings:manage",
    "users:view", "users:manage",
  ],
  admin: [
    "dashboard:view",
    "licenses:view", "licenses:create", "licenses:edit",
    "products:view",
    "resellers:view",
    "discord:view",
    "telegram:view",
    "automation:view",
    "logs:view",
    "settings:view",
    "users:view",
  ],
  reseller: [
    "dashboard:view",
    "licenses:view", "licenses:create",
    "products:view",
  ],
  support: [
    "dashboard:view",
    "licenses:view",
    "products:view",
    "logs:view",
  ],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyRole(role: UserRole, roles: UserRole[]): boolean {
  return roles.includes(role);
}

export function isOwnerOrAdmin(role: UserRole): boolean {
  return role === "owner" || role === "admin";
}
