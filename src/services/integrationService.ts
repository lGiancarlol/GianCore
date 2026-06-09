import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getIntegrations() {
  return prisma.integration.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getIntegrationByType(type: string) {
  return prisma.integration.findFirst({ where: { type, active: true } });
}

export async function upsertIntegration(data: {
  name: string;
  type: string;
  config: Record<string, unknown>;
}) {
  // Integration has no unique field besides id — use findFirst + update/create
  const existing = await prisma.integration.findFirst({ where: { type: data.type } });
  if (existing) {
    return prisma.integration.update({
      where:  { id: existing.id },
      data:   { config: data.config as Prisma.InputJsonValue, name: data.name },
    });
  }
  return prisma.integration.create({
    data: { name: data.name, type: data.type, config: data.config as Prisma.InputJsonValue },
  });
}
