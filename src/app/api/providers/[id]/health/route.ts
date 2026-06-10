import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { getProviderById } from "@/services/providerService";
import { providerRegistry } from "@/providers";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  const { id } = await params;

  const provider = providerRegistry.get(id);
  if (!provider) {
    // Provider exists in DB but not yet registered (no runtime instance)
    const dbProvider = await getProviderById(id);
    if (!dbProvider) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: false, error: "Provider not registered in runtime" });
  }

  const result = await provider.healthCheck();
  return NextResponse.json(result);
}
