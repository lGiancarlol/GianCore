import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { getTransactions } from "@/services/walletService";

export async function GET(req: Request) {
  const check = await requirePermission("licenses:view");
  if (!check.ok) return check.response;

  try {
    const { searchParams } = new URL(req.url);
    const limit  = Math.min(Number(searchParams.get("limit")  ?? 50), 200);
    const offset = Number(searchParams.get("offset") ?? 0);
    const userId = (check.session.user as any).id as string;

    const txs = await getTransactions(userId, limit, offset);
    return NextResponse.json({ data: txs });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
