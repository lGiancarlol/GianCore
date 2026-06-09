/**
 * tests/wallet/concurrency.test.ts
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { store, resetStore, prismaMock }         from "../helpers/prismaMock";

vi.mock("@/lib/prisma", async () => {
  const mod = await import("../helpers/prismaMock");
  return { prisma: mod.prismaMock };
});

vi.mock("@/services/auditService", () => ({
  createAuditLog: vi.fn(async () => ({})),
}));

const { addCredits, removeCredits, transferCredits } = await import("@/services/walletService");

// ── Helpers ────────────────────────────────────────────────────────────────────

function seedUser(id: string) {
  store.users.set(id, {
    id, email: `${id}@t.io`, username: id,
    passwordHash: "", role: "reseller", active: true,
  });
}

function seedWallet(userId: string, balance: number) {
  const id = `wallet_${userId}`;
  store.wallets.set(id, { id, userId, balance, transactions: [] });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Wallet — Concurrency & Safety", () => {

  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("Case 1 — 10 concurrent removeCredits(100) from 500 → balance=0, never negative", async () => {
    seedUser("uA");
    seedWallet("uA", 500);

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => removeCredits("uA", 100, "test"))
    );

    expect(results.filter((r) => r.status === "fulfilled").length).toBe(5);
    expect(results.filter((r) => r.status === "rejected").length).toBe(5);

    const wallet = [...store.wallets.values()].find((w) => w.userId === "uA");
    expect(wallet!.balance).toBe(0);
    expect(wallet!.balance).toBeGreaterThanOrEqual(0);
  });

  it("Case 2 — 10 concurrent transfers(50) from 300 → balance never negative", async () => {
    seedUser("uFrom");
    seedUser("uTo");
    seedWallet("uFrom", 300);
    seedWallet("uTo",   0);

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        transferCredits("uFrom", "uTo", 50, "test")
      )
    );

    expect(results.filter((r) => r.status === "fulfilled").length).toBe(6);
    expect(results.filter((r) => r.status === "rejected").length).toBe(4);

    const fromW = [...store.wallets.values()].find((w) => w.userId === "uFrom");
    expect(fromW!.balance).toBe(0);
    expect(fromW!.balance).toBeGreaterThanOrEqual(0);
  });

  it("Case 3 — self-transfer → rejected, balance unchanged", async () => {
    seedUser("uSelf");
    seedWallet("uSelf", 1000);

    await expect(transferCredits("uSelf", "uSelf", 100)).rejects.toThrow(
      "Cannot transfer credits to yourself"
    );

    const wallet = [...store.wallets.values()].find((w) => w.userId === "uSelf");
    expect(wallet!.balance).toBe(1000);
  });

  it("Case 4 — remove more than balance → rejected", async () => {
    seedUser("uB");
    seedWallet("uB", 50);

    await expect(removeCredits("uB", 100)).rejects.toThrow("Insufficient balance");

    const wallet = [...store.wallets.values()].find((w) => w.userId === "uB");
    expect(wallet!.balance).toBe(50);
  });

  it("Case 5 — negative amount → rejected", async () => {
    seedUser("uC");
    await expect(addCredits("uC", -50)).rejects.toThrow("positive integer");
  });

  it("Case 6 — zero amount → rejected", async () => {
    seedUser("uD");
    seedWallet("uD", 100);
    await expect(removeCredits("uD", 0)).rejects.toThrow("positive integer");
  });

  it("Case 7 — 10 concurrent addCredits(100) → balance = 1000", async () => {
    seedUser("uE");
    seedWallet("uE", 0);

    await Promise.all(
      Array.from({ length: 10 }, () => addCredits("uE", 100, "load"))
    );

    const wallet = [...store.wallets.values()].find((w) => w.userId === "uE");
    expect(wallet!.balance).toBe(1000);
  });

  it("Case 8 — transfer to user without wallet creates destination wallet", async () => {
    seedUser("uSrc");
    seedUser("uDst");
    seedWallet("uSrc", 500);

    const result = await transferCredits("uSrc", "uDst", 200);
    expect(result.fromBalance).toBe(300);
    expect(result.toBalance).toBe(200);
  });
});
