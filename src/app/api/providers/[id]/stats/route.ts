import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { getProviderStats } from "@/services/providerService";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:view");
  if (!check.ok) return check.response;
  const { id } = await params;
  const data = await getProviderStats(id);
  return NextResponse.json({ data });
}
