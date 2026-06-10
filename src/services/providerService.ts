import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ── Providers ──────────────────────────────────────────────────────────────────

export function getProviders() {
  return prisma.provider.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true, accounts: true, requests: true } } },
  });
}

export function getProviderById(id: string) {
  return prisma.provider.findUnique({
    where: { id },
    include: {
      products: { include: { product: { select: { id: true, name: true, slug: true } } } },
      accounts: { select: { id: true, label: true, active: true, createdAt: true, updatedAt: true } },
    },
  });
}

export function createProvider(data: {
  name: string;
  type: string;
  config: Prisma.InputJsonValue;
  active?: boolean;
}) {
  return prisma.provider.create({ data: data as Parameters<typeof prisma.provider.create>[0]["data"] });
}

export function updateProvider(id: string, data: Partial<{ name: string; active: boolean; config: Prisma.InputJsonValue }>) {
  return prisma.provider.update({ where: { id }, data });
}

// ── Provider Products ──────────────────────────────────────────────────────────

export function upsertProviderProduct(data: {
  providerId: string;
  productId: string;
  externalRef: string;
  metadata?: Prisma.InputJsonValue;
  active?: boolean;
}) {
  return prisma.providerProduct.upsert({
    where:  { providerId_productId: { providerId: data.providerId, productId: data.productId } },
    create: data,
    update: { externalRef: data.externalRef, metadata: data.metadata, active: data.active ?? true },
  });
}

export function deleteProviderProduct(id: string) {
  return prisma.providerProduct.delete({ where: { id } });
}

// ── Provider Accounts ──────────────────────────────────────────────────────────

export function createProviderAccount(data: {
  providerId:  string;
  label:       string;
  credentials: Prisma.InputJsonValue;
  active?:     boolean;
}) {
  return prisma.providerAccount.create({ data });
}

export function updateProviderAccount(id: string, data: Partial<{ label: string; active: boolean }>) {
  return prisma.providerAccount.update({ where: { id }, data });
}

export function deleteProviderAccount(id: string) {
  return prisma.providerAccount.delete({ where: { id } });
}

// ── Provider Requests ──────────────────────────────────────────────────────────

export function createProviderRequest(data: {
  providerId:  string;
  productId:   string;
  userId:      string;
  requestType?: string;
}) {
  return prisma.providerRequest.create({ data });
}

export function updateProviderRequestStatus(
  id:           string,
  status:       string,
  responseData?: Prisma.InputJsonValue,
) {
  return prisma.providerRequest.update({
    where: { id },
    data:  { status: status as Parameters<typeof prisma.providerRequest.update>[0]["data"]["status"], responseData },
  });
}

// ── Provider Logs ──────────────────────────────────────────────────────────────

export function createProviderLog(data: {
  providerId: string;
  action:     string;
  request?:   Prisma.InputJsonValue;
  response?:  Prisma.InputJsonValue;
  error?:     string;
}) {
  return prisma.providerLog.create({ data });
}

export function getProviderLogs(providerId: string, limit = 50) {
  return prisma.providerLog.findMany({
    where:   { providerId },
    orderBy: { createdAt: "desc" },
    take:    limit,
  });
}

// ── Monitoring Stats ───────────────────────────────────────────────────────────

export async function getProviderStats(providerId: string) {
  const [total, completed, failed, recent] = await Promise.all([
    prisma.providerRequest.count({ where: { providerId } }),
    prisma.providerRequest.count({ where: { providerId, status: "completed" } }),
    prisma.providerRequest.count({ where: { providerId, status: "failed" } }),
    prisma.providerLog.findFirst({
      where:   { providerId, error: { not: null } },
      orderBy: { createdAt: "desc" },
      select:  { error: true, createdAt: true },
    }),
  ]);
  return { total, completed, failed, pending: total - completed - failed, lastError: recent };
}
