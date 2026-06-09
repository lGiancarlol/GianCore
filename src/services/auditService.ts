import { prisma } from "@/lib/prisma";

export async function createAuditLog(data: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  return prisma.auditLog.create({
    data: { ...data, metadata: data.metadata ?? {} },
  });
}

export async function getAuditLogs(limit = 50, offset = 0) {
  return prisma.auditLog.findMany({
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}
