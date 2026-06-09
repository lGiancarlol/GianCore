import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const check = await requirePermission("logs:view");
  if (!check.ok) return check.response;

  try {
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("limit")  ?? 50), 200);
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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
