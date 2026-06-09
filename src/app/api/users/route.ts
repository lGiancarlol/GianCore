import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const check = await requirePermission("users:view");
  if (!check.ok) return check.response;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, username: true,
        role: true, active: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: users });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const check = await requirePermission("users:manage");
  if (!check.ok) return check.response;

  try {
    const { id, role, active } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id },
      data:  {
        ...(role   !== undefined ? { role }   : {}),
        ...(active !== undefined ? { active } : {}),
      },
      select: { id: true, username: true, role: true, active: true },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
