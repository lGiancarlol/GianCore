import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: implement reseller creation with RBAC check
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
