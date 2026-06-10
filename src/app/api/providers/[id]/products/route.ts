import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { upsertProviderProduct, deleteProviderProduct } from "@/services/providerService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  const { id: providerId } = await params;
  try {
    const { productId, externalRef, metadata, active } = await req.json();
    if (!productId || !externalRef) {
      return NextResponse.json({ error: "productId and externalRef are required" }, { status: 400 });
    }
    const data = await upsertProviderProduct({ providerId, productId, externalRef, metadata, active });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await deleteProviderProduct(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
