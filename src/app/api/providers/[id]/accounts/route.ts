import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { createProviderAccount, updateProviderAccount, deleteProviderAccount } from "@/services/providerService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  const { id: providerId } = await params;
  try {
    const { label, credentials, active } = await req.json();
    if (!label || !credentials) {
      return NextResponse.json({ error: "label and credentials are required" }, { status: 400 });
    }
    const data = await createProviderAccount({ providerId, label, credentials, active });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  try {
    const { id, label, active } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const data = await updateProviderAccount(id, { label, active });
    return NextResponse.json({ data });
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
    await deleteProviderAccount(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
