import { prisma } from "@/lib/prisma";

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
  return prisma.integration.upsert({
    where: { type: data.type },
    update: { config: data.config, name: data.name },
    create: { ...data },
  });
}
