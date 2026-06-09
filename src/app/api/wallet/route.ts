import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateWallet, getWalletMonthlyStats } from "@/services/walletService";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const [wallet, monthly] = await Promise.all([
    getOrCreateWallet(userId),
    getWalletMonthlyStats(userId),
  ]);

  return NextResponse.json({ data: { wallet, monthly } });
}
