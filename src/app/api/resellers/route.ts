import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const check = await requirePermission("resellers:view");
  if (!check.ok) return check.response;

  try {
    const resellers = await prisma.user.findMany({
      where: { role: "reseller" },
      select: {
        id: true, email: true, username: true,
        active: true, createdAt: true,
        creditWallet: { select: { balance: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: resellers });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
