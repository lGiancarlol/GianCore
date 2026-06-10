import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { getProviderLogs } from "@/services/providerService";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:view");
  if (!check.ok) return check.response;
  const { id } = await params;
  const url   = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const data  = await getProviderLogs(id, limit);
  return NextResponse.json({ data });
}
