import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.telegramAccount.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: accounts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: implement telegram account creation
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
