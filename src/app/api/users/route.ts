import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, username: true,
      role: true, active: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: users });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: implement user creation with RBAC check
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
