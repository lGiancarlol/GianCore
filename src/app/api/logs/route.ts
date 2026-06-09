import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Number(searchParams.get("limit") ?? 50);
  const skip = Number(searchParams.get("offset") ?? 0);

  const logs = await prisma.auditLog.findMany({
    include: {
      user: { select: { id: true, username: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });

  return NextResponse.json({ data: logs });
}
