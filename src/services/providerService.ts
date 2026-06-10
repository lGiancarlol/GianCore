import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";

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
  providerId:  string;
  productId:   string;
  externalRef: string;
  metadata?:   Prisma.InputJsonValue;
  active?:     boolean;
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

// ── Provider Accounts (credentials encrypted) ─────────────────────────────────

export async function createProviderAccount(data: {
  providerId:  string;
  label:       string;
  credentials: Record<string, string>;
  active?:     boolean;
}) {
  const encrypted = await encryptCredentials(data.credentials);
  return prisma.providerAccount.create({
    data: { ...data, credentials: encrypted as unknown as Prisma.InputJsonValue },
  });
}

export function updateProviderAccount(id: string, data: Partial<{ label: string; active: boolean }>) {
  return prisma.providerAccount.update({ where: { id }, data });
}

export function deleteProviderAccount(id: string) {
  return prisma.providerAccount.delete({ where: { id } });
}

/** Returns decrypted credentials — only use server-side for provider execution */
export async function getProviderAccountCredentials(id: string): Promise<Record<string, string> | null> {
  const acc = await prisma.providerAccount.findUnique({ where: { id } });
  if (!acc) return null;
  return decryptCredentials(acc.credentials as unknown as string);
}

// ── Provider Requests ──────────────────────────────────────────────────────────

export function createProviderRequest(data: {
  providerId:   string;
  productId:    string;
  userId:       string;
  requestType?: string;
}) {
  return prisma.providerRequest.create({ data });
}

export function updateProviderRequestStatus(
  id:            string,
  status:        string,
  responseData?: Prisma.InputJsonValue,
) {
  return prisma.providerRequest.update({
    where: { id },
    data:  { status: status as Parameters<typeof prisma.providerRequest.update>[0]["data"]["status"], responseData },
  });
}

// ── Provider Jobs ──────────────────────────────────────────────────────────────

export function createProviderJob(data: {
  providerId: string;
  requestId:  string;
  payload:    Prisma.InputJsonValue;
}) {
  return prisma.providerJob.create({ data });
}

export function updateProviderJob(
  id:       string,
  status:   string,
  response?: Prisma.InputJsonValue,
  retries?:  number,
) {
  return prisma.providerJob.update({
    where: { id },
    data:  {
      status:   status as Parameters<typeof prisma.providerJob.update>[0]["data"]["status"],
      response,
      ...(retries !== undefined ? { retries } : {}),
    },
  });
}

// ── Provider Conversations ─────────────────────────────────────────────────────

export function upsertConversation(providerId: string, telegramUserId: string, state: string, lastMessageId?: string) {
  return prisma.providerConversation.upsert({
    where:  { providerId_telegramUserId: { providerId, telegramUserId } },
    create: { providerId, telegramUserId, state, lastMessageId },
    update: { state, lastMessageId, updatedAt: new Date() },
  });
}

export function getConversation(providerId: string, telegramUserId: string) {
  return prisma.providerConversation.findUnique({
    where: { providerId_telegramUserId: { providerId, telegramUserId } },
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
  const [total, completed, failed, lastKey, lastLog] = await Promise.all([
    prisma.providerRequest.count({ where: { providerId } }),
    prisma.providerRequest.count({ where: { providerId, status: "completed" } }),
    prisma.providerRequest.count({ where: { providerId, status: "failed"    } }),
    // Last completed request — contains the key in responseData
    prisma.providerRequest.findFirst({
      where:   { providerId, status: "completed" },
      orderBy: { updatedAt: "desc" },
      select:  { responseData: true, updatedAt: true },
    }),
    prisma.providerLog.findFirst({
      where:   { providerId, error: { not: null } },
      orderBy: { createdAt: "desc" },
      select:  { error: true, createdAt: true },
    }),
  ]);

  // Average response time from jobs (done only)
  const doneJobs = await prisma.providerJob.findMany({
    where:   { providerId, status: "done" },
    select:  { createdAt: true, updatedAt: true },
    take:    50,
    orderBy: { updatedAt: "desc" },
  });
  const avgMs = doneJobs.length
    ? Math.round(doneJobs.reduce((s, j) => s + (j.updatedAt.getTime() - j.createdAt.getTime()), 0) / doneJobs.length)
    : null;

  return {
    total,
    completed,
    failed,
    pending: total - completed - failed,
    avgResponseMs: avgMs,
    lastKey:       lastKey?.responseData ?? null,
    lastKeyAt:     lastKey?.updatedAt    ?? null,
    lastError:     lastLog,
  };
}
