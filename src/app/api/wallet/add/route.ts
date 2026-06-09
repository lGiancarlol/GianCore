import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addCredits } from "@/services/walletService";
import { isOwnerOrAdmin } from "@/lib/rbac";
import type { UserRole } from "@/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as UserRole;
  if (!isOwnerOrAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, amount, reason } = await req.json();
  if (!userId || !amount) {
    return NextResponse.json({ error: "userId and amount required" }, { status: 400 });
  }

  try {
    const result = await addCredits(userId, Number(amount), reason, (session.user as any).id);
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
