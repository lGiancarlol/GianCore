import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requirePermission } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

function generateKey(prefix?: string): string {
  const seg = () => randomBytes(2).toString("hex").toUpperCase();
  const segments = `${seg()}-${seg()}-${seg()}-${seg()}`;
  return prefix ? `${prefix.toUpperCase()}-${segments}` : segments;
}

export async function GET() {
  const check = await requirePermission("licenses:view");
  if (!check.ok) return check.response;

  try {
    const licenses = await prisma.license.findMany({
      include: {
        user:    { select: { id: true, username: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: licenses });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const check = await requirePermission("licenses:create");
  if (!check.ok) return check.response;

  try {
    const { productId, key, expiresAt, prefix } = await req.json();
    if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const userId  = (check.session.user as any)?.id as string;
    const licKey  = key?.trim() || generateKey(prefix);

    const license = await prisma.license.create({
      data: {
        key:      licKey,
        productId,
        userId,
        status:   "active",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        user:    { select: { id: true, username: true } },
        product: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: license }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "License key already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const check = await requirePermission("licenses:edit");
  if (!check.ok) return check.response;

  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

    const valid = ["active", "inactive", "expired", "banned"];
    if (!valid.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const license = await prisma.license.update({
      where: { id },
      data:  { status },
    });
    return NextResponse.json({ data: license });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
