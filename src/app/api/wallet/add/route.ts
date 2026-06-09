import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { addCredits } from "@/services/walletService";

export async function POST(req: Request) {
  const check = await requirePermission("resellers:edit");
  if (!check.ok) return check.response;

  try {
    const { userId, amount, reason } = await req.json();
    if (!userId || !amount) {
      return NextResponse.json({ error: "userId and amount required" }, { status: 400 });
    }

    const parsed = parseInt(String(amount), 10);
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });
    }

    const result = await addCredits(userId, parsed, reason, (check.session.user as any).id);
    return NextResponse.json({ data: result });
  } catch (err: any) {
    const safe = err?.message?.includes("positive") || err?.message?.includes("Wallet")
      ? err.message : "Internal server error";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
