import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const check = await requirePermission("discord:view");
  if (!check.ok) return check.response;

  try {
    const integrations = await prisma.integration.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: integrations });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const check = await requirePermission("discord:manage");
  if (!check.ok) return check.response;

  try {
    const { name, type, config, active = true } = await req.json();
    if (!name || !type || !config) {
      return NextResponse.json({ error: "name, type and config are required" }, { status: 400 });
    }

    const integration = await prisma.integration.create({
      data: { name, type, config, active },
    });
    return NextResponse.json({ data: integration }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
