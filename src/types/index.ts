// ── Roles ──────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "reseller" | "support" | "pending";

export const ROLES: UserRole[] = ["owner", "admin", "reseller", "support", "pending"];

// ── User ───────────────────────────────────────────────────────────────────────

export interface User {
  id:            string;
  email?:        string;
  username:      string;
  role:          UserRole;
  active:        boolean;
  discordId?:    string;
  discordAvatar?: string;
  createdAt:     string;
  updatedAt:     string;
  creditWallet?: CreditWallet;
  wallet?:       Wallet;
}

export interface SessionUser {
  id:         string;
  email?:     string;
  username:   string;
  role:       UserRole;
  discordId?: string;
  provider?:  string;
  image?:     string;
}

// ── Credits / Wallet ──────────────────────────────────────────────────────────

export interface CreditWallet {
  id:      string;
  userId:  string;
  balance: number;
}

export interface Wallet {
  id:        string;
  userId:    string;
  balance:   number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | "credit_add"
  | "credit_remove"
  | "license_created"
  | "refund"
  | "transfer_in"
  | "transfer_out";

export interface CreditTransaction {
  id:           string;
  walletId:     string;
  amount:       number;
  type:         TransactionType;
  reason?:      string;
  createdById?: string;
  createdAt:    string;
}

export interface WalletWithTransactions extends Wallet {
  transactions: CreditTransaction[];
}

// ── Products ───────────────────────────────────────────────────────────────────

export interface Product {
  id:           string;
  name:         string;
  slug:         string;
  description?: string;
  price:        number;
  active:       boolean;
  metadata?:    Record<string, unknown>;
  createdAt:    string;
  updatedAt:    string;
}

// ── Licenses ───────────────────────────────────────────────────────────────────

export type LicenseStatus = "active" | "inactive" | "expired" | "banned";

export interface License {
  id:        string;
  key:       string;
  userId:    string;
  productId: string;
  status:    LicenseStatus;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  user?:     Pick<User, "id" | "username" | "email">;
  product?:  Pick<Product, "id" | "name" | "slug">;
}

// ── Discord ────────────────────────────────────────────────────────────────────

export interface DiscordGuild {
  id:        string;
  guildId:   string;
  name:      string;
  iconUrl?:  string;
  active:    boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiscordChannel {
  id:        string;
  guildId:   string;
  channelId: string;
  name:      string;
  type:      "text" | "voice" | "category";
  active:    boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  voiceRule?: VoiceRule;
}

export interface VoiceRule {
  id:               string;
  channelId:        string;
  productId:        string;
  enabled:          boolean;
  durationMinutes:  number;
  cooldownSeconds:  number;
  maxPerDay:        number;
  licensePrefix?:   string;
  licenseTemplate?: string;
  createdAt:        string;
  updatedAt:        string;
  product?:         Pick<Product, "id" | "name" | "slug">;
}

export interface VoiceSession {
  id:               string;
  channelId:        string;
  discordUserId:    string;
  discordUsername:  string;
  licenseId?:       string;
  joinedAt:         string;
  leftAt?:          string;
  durationSeconds?: number;
  channel?:         Pick<DiscordChannel, "id" | "name" | "channelId">;
  license?:         Pick<License, "id" | "key" | "status">;
}

export interface VoiceCooldown {
  id:            string;
  channelId:     string;
  discordUserId: string;
  expiresAt:     string;
  createdAt:     string;
  channel?:      Pick<DiscordChannel, "id" | "name">;
}

export interface VoiceStats {
  activeSessions:  number;
  activeLicenses:  number;
  connectedUsers:  number;
  activeChannels:  number;
  totalToday:      number;
  totalAllTime:    number;
}

export type VoiceJoinResult =
  | { ok: true;  session: VoiceSession; license: License }
  | { ok: false; reason: "channel_disabled" | "cooldown" | "daily_limit" | "invalid_channel" | "already_active" };

export type VoiceLeaveResult =
  | { ok: true;  session: VoiceSession }
  | { ok: false; reason: "session_not_found" };

// ── Telegram ───────────────────────────────────────────────────────────────────

export interface TelegramAccount {
  id:         string;
  userId:     string;
  telegramId: string;
  username?:  string;
  active:     boolean;
  createdAt:  string;
}

// ── Integration ────────────────────────────────────────────────────────────────

export interface Integration {
  id:        string;
  name:      string;
  type:      string;
  active:    boolean;
  config:    Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Audit Log ──────────────────────────────────────────────────────────────────

export interface AuditLog {
  id:        string;
  userId?:   string;
  action:    string;
  entity:    string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?:       string;
  createdAt: string;
  user?:     Pick<User, "id" | "username">;
}

// ── Setting ────────────────────────────────────────────────────────────────────

export interface Setting {
  id:    string;
  key:   string;
  value: unknown;
}

// ── API Responses ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?:    T;
  error?:   string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}
