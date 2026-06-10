import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import {
  createProviderRequest,
  updateProviderRequestStatus,
  createProviderJob,
  updateProviderJob,
  createProviderLog,
} from "@/services/providerService";
import { createLicense } from "@/services/licenseService";
import { providerRegistry } from "@/providers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  const { id } = await params;

  const { productExternalRef, productId, userId } = await req.json();
  if (!productExternalRef || !productId || !userId) {
    return NextResponse.json({ error: "productExternalRef, productId and userId are required" }, { status: 400 });
  }

  // 1. Create request record
  const providerRequest = await createProviderRequest({ providerId: id, productId, userId });

  // 2. Create job record
  const job = await createProviderJob({
    providerId: id,
    requestId:  providerRequest.id,
    payload:    { productExternalRef, productId, userId },
  });

  const provider = providerRegistry.get(id);
  if (!provider) {
    await updateProviderRequestStatus(providerRequest.id, "failed", { error: "Provider not registered in runtime" });
    await updateProviderJob(job.id, "failed", { error: "Provider not registered in runtime" });
    await createProviderLog({ providerId: id, action: "request_license", error: "Provider not registered in runtime" });
    return NextResponse.json({ ok: false, requestId: providerRequest.id, error: "Provider not registered in runtime" });
  }

  // 3. Mark processing
  await updateProviderRequestStatus(providerRequest.id, "processing");
  await updateProviderJob(job.id, "running");

  // 4. Call provider
  const result = await provider.requestLicense({ productExternalRef, userId });

  if (!result.ok || !result.key) {
    await updateProviderRequestStatus(providerRequest.id, "failed", { error: result.error });
    await updateProviderJob(job.id, "failed", { error: result.error }, 1);
    await createProviderLog({
      providerId: id, action: "request_license",
      request:    { productExternalRef, userId },
      error:      result.error,
    });
    return NextResponse.json({ ok: false, requestId: providerRequest.id, error: result.error });
  }

  // 5. Save license in GianCore
  const license = await createLicense({
    key:      result.key,
    productId,
    userId,
    expiresAt: result.expiresAt,
    metadata:  { providerId: id, requestId: providerRequest.id, source: "provider" },
  });

  // 6. Mark completed
  await updateProviderRequestStatus(providerRequest.id, "completed", { key: result.key, licenseId: license.id });
  await updateProviderJob(job.id, "done", { key: result.key, licenseId: license.id });
  await createProviderLog({
    providerId: id, action: "request_license",
    request:    { productExternalRef, userId },
    response:   { key: result.key, licenseId: license.id },
  });

  return NextResponse.json({ ok: true, requestId: providerRequest.id, key: result.key, licenseId: license.id });
}
