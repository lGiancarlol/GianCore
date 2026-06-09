import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types";

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { creditWallet: true },
  });
}

export async function getUsersByRole(role: UserRole) {
  return prisma.user.findMany({
    where: { role },
    include: { creditWallet: { select: { balance: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUserRole(id: string, role: UserRole) {
  return prisma.user.update({ where: { id }, data: { role } });
}

export async function toggleUserStatus(id: string, active: boolean) {
  return prisma.user.update({ where: { id }, data: { active } });
}
