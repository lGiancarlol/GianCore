import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import type { Session } from "next-auth";
import type { UserRole } from "@/types";

type Permission = Parameters<typeof can>[1];

type AuthSuccess = { ok: true; session: Session };
type AuthFailure = { ok: false; response: NextResponse };

/**
 * Checks session + RBAC permission in one call.
 * Returns { ok: true, session } if allowed, or { ok: false, response } if not.
 */
export async function requirePermission(
  permission: Permission,
): Promise<AuthSuccess | AuthFailure> {
  const session = await auth() as Session | null;
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = (session.user as any).role as UserRole;
  if (!can(role, permission)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
