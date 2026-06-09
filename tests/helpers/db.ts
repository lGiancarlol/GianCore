/**
 * tests/helpers/db.ts
 *
 * In-memory mock of PrismaClient for unit/concurrency tests.
 * Simulates the data store with Maps so tests run without a real DB.
 * The mock enforces unique constraints and implements $transaction.
 */
import { vi } from "vitest";

// ── In-memory stores ───────────────────────────────────────────────────────────

export interface MockUser    { id: string; email: string; username: string; passwordHash: string; role: string; active: boolean; discordId?: string; discordAvatar?: string; wallet?: MockWallet; creditWallet?: MockCreditWallet; }
export interface MockWallet  { id: string; userId: string; balance: number; transactions: MockTx[]; }
export interface MockCreditWallet { id: string; userId: string; balance: number; }
export interface MockTx      { id: string; walletId: string; amount: number; type: string; reason?: string; createdById?: string; createdAt: Date; }
export interface MockProduct { id: string; name: string; slug: string; price: number; active: boolean; description?: string; }
export interface MockLicense { id: string; key: string; productId: string; userId: string; status: string; expiresAt?: Date; metadata?: Record<string, unknown>; createdAt: Date; updatedAt: Date; product?: MockProduct; }
export interface MockSession { id: string; channelId: string; discordUserId: string; discordUsername: string; licenseId?: string; joinedAt: Date; leftAt?: Date; durationSeconds?: number; license?: MockLicense; channel?: MockChannel; }
export interface MockChannel { id: string; guildId: string; channelId: string; name: string; type: string; active: boolean; voiceRule?: MockVoiceRule; }
export interface MockVoiceRule { id: string; channelId: string; productId: string; enabled: boolean; durationMinutes: number; cooldownSeconds: number; maxPerDay: number; licensePrefix?: string; product?: MockProduct; }
export interface MockCooldown { id: string; channelId: string; discordUserId: string; expiresAt: Date; createdAt: Date; channel?: MockChannel; }
export interface MockAuditLog { id: string; userId?: string; action: string; entity: string; entityId?: string; metadata?: unknown; ip?: string; createdAt: Date; }

export const store = {
  users:    new Map<string, MockUser>(),
  wallets:  new Map<string, MockWallet>(),
  creditWallets: new Map<string, MockCreditWallet>(),
  txs:      new Map<string, MockTx>(),
  products: new Map<string, MockProduct>(),
  licenses: new Map<string, MockLicense>(),
  sessions: new Map<string, MockSession>(),
  channels: new Map<string, MockChannel>(),
  rules:    new Map<string, MockVoiceRule>(),
  cooldowns: new Map<string, MockCooldown>(),
  auditLogs: new Map<string, MockAuditLog>(),
  settings: new Map<string, { key: string; value: unknown }>(),
};

export function resetStore() {
  Object.values(store).forEach((m) => m.clear());
}

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── Mutex for simulating serializable transactions ─────────────────────────────
// A simple async lock so concurrent transaction calls are serialized
// (same guarantee as DB serializable isolation)

class AsyncMutex {
  private _queue: Array<() => void> = [];
  private _locked = false;

  async acquire(): Promise<void> {
    if (!this._locked) { this._locked = true; return; }
    return new Promise((resolve) => this._queue.push(resolve));
  }

  release(): void {
    const next = this._queue.shift();
    if (next) { next(); } else { this._locked = false; }
  }
}

const txMutex = new AsyncMutex();

// ── Build the prisma mock ──────────────────────────────────────────────────────

export function buildPrismaMock() {
  const prisma = {
    // ── $transaction ──────────────────────────────────────────────────────────
    $transaction: vi.fn(async (fnOrOps: any, opts?: any) => {
      // Sequential array of operations
      if (Array.isArray(fnOrOps)) return Promise.all(fnOrOps);

      // Serializable function — acquire mutex to simulate serialized access
      const isSerializable = opts?.isolationLevel === "Serializable";
      if (isSerializable) await txMutex.acquire();
      try {
        return await fnOrOps(prisma);
      } finally {
        if (isSerializable) txMutex.release();
      }
    }),

    $queryRaw: vi.fn(async () => [{ "1": 1 }]),

    // ── user ──────────────────────────────────────────────────────────────────
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.email)     return [...store.users.values()].find((u) => u.email     === where.email)     ?? null;
        if (where.discordId) return [...store.users.values()].find((u) => u.discordId === where.discordId) ?? null;
        if (where.id)        return store.users.get(where.id) ?? null;
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return [...store.users.values()].find((u) => {
          if (where.role   && u.role   !== where.role)   return false;
          if (where.active !== undefined && u.active !== where.active) return false;
          if (where.email  && u.email  !== where.email)  return false;
          return true;
        }) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        if ([...store.users.values()].some((u) => u.email === data.email || u.username === data.username)) {
          const err: any = new Error("Unique constraint"); err.code = "P2002"; throw err;
        }
        const user: MockUser = { id: uid(), active: true, ...data };
        store.users.set(user.id, user);
        return user;
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.users.values()].find((u) =>
          (where.email && u.email === where.email) ||
          (where.discordId && u.discordId === where.discordId) ||
          (where.id && u.id === where.id)
        );
        if (existing) { Object.assign(existing, update); return existing; }
        const user: MockUser = { id: uid(), active: false, ...create };
        store.users.set(user.id, user);
        return user;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const user = store.users.get(where.id);
        if (!user) throw new Error("User not found");
        Object.assign(user, data);
        return user;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        let users = [...store.users.values()];
        if (where?.role) users = users.filter((u) => u.role === where.role);
        return users;
      }),
    },

    // ── wallet ────────────────────────────────────────────────────────────────
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
        const w: MockWallet = { id: uid(), transactions: [], ...create };
        store.wallets.set(w.id, w);
        return { ...w, transactions: [] };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const w = where.userId
          ? [...store.wallets.values()].find((w) => w.userId === where.userId)
          : store.wallets.get(where.id);
        if (!w) throw new Error("Wallet not found");
        if (data.balance?.increment !== undefined) w.balance += data.balance.increment;
        else if (data.balance?.decrement !== undefined) w.balance -= data.balance.decrement;
        else if (data.balance !== undefined) w.balance = data.balance;
        store.wallets.set(w.id, w);
        return { ...w };
      }),
      create: vi.fn(async ({ data }: any) => {
        const w: MockWallet = { id: uid(), transactions: [], balance: 0, ...data };
        store.wallets.set(w.id, w);
        return w;
      }),
    },

    // ── creditTransaction ─────────────────────────────────────────────────────
    creditTransaction: {
      create: vi.fn(async ({ data }: any) => {
        const tx: MockTx = { id: uid(), createdAt: new Date(), ...data };
        store.txs.set(tx.id, tx);
        return tx;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        let txs = [...store.txs.values()];
        if (where?.walletId) txs = txs.filter((t) => t.walletId === where.walletId);
        if (where?.createdAt?.gte) txs = txs.filter((t) => t.createdAt >= where.createdAt.gte);
        return txs;
      }),
    },

    // ── product ───────────────────────────────────────────────────────────────
    product: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.slug) return [...store.products.values()].find((p) => p.slug === where.slug) ?? null;
        return store.products.get(where.id) ?? null;
      }),
      findMany:   vi.fn(async () => [...store.products.values()]),
      create:     vi.fn(async ({ data }: any) => {
        if ([...store.products.values()].some((p) => p.slug === data.slug)) {
          const err: any = new Error("Unique"); err.code = "P2002"; throw err;
        }
        const p: MockProduct = { id: uid(), ...data };
        store.products.set(p.id, p);
        return p;
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.products.values()].find((p) => p.slug === where.slug);
        if (existing) { Object.assign(existing, update); return existing; }
        const p: MockProduct = { id: uid(), ...create };
        store.products.set(p.id, p);
        return p;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const p = store.products.get(where.id);
        if (!p) throw new Error("Product not found");
        Object.assign(p, data);
        return p;
      }),
    },

    // ── license ───────────────────────────────────────────────────────────────
    license: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.key) return [...store.licenses.values()].find((l) => l.key === where.key) ?? null;
        return store.licenses.get(where.id) ?? null;
      }),
      findMany: vi.fn(async () => [...store.licenses.values()]),
      create:   vi.fn(async ({ data }: any) => {
        if ([...store.licenses.values()].some((l) => l.key === data.key)) {
          const err: any = new Error("Unique"); err.code = "P2002"; throw err;
        }
        const l: MockLicense = { id: uid(), status: "active", createdAt: new Date(), updatedAt: new Date(), ...data };
        store.licenses.set(l.id, l);
        const product = store.products.get(l.productId);
        return { ...l, product };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const l = store.licenses.get(where.id);
        if (!l) throw new Error("License not found");
        Object.assign(l, data, { updatedAt: new Date() });
        return l;
      }),
      count: vi.fn(async ({ where }: any = {}) => {
        let items = [...store.licenses.values()];
        if (where?.status) items = items.filter((l) => l.status === where.status);
        return items.length;
      }),
    },

    // ── discordGuild ──────────────────────────────────────────────────────────
    discordGuild: {
      upsert: vi.fn(async ({ where, create }: any) => {
        return { id: uid(), ...create };
      }),
    },

    // ── discordChannel ────────────────────────────────────────────────────────
    discordChannel: {
      findUnique: vi.fn(async ({ where, include }: any) => {
        const ch = where.channelId
          ? [...store.channels.values()].find((c) => c.channelId === where.channelId)
          : store.channels.get(where.id);
        if (!ch) return null;
        if (include?.voiceRule) {
          const rule = [...store.rules.values()].find((r) => r.channelId === ch.id);
          if (rule && include.voiceRule?.include?.product) {
            (rule as any).product = store.products.get(rule.productId) ?? null;
          }
          return { ...ch, voiceRule: rule ?? null };
        }
        return { ...ch };
      }),
      findMany: vi.fn(async () => {
        return [...store.channels.values()].map((ch) => ({
          ...ch,
          voiceRule: [...store.rules.values()].find((r) => r.channelId === ch.id) ?? null,
        }));
      }),
      create: vi.fn(async ({ data }: any) => {
        const ch: MockChannel = { id: uid(), active: true, ...data };
        store.channels.set(ch.id, ch);
        return ch;
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.channels.values()].find((c) => c.channelId === where.channelId);
        if (existing) { Object.assign(existing, update); return existing; }
        const ch: MockChannel = { id: uid(), active: true, ...create };
        store.channels.set(ch.id, ch);
        return ch;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const ch = store.channels.get(where.id);
        if (!ch) throw new Error("Channel not found");
        Object.assign(ch, data);
        return ch;
      }),
      count: vi.fn(async () => [...store.channels.values()].filter((c) => c.active).length),
    },

    // ── voiceRule ─────────────────────────────────────────────────────────────
    voiceRule: {
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = [...store.rules.values()].find((r) => r.channelId === where.channelId);
        if (existing) { Object.assign(existing, update); return existing; }
        const rule: MockVoiceRule = { id: uid(), ...create };
        store.rules.set(rule.id, rule);
        return rule;
      }),
      create: vi.fn(async ({ data }: any) => {
        const rule: MockVoiceRule = { id: uid(), ...data };
        store.rules.set(rule.id, rule);
        return rule;
      }),
    },

    // ── voiceSession ──────────────────────────────────────────────────────────
    voiceSession: {
      findFirst: vi.fn(async ({ where }: any) => {
        return [...store.sessions.values()].find((s) => {
          if (where.channelId     && s.channelId     !== where.channelId)     return false;
          if (where.discordUserId && s.discordUserId !== where.discordUserId) return false;
          if (where.leftAt === null && s.leftAt !== undefined)                return false;
          return true;
        }) ?? null;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        return [...store.sessions.values()].filter((s) => {
          if (where?.leftAt === null && s.leftAt !== undefined) return false;
          return true;
        });
      }),
      create: vi.fn(async ({ data, include }: any) => {
        const s: MockSession = { id: uid(), joinedAt: new Date(), ...data };
        store.sessions.set(s.id, s);
        const channel = store.channels.get(s.channelId);
        const license = s.licenseId ? store.licenses.get(s.licenseId) : undefined;
        return { ...s, channel, license };
      }),
      update: vi.fn(async ({ where, data, include }: any) => {
        const s = store.sessions.get(where.id);
        if (!s) throw new Error("Session not found");
        Object.assign(s, data);
        const channel = store.channels.get(s.channelId);
        const license = s.licenseId ? store.licenses.get(s.licenseId) : undefined;
        return { ...s, channel, license };
      }),
      count: vi.fn(async ({ where }: any = {}) => {
        return [...store.sessions.values()].filter((s) => {
          if (where?.leftAt === null && s.leftAt !== undefined)   return false;
          if (where?.channelId && s.channelId !== where.channelId) return false;
          if (where?.joinedAt?.gte && s.joinedAt < where.joinedAt.gte) return false;
          return true;
        }).length;
      }),
    },

    // ── voiceCooldown ─────────────────────────────────────────────────────────
    voiceCooldown: {
      findUnique: vi.fn(async ({ where }: any) => {
        const key = `${where.channelId_discordUserId?.channelId}:${where.channelId_discordUserId?.discordUserId}`;
        return [...store.cooldowns.values()].find(
          (c) => `${c.channelId}:${c.discordUserId}` === key
        ) ?? null;
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        let items = [...store.cooldowns.values()];
        if (where?.expiresAt?.gt) items = items.filter((c) => c.expiresAt > where.expiresAt.gt);
        return items.map((c) => ({ ...c, channel: store.channels.get(c.channelId) ?? null }));
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const key = `${where.channelId_discordUserId?.channelId}:${where.channelId_discordUserId?.discordUserId}`;
        const existing = [...store.cooldowns.values()].find(
          (c) => `${c.channelId}:${c.discordUserId}` === key
        );
        if (existing) { Object.assign(existing, update); return existing; }
        const cd: MockCooldown = { id: uid(), createdAt: new Date(), ...create };
        store.cooldowns.set(cd.id, cd);
        return cd;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const key = `${where.channelId_discordUserId?.channelId}:${where.channelId_discordUserId?.discordUserId}`;
        const found = [...store.cooldowns.entries()].find(
          ([, c]) => `${c.channelId}:${c.discordUserId}` === key
        );
        if (found) store.cooldowns.delete(found[0]);
        return found?.[1] ?? null;
      }),
    },

    // ── auditLog ──────────────────────────────────────────────────────────────
    auditLog: {
      create:   vi.fn(async ({ data }: any) => {
        const log: MockAuditLog = { id: uid(), createdAt: new Date(), ...data };
        store.auditLogs.set(log.id, log);
        return log;
      }),
      findMany: vi.fn(async () => [...store.auditLogs.values()]),
    },

    // ── setting ───────────────────────────────────────────────────────────────
    setting: {
      findUnique: vi.fn(async ({ where }: any) =>
        store.settings.get(where.key) ?? null
      ),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const existing = store.settings.get(where.key);
        if (existing) { Object.assign(existing, update); return existing; }
        const s = { id: uid(), ...create };
        store.settings.set(s.key, s);
        return s;
      }),
    },

    // ── creditWallet ──────────────────────────────────────────────────────────
    creditWallet: {
      findUnique: vi.fn(async ({ where }: any) =>
        [...store.creditWallets.values()].find((w) => w.userId === where.userId) ?? null
      ),
    },
  };

  return prisma;
}

export type PrismaMock = ReturnType<typeof buildPrismaMock>;
