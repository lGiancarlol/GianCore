import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTransactions } from "@/services/walletService";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = (searchParams.get("userId") ?? (session.user as any).id) as string;
  const limit  = Number(searchParams.get("limit")  ?? 50);
  const offset = Number(searchParams.get("offset") ?? 0);

  const transactions = await getTransactions(userId, limit, offset);
  return NextResponse.json({ data: transactions });
}
