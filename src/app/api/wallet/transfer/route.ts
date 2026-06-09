import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { transferCredits } from "@/services/walletService";

export async function POST(req: Request) {
  const check = await requirePermission("licenses:view"); // any authenticated user
  if (!check.ok) return check.response;

  try {
    const { toUserId, amount, reason } = await req.json();
    if (!toUserId || !amount) {
      return NextResponse.json({ error: "toUserId and amount required" }, { status: 400 });
    }

    const parsed     = parseInt(String(amount), 10);
    const fromUserId = (check.session.user as any).id as string;

    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });
    }
    if (fromUserId === toUserId) {
      return NextResponse.json({ error: "Cannot transfer credits to yourself" }, { status: 400 });
    }

    const result = await transferCredits(fromUserId, toUserId, parsed, reason);
    return NextResponse.json({ data: result });
  } catch (err: any) {
    const safe = err?.message?.includes("Insufficient") || err?.message?.includes("wallet")
      ? err.message : "Internal server error";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
