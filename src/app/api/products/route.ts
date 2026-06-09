import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const check = await requirePermission("products:view");
  if (!check.ok) return check.response;

  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const check = await requirePermission("products:create");
  if (!check.ok) return check.response;

  try {
    const { name, description, price = 0, active = true } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const product = await prisma.product.create({
      data: { name: name.trim(), slug, description: description?.trim() ?? null, price: Number(price), active },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A product with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const check = await requirePermission("products:edit");
  if (!check.ok) return check.response;

  try {
    const { id, name, description, price, active } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (name        !== undefined) data.name        = name.trim();
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (price       !== undefined) data.price       = Number(price);
    if (active      !== undefined) data.active      = active;

    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ data: product });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
