/**
 * tests/voice/concurrency.test.ts
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

const { createVoiceSession, closeVoiceSession } = await import("@/services/voiceService");

// ── Helpers ────────────────────────────────────────────────────────────────────

function setupChannel(opts: { maxPerDay?: number; cooldownSeconds?: number } = {}) {
  const productId  = "prod_1";
  const channelId  = "ch_discord_1";
  const internalId = "ch_internal_1";

  store.products.set(productId, {
    id: productId, name: "Test Product", slug: "test", price: 10, active: true,
  });
  store.channels.set(internalId, {
    id: internalId, guildId: "g1", channelId,
    name: "Test Voice", type: "voice", active: true,
  });
  store.rules.set("rule_1", {
    id: "rule_1", channelId: internalId, productId, enabled: true,
    durationMinutes: 60,
    cooldownSeconds: opts.cooldownSeconds ?? 0,
    maxPerDay:       opts.maxPerDay       ?? 100,
  });
  return { channelId, internalId };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Voice Engine — Concurrency", () => {

  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("Case 1 — 10 simultaneous joins same user → exactly 1 success, 9 rejections", async () => {
    const { channelId } = setupChannel();

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        createVoiceSession(channelId, "user_123", "TestUser")
      )
    );

    const fulfilled  = results.filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled");
    const successes  = fulfilled.filter((r) => r.value.ok === true);
    const rejections = fulfilled.filter((r) => r.value.ok === false);

    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(9);
    rejections.forEach((r) => expect(r.value.reason).toBe("already_active"));

    const active = [...store.sessions.values()].filter((s) => !s.leftAt);
    expect(active.length).toBe(1);
    expect(store.licenses.size).toBe(1);
  });

  it("Case 2 — 20 simultaneous joins same user → never more than 1 active session", async () => {
    const { channelId } = setupChannel();

    await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        createVoiceSession(channelId, "user_456", "TestUser2")
      )
    );

    const active = [...store.sessions.values()].filter((s) => !s.leftAt);
    expect(active.length).toBeLessThanOrEqual(1);
    expect(store.licenses.size).toBeLessThanOrEqual(1);
  });

  it("Case 3 — 10 different users join simultaneously → each gets 1 session", async () => {
    const { channelId } = setupChannel();

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        createVoiceSession(channelId, `user_${i}`, `User${i}`)
      )
    );

    const successes = (results.filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled"))
      .filter((r) => r.value.ok === true);

    expect(successes.length).toBe(10);
    expect(store.sessions.size).toBe(10);
    expect(store.licenses.size).toBe(10);
  });

  it("Case 4 — active cooldown → join rejected with reason=cooldown (HTTP 429)", async () => {
    const { channelId, internalId } = setupChannel({ cooldownSeconds: 300 });

    const join1 = await createVoiceSession(channelId, "user_cool", "CoolUser");
    expect(join1.ok).toBe(true);

    await closeVoiceSession(channelId, "user_cool");

    const cooldown = [...store.cooldowns.values()].find(
      (c) => c.channelId === internalId && c.discordUserId === "user_cool"
    );
    expect(cooldown).toBeDefined();
    expect(cooldown!.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const join2 = await createVoiceSession(channelId, "user_cool", "CoolUser");
    expect(join2.ok).toBe(false);
    expect((join2 as any).reason).toBe("cooldown");
  });

  it("Case 5 — daily limit of 3 → 4th user rejected with reason=daily_limit (HTTP 429)", async () => {
    const { channelId } = setupChannel({ maxPerDay: 3 });

    for (let i = 0; i < 3; i++) {
      const j = await createVoiceSession(channelId, `day_${i}`, `DayUser${i}`);
      expect(j.ok).toBe(true);
      await closeVoiceSession(channelId, `day_${i}`);
    }

    const overflow = await createVoiceSession(channelId, "day_overflow", "OverflowUser");
    expect(overflow.ok).toBe(false);
    expect((overflow as any).reason).toBe("daily_limit");
  });

  it("Case 6 — non-existent channel → invalid_channel", async () => {
    setupChannel();
    const result = await createVoiceSession("bad_channel", "user_x", "UserX");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe("invalid_channel");
  });

  it("Case 7 — rejoin after leave with no cooldown → allowed", async () => {
    const { channelId } = setupChannel({ cooldownSeconds: 0 });

    const j1 = await createVoiceSession(channelId, "user_rj", "Rejoin");
    expect(j1.ok).toBe(true);
    await closeVoiceSession(channelId, "user_rj");

    const j2 = await createVoiceSession(channelId, "user_rj", "Rejoin");
    expect(j2.ok).toBe(true);
  });

  it("Case 8 — license deactivated on leave", async () => {
    const { channelId } = setupChannel();

    const join = await createVoiceSession(channelId, "user_lic", "LicUser");
    expect(join.ok).toBe(true);
    const licenseId = (join as any).license.id;

    await closeVoiceSession(channelId, "user_lic");
    expect(store.licenses.get(licenseId)?.status).toBe("inactive");
  });
});
