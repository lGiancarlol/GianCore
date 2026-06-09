import { NextResponse } from "next/server";

/**
 * Validates that the request carries the shared bot secret.
 * Returns null if valid, or a 401 NextResponse if not.
 */
export function requireBotToken(req: Request): NextResponse | null {
  const expected = process.env.API_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const header = req.headers.get("authorization") ?? "";
  const token  = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
