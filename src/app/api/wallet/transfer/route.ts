import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { transferCredits } from "@/services/walletService";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toUserId, amount, reason } = await req.json();
  if (!toUserId || !amount) {
    return NextResponse.json({ error: "toUserId and amount required" }, { status: 400 });
  }

  const fromUserId = (session.user as any).id as string;

  try {
    const result = await transferCredits(fromUserId, toUserId, Number(amount), reason);
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
