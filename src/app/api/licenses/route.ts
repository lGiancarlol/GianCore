import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const licenses = await prisma.license.findMany({
    include: {
      user:    { select: { id: true, username: true, email: true } },
      product: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: licenses });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: implement license creation
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
