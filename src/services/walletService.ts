import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/auditService";
import type { TransactionType } from "@/types";

// ── Get or create wallet ───────────────────────────────────────────────────────

export async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where:  { userId },
    update: {},
    create: { userId, balance: 0 },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet?.balance ?? 0;
}

// ── Add credits ────────────────────────────────────────────────────────────────

export async function addCredits(
  userId:      string,
  amount:      number,
  reason?:     string,
  createdById?: string,
): Promise<{ balance: number }> {
  if (amount <= 0) throw new Error("Amount must be positive");

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

// ── Remove credits ─────────────────────────────────────────────────────────────

export async function removeCredits(
  userId:      string,
  amount:      number,
  reason?:     string,
  createdById?: string,
): Promise<{ balance: number }> {
  if (amount <= 0) throw new Error("Amount must be positive");

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("Wallet not found");
  if (wallet.balance < amount) throw new Error("Insufficient balance");

  const [updated] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data:  { balance: { decrement: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        walletId:    wallet.id,
        amount:      -amount,
        type:        "credit_remove",
        reason:      reason ?? "Manual credit removal",
        createdById: createdById ?? null,
      },
    }),
  ]);

  await createAuditLog({
    userId:   createdById,
    action:   "credit_removed",
    entity:   "wallet",
    entityId: wallet.id,
    metadata: { targetUserId: userId, amount, reason },
  });

  return { balance: updated.balance };
}

// ── Transfer credits ───────────────────────────────────────────────────────────

export async function transferCredits(
  fromUserId:  string,
  toUserId:    string,
  amount:      number,
  reason?:     string,
): Promise<{ fromBalance: number; toBalance: number }> {
  if (amount <= 0) throw new Error("Amount must be positive");

  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: fromUserId } }),
    getOrCreateWallet(toUserId),
  ]);

  if (!fromWallet) throw new Error("Source wallet not found");
  if (fromWallet.balance < amount) throw new Error("Insufficient balance");

  const now = new Date();

  const [from, to] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: fromWallet.id },
      data:  { balance: { decrement: amount } },
    }),
    prisma.wallet.update({
      where: { id: toWallet.id },
      data:  { balance: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        walletId:    fromWallet.id,
        amount:      -amount,
        type:        "transfer_out",
        reason:      reason ?? `Transfer to ${toUserId}`,
        createdById: fromUserId,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        walletId:    toWallet.id,
        amount,
        type:        "transfer_in",
        reason:      reason ?? `Transfer from ${fromUserId}`,
        createdById: fromUserId,
      },
    }),
  ]);

  await createAuditLog({
    userId:   fromUserId,
    action:   "credit_transfer",
    entity:   "wallet",
    metadata: { fromUserId, toUserId, amount, reason },
  });

  return { fromBalance: from.balance, toBalance: to.balance };
}

// ── Transactions ───────────────────────────────────────────────────────────────

export async function getTransactions(userId: string, limit = 50, offset = 0) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return [];

  return prisma.creditTransaction.findMany({
    where:   { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take:    limit,
    skip:    offset,
  });
}

// ── Monthly stats ──────────────────────────────────────────────────────────────

export async function getWalletMonthlyStats(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return { added: 0, removed: 0, balance: 0 };

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const txs = await prisma.creditTransaction.findMany({
    where: { walletId: wallet.id, createdAt: { gte: start } },
  });

  const added   = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const removed = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return { added, removed, balance: wallet.balance };
}

// ── Refund ─────────────────────────────────────────────────────────────────────

export async function refundCredits(
  userId:      string,
  amount:      number,
  reason?:     string,
  createdById?: string,
) {
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
