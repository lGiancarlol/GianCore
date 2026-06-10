import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { createProviderRequest, createProviderLog } from "@/services/providerService";
import { providerRegistry } from "@/providers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  const { id } = await params;

  const { productExternalRef, productId, userId } = await req.json();
  if (!productExternalRef || !productId || !userId) {
    return NextResponse.json({ error: "productExternalRef, productId and userId are required" }, { status: 400 });
  }

  // Record the request
  const request = await createProviderRequest({ providerId: id, productId, userId });

  const provider = providerRegistry.get(id);
  if (!provider) {
    await createProviderLog({ providerId: id, action: "request_license", error: "Provider not registered in runtime" });
    return NextResponse.json({ ok: false, requestId: request.id, error: "Provider not registered in runtime" });
  }

  const result = await provider.requestLicense({ productExternalRef, userId });
  await createProviderLog({
    providerId: id,
    action:     "request_license",
    request:    { productExternalRef, userId },
    response:   result.ok ? { key: result.key } : undefined,
    error:      result.error,
  });

  return NextResponse.json({ ...result, requestId: request.id });
}
