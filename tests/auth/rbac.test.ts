/**
 * tests/auth/rbac.test.ts
 * Uses relative imports to avoid Next.js module resolution issues in Vitest.
 */
import { describe, it, expect } from "vitest";
import { can, isOwnerOrAdmin }  from "../../src/lib/rbac";

type UserRole = "owner" | "admin" | "reseller" | "support" | "pending";

describe("RBAC — pending role", () => {
  const pending = "pending" as UserRole;

  it("has no permissions", () => {
    const perms = [
      "dashboard:view", "licenses:view", "licenses:create",
      "products:view",  "discord:view",  "logs:view",
      "users:view",     "settings:view", "resellers:view",
    ] as const;
    perms.forEach((p) => expect(can(pending, p)).toBe(false));
  });

  it("is not owner or admin", () => {
    expect(isOwnerOrAdmin(pending)).toBe(false);
  });
});

describe("RBAC — reseller role", () => {
  it("can access dashboard, licenses, products", () => {
    expect(can("reseller", "dashboard:view")).toBe(true);
    expect(can("reseller", "licenses:view")).toBe(true);
    expect(can("reseller", "licenses:create")).toBe(true);
    expect(can("reseller", "products:view")).toBe(true);
  });

  it("cannot access admin endpoints", () => {
    expect(can("reseller", "licenses:delete")).toBe(false);
    expect(can("reseller", "products:create")).toBe(false);
    expect(can("reseller", "resellers:view")).toBe(false);
    expect(can("reseller", "discord:manage")).toBe(false);
    expect(can("reseller", "users:manage")).toBe(false);
    expect(can("reseller", "settings:manage")).toBe(false);
    expect(can("reseller", "logs:view")).toBe(false);
  });

  it("cannot manage other resellers", () => {
    expect(can("reseller", "resellers:create")).toBe(false);
    expect(can("reseller", "resellers:edit")).toBe(false);
    expect(can("reseller", "resellers:delete")).toBe(false);
  });

  it("cannot manage users", () => {
    expect(can("reseller", "users:view")).toBe(false);
    expect(can("reseller", "users:manage")).toBe(false);
  });
});

describe("RBAC — support role", () => {
  it("can view dashboard, licenses, products, logs", () => {
    expect(can("support", "dashboard:view")).toBe(true);
    expect(can("support", "licenses:view")).toBe(true);
    expect(can("support", "products:view")).toBe(true);
    expect(can("support", "logs:view")).toBe(true);
  });

  it("cannot create, edit or delete licenses", () => {
    expect(can("support", "licenses:create")).toBe(false);
    expect(can("support", "licenses:edit")).toBe(false);
    expect(can("support", "licenses:delete")).toBe(false);
  });

  it("cannot manage discord or users", () => {
    expect(can("support", "discord:manage")).toBe(false);
    expect(can("support", "users:manage")).toBe(false);
  });
});

describe("RBAC — admin role", () => {
  it("can manage licenses and resellers", () => {
    expect(can("admin", "licenses:create")).toBe(true);
    expect(can("admin", "licenses:edit")).toBe(true);
    expect(can("admin", "resellers:edit")).toBe(true);
    expect(can("admin", "discord:view")).toBe(true);
  });

  it("cannot delete licenses or products", () => {
    expect(can("admin", "licenses:delete")).toBe(false);
    expect(can("admin", "products:delete")).toBe(false);
  });

  it("cannot manage settings or users", () => {
    expect(can("admin", "settings:manage")).toBe(false);
    expect(can("admin", "users:manage")).toBe(false);
  });
});

describe("RBAC — owner role", () => {
  it("has ALL permissions", () => {
    const all = [
      "dashboard:view",
      "licenses:view",   "licenses:create",   "licenses:edit",   "licenses:delete",
      "products:view",   "products:create",    "products:edit",   "products:delete",
      "resellers:view",  "resellers:create",   "resellers:edit",  "resellers:delete",
      "discord:view",    "discord:manage",
      "telegram:view",   "telegram:manage",
      "automation:view", "automation:manage",
      "logs:view",
      "settings:view",   "settings:manage",
      "users:view",      "users:manage",
    ] as const;
    all.forEach((p) => expect(can("owner", p)).toBe(true));
  });
});

describe("RBAC — isOwnerOrAdmin", () => {
  it("true only for owner and admin", () => {
    expect(isOwnerOrAdmin("owner")).toBe(true);
    expect(isOwnerOrAdmin("admin")).toBe(true);
    expect(isOwnerOrAdmin("reseller")).toBe(false);
    expect(isOwnerOrAdmin("support")).toBe(false);
    expect(isOwnerOrAdmin("pending" as UserRole)).toBe(false);
  });
});
