/**
 * tests/helpers/prismaMock.ts
 *
 * Standalone Prisma mock — safe inside vi.mock factories (no external deps).
 * buildMock() always reads/writes the module-level `store`, so the factory
 * singleton and the test's imported `store` share the same data.
 */
import { vi } from "vitest";

// ── Shared in-memory store ─────────────────────────────────────────────────────

export const store = {
  users:        new Map<string, any>(),
  wallets:      new Map<string, any>(),
  creditWallets:new Map<string, any>(),
  txs:          new Map<string, any>(),
  products:     new Map<string, any>(),
  licenses:     new Map<string, any>(),
  sessions:     new Map<string, any>(),
  channels:     new Map<string, any>(),
  rules:        new Map<string, any>(),
  cooldowns:    new Map<string, any>(),
  auditLogs:    new Map<string, any>(),
  settings:     new Map<string, any>(),
};

export function resetStore() {
  Object.values(store).forEach((m) => m.clear());
}

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}`; }

// ── Serialization mutex ────────────────────────────────────────────────────────

class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire() {
    if (!this.locked) { this.locked = true; return; }
    return new Promise<void>((r) => this.queue.push(r));
  }

  release() {
    const next = this.queue.shift();
    if (next) next(); else this.locked = false;
  }
}

const txMutex = new Mutex();

// ── Build prisma mock (always uses module-level `store`) ───────────────────────

export function buildMock() {
  const p: any = {
    $transaction: vi.fn(async (fnOrOps: any, _opts?: any) => {
      if (Array.isArray(fnOrOps)) return Promise.all(fnOrOps);
      // Always serialize function-based transactions to simulate DB isolation
      await txMutex.acquire();
      try   { return await fnOrOps(p); }
      finally { txMutex.release(); }
    }),

    $queryRaw: vi.fn(async () => [{ 1: 1 }]),

    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id)        return store.users.get(where.id) ?? null;
        if (where.email)     return [...store.users.values()].find((u) => u.email     === where.email)     ?? null;
        if (where.discordId) return [...store.users.values()].find((u) => u.discordId === where.discordId) ?? null;
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any = {}) => {
        return [...store.users.values()].find((u) => {
          if (where.role   !== undefined && u.role   !== where.role)   return false;
          if (where.active !== undefined && u.active !== where.active) return false;
          if (where.email  !== undefined && u.email  !== where.email)  return false;
          return true;
        }) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        if ([...store.users.values()].some((u) => u.email === data.email || u.username === data.username)) {
          const e: any = new Error("Unique"); e.code = "P2002"; throw e;
        }
        const u = { id: uid(), active: true, ...data };
        store.users.set(u.id, u);
        return u;
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.users.values()].find((u) =>
          (where.email     && u.email     === where.email)     ||
          (where.discordId && u.discordId === where.discordId) ||
          (where.id        && u.id        === where.id)
        );
        if (existing) { Object.assign(existing, update); return existing; }
        const u = { id: uid(), active: false, ...create };
        store.users.set(u.id, u);
        return u;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const u = store.users.get(where.id);
        if (!u) throw new Error("Not found");
        Object.assign(u, data); return u;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        let items = [...store.users.values()];
        if (where?.role) items = items.filter((u) => u.role === where.role);
        return items;
      }),
    },

    wallet: {
      findUnique: vi.fn(async ({ where }: any) => {
        const w = where.userId
          ? [...store.wallets.values()].find((w) => w.userId === where.userId)
          : store.wallets.get(where.id);
        if (!w) return null;
        return { ...w, transactions: [...store.txs.values()].filter((t) => t.walletId === w.id) };
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.wallets.values()].find((w) => w.userId === where.userId);
        if (existing) { Object.assign(existing, update); return { ...existing, transactions: [] }; }
        const w = { id: uid(), transactions: [], balance: 0, ...create };
        store.wallets.set(w.id, w); return { ...w, transactions: [] };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const w = where.userId
          ? [...store.wallets.values()].find((w) => w.userId === where.userId)
          : store.wallets.get(where.id);
        if (!w) throw new Error("Wallet not found");
        if (data.balance?.increment !== undefined) w.balance += data.balance.increment;
        else if (data.balance?.decrement !== undefined) w.balance -= data.balance.decrement;
        else if (data.balance !== undefined) w.balance = data.balance;
        store.wallets.set(w.id, w); return { ...w };
      }),
      create: vi.fn(async ({ data }: any) => {
        const w = { id: uid(), transactions: [], balance: 0, ...data };
        store.wallets.set(w.id, w); return w;
      }),
    },

    creditTransaction: {
      create: vi.fn(async ({ data }: any) => {
        const tx = { id: uid(), createdAt: new Date(), ...data };
        store.txs.set(tx.id, tx); return tx;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        let items = [...store.txs.values()];
        if (where?.walletId)       items = items.filter((t) => t.walletId === where.walletId);
        if (where?.createdAt?.gte) items = items.filter((t) => t.createdAt >= where.createdAt.gte);
        return items;
      }),
    },

    product: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.slug) return [...store.products.values()].find((p) => p.slug === where.slug) ?? null;
        return store.products.get(where.id) ?? null;
      }),
      findMany:   vi.fn(async () => [...store.products.values()]),
      create: vi.fn(async ({ data }: any) => {
        if ([...store.products.values()].some((p) => p.slug === data.slug)) {
          const e: any = new Error("Unique"); e.code = "P2002"; throw e;
        }
        const p = { id: uid(), ...data };
        store.products.set(p.id, p); return p;
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.products.values()].find((p) => p.slug === where.slug);
        if (existing) { Object.assign(existing, update); return existing; }
        const p = { id: uid(), ...create };
        store.products.set(p.id, p); return p;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const p = store.products.get(where.id);
        if (!p) throw new Error("Not found");
        Object.assign(p, data); return p;
      }),
    },

    license: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.key) return [...store.licenses.values()].find((l) => l.key === where.key) ?? null;
        return store.licenses.get(where.id) ?? null;
      }),
      findMany: vi.fn(async () => [...store.licenses.values()]),
      create: vi.fn(async ({ data }: any) => {
        if ([...store.licenses.values()].some((l) => l.key === data.key)) {
          const e: any = new Error("Unique"); e.code = "P2002"; throw e;
        }
        const l = { id: uid(), status: "active", createdAt: new Date(), updatedAt: new Date(), ...data };
        store.licenses.set(l.id, l);
        return { ...l, product: store.products.get(l.productId) ?? null };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const l = store.licenses.get(where.id);
        if (!l) throw new Error("Not found");
        Object.assign(l, data, { updatedAt: new Date() }); return l;
      }),
      count: vi.fn(async ({ where }: any = {}) => {
        let items = [...store.licenses.values()];
        if (where?.status) items = items.filter((l) => l.status === where.status);
        return items.length;
      }),
    },

    discordGuild: {
      upsert: vi.fn(async ({ create }: any) => ({ id: uid(), ...create })),
    },

    discordChannel: {
      findUnique: vi.fn(async ({ where, include }: any) => {
        const ch = where.channelId
          ? [...store.channels.values()].find((c) => c.channelId === where.channelId)
          : store.channels.get(where.id);
        if (!ch) return null;
        if (include?.voiceRule) {
          const rule = [...store.rules.values()].find((r) => r.channelId === ch.id) ?? null;
          if (rule && include?.voiceRule?.include?.product) {
            (rule as any).product = store.products.get(rule.productId) ?? null;
          }
          return { ...ch, voiceRule: rule };
        }
        return { ...ch };
      }),
      findMany: vi.fn(async () =>
        [...store.channels.values()].map((ch) => ({
          ...ch, voiceRule: [...store.rules.values()].find((r) => r.channelId === ch.id) ?? null,
        }))
      ),
      create: vi.fn(async ({ data }: any) => {
        const ch = { id: uid(), active: true, ...data };
        store.channels.set(ch.id, ch); return ch;
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.channels.values()].find((c) => c.channelId === where.channelId);
        if (existing) { Object.assign(existing, update); return existing; }
        const ch = { id: uid(), active: true, ...create };
        store.channels.set(ch.id, ch); return ch;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const ch = store.channels.get(where.id);
        if (!ch) throw new Error("Not found");
        Object.assign(ch, data); return ch;
      }),
      count: vi.fn(async () => [...store.channels.values()].filter((c) => c.active).length),
    },

    voiceRule: {
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.rules.values()].find((r) => r.channelId === where.channelId);
        if (existing) { Object.assign(existing, update); return existing; }
        const rule = { id: uid(), ...create };
        store.rules.set(rule.id, rule); return rule;
      }),
      create: vi.fn(async ({ data }: any) => {
        const rule = { id: uid(), ...data };
        store.rules.set(rule.id, rule); return rule;
      }),
    },

    voiceSession: {
      findFirst: vi.fn(async ({ where }: any) => {
        return [...store.sessions.values()].find((s) => {
          if (where.channelId     && s.channelId     !== where.channelId)     return false;
          if (where.discordUserId && s.discordUserId !== where.discordUserId) return false;
          if (where.leftAt === null && s.leftAt !== undefined)                return false;
          return true;
        }) ?? null;
      }),
      findMany: vi.fn(async ({ where }: any = {}) =>
        [...store.sessions.values()].filter((s) => {
          if (where?.leftAt === null && s.leftAt !== undefined) return false;
          return true;
        })
      ),
      create: vi.fn(async ({ data }: any) => {
        const s = { id: uid(), joinedAt: new Date(), ...data };
        store.sessions.set(s.id, s);
        return { ...s, channel: store.channels.get(s.channelId), license: s.licenseId ? store.licenses.get(s.licenseId) : null };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const s = store.sessions.get(where.id);
        if (!s) throw new Error("Not found");
        Object.assign(s, data);
        return { ...s, channel: store.channels.get(s.channelId), license: s.licenseId ? store.licenses.get(s.licenseId) : null };
      }),
      count: vi.fn(async ({ where }: any = {}) =>
        [...store.sessions.values()].filter((s) => {
          if (where?.leftAt === null && s.leftAt !== undefined)        return false;
          if (where?.channelId && s.channelId !== where.channelId)    return false;
          if (where?.joinedAt?.gte && s.joinedAt < where.joinedAt.gte) return false;
          return true;
        }).length
      ),
    },

    voiceCooldown: {
      findUnique: vi.fn(async ({ where }: any) => {
        const { channelId, discordUserId } = where.channelId_discordUserId ?? {};
        return [...store.cooldowns.values()].find(
          (c) => c.channelId === channelId && c.discordUserId === discordUserId
        ) ?? null;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        let items = [...store.cooldowns.values()];
        if (where?.expiresAt?.gt) items = items.filter((c) => c.expiresAt > where.expiresAt.gt);
        return items.map((c) => ({ ...c, channel: store.channels.get(c.channelId) ?? null }));
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const { channelId, discordUserId } = where.channelId_discordUserId ?? {};
        const existing = [...store.cooldowns.values()].find(
          (c) => c.channelId === channelId && c.discordUserId === discordUserId
        );
        if (existing) { Object.assign(existing, update); return existing; }
        const cd = { id: uid(), createdAt: new Date(), ...create };
        store.cooldowns.set(cd.id, cd); return cd;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const { channelId, discordUserId } = where.channelId_discordUserId ?? {};
        const entry = [...store.cooldowns.entries()].find(
          ([, c]) => c.channelId === channelId && c.discordUserId === discordUserId
        );
        if (entry) store.cooldowns.delete(entry[0]);
        return entry?.[1] ?? null;
      }),
    },

    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        const log = { id: uid(), createdAt: new Date(), ...data };
        store.auditLogs.set(log.id, log); return log;
      }),
      findMany: vi.fn(async () => [...store.auditLogs.values()]),
    },

    setting: {
      findUnique: vi.fn(async ({ where }: any) => store.settings.get(where.key) ?? null),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = store.settings.get(where.key);
        if (existing) { Object.assign(existing, update); return existing; }
        const s = { id: uid(), ...create };
        store.settings.set(s.key, s); return s;
      }),
    },

    creditWallet: {
      findUnique: vi.fn(async ({ where }: any) =>
        [...store.creditWallets.values()].find((w) => w.userId === where.userId) ?? null
      ),
    },
  };

  return p;
}

// Singleton — the factory returns this same instance
export const prismaMock = buildMock();

// Re-export alias so old imports still work
export { buildMock as buildPrismaMock };
