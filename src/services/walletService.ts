import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/auditService";
import type { TransactionType } from "@/types";

// ── Get or create wallet ───────────────────────────────────────────────────────

export async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where:   { userId },
    update:  {},
    create:  { userId, balance: 0 },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet?.balance ?? 0;
}

// ── Add credits ────────────────────────────────────────────────────────────────

export async function addCredits(
  userId:       string,
  amount:       number,
  reason?:      string,
  createdById?: string,
): Promise<{ balance: number }> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Amount must be a positive integer");

  const wallet = await getOrCreateWallet(userId);

  const [updated] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data:  { balance: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        walletId:    wallet.id,
        amount,
        type:        "credit_add",
        reason:      reason ?? "Manual credit addition",
        createdById: createdById ?? null,
      },
    }),
  ]);

  await createAuditLog({
    userId:   createdById,
    action:   "credit_added",
    entity:   "wallet",
    entityId: wallet.id,
    metadata: { targetUserId: userId, amount, reason },
  });

  return { balance: updated.balance };
}

// ── Remove credits — atomic with balance check inside transaction ──────────────

export async function removeCredits(
  userId:       string,
  amount:       number,
  reason?:      string,
  createdById?: string,
): Promise<{ balance: number }> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Amount must be a positive integer");

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet not found");
    if (wallet.balance < amount) throw new Error("Insufficient balance");

    const [updated] = await Promise.all([
      tx.wallet.update({
        where: { id: wallet.id },
        data:  { balance: { decrement: amount } },
      }),
      tx.creditTransaction.create({
        data: {
          walletId:    wallet.id,
          amount:      -amount,
          type:        "credit_remove",
          reason:      reason ?? "Manual credit removal",
          createdById: createdById ?? null,
        },
      }),
    ]);

    return { walletId: wallet.id, balance: updated.balance };
  });

  await createAuditLog({
    userId:   createdById,
    action:   "credit_removed",
    entity:   "wallet",
    entityId: result.walletId,
    metadata: { targetUserId: userId, amount, reason },
  });

  return { balance: result.balance };
}

// ── Transfer credits — atomic, no self-transfer ───────────────────────────────

export async function transferCredits(
  fromUserId: string,
  toUserId:   string,
  amount:     number,
  reason?:    string,
): Promise<{ fromBalance: number; toBalance: number }> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Amount must be a positive integer");
  if (fromUserId === toUserId) throw new Error("Cannot transfer credits to yourself");

  const result = await prisma.$transaction(async (tx) => {
    const fromWallet = await tx.wallet.findUnique({ where: { userId: fromUserId } });
    if (!fromWallet) throw new Error("Source wallet not found");
    if (fromWallet.balance < amount) throw new Error("Insufficient balance");

    // Ensure destination wallet exists
    const toWallet = await tx.wallet.upsert({
      where:  { userId: toUserId },
      update: {},
      create: { userId: toUserId, balance: 0 },
    });

    const [from, to] = await Promise.all([
      tx.wallet.update({
        where: { id: fromWallet.id },
        data:  { balance: { decrement: amount } },
      }),
      tx.wallet.update({
        where: { id: toWallet.id },
        data:  { balance: { increment: amount } },
      }),
      tx.creditTransaction.create({
        data: {
          walletId:    fromWallet.id,
          amount:      -amount,
          type:        "transfer_out",
          reason:      reason ?? `Transfer to ${toUserId}`,
          createdById: fromUserId,
        },
      }),
      tx.creditTransaction.create({
        data: {
          walletId:    toWallet.id,
          amount,
          type:        "transfer_in",
          reason:      reason ?? `Transfer from ${fromUserId}`,
          createdById: fromUserId,
        },
      }),
    ]);

    return { fromBalance: from.balance, toBalance: to.balance };
  });

  await createAuditLog({
    userId:   fromUserId,
    action:   "credit_transfer",
    entity:   "wallet",
    metadata: { fromUserId, toUserId, amount, reason },
  });

  return result;
}

// ── Transactions ───────────────────────────────────────────────────────────────

export async function getTransactions(userId: string, limit = 50, offset = 0) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return [];
  return prisma.creditTransaction.findMany({
    where:   { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take:    Math.min(limit, 200),
    skip:    offset,
  });
}

// ── Monthly stats ──────────────────────────────────────────────────────────────

export async function getWalletMonthlyStats(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return { added: 0, removed: 0, balance: 0 };

  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);

  const txs = await prisma.creditTransaction.findMany({
    where: { walletId: wallet.id, createdAt: { gte: start } },
  });

  const added   = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const removed = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return { added, removed, balance: wallet.balance };
}

// ── Refund ─────────────────────────────────────────────────────────────────────

export async function refundCredits(
  userId:       string,
  amount:       number,
  reason?:      string,
  createdById?: string,
) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Amount must be a positive integer");
  const wallet = await getOrCreateWallet(userId);

  const [updated] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data:  { balance: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        walletId:    wallet.id,
        amount,
        type:        "refund",
        reason:      reason ?? "Refund",
        createdById: createdById ?? null,
      },
    }),
  ]);

  return { balance: updated.balance };
}
