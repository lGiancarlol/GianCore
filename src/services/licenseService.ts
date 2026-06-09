import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { LicenseStatus } from "@/types";

export async function getLicenses() {
  return prisma.license.findMany({
    include: {
      user:    { select: { id: true, username: true, email: true } },
      product: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLicenseByKey(key: string) {
  return prisma.license.findUnique({
    where: { key },
    include: {
      user:    { select: { id: true, username: true, email: true } },
      product: true,
    },
  });
}

export async function createLicense(data: {
  key: string;
  productId: string;
  userId: string;
  expiresAt?: Date;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.license.create({ data });
}

export async function updateLicenseStatus(id: string, status: LicenseStatus) {
  return prisma.license.update({ where: { id }, data: { status } });
}
