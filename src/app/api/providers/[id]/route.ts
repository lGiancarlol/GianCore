import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { getProviderById, updateProvider } from "@/services/providerService";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:view");
  if (!check.ok) return check.response;
  const { id } = await params;
  const data = await getProviderById(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  const { id } = await params;
  try {
    const body = await req.json();
    const data = await updateProvider(id, body);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
