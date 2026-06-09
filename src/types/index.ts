// ── Roles ──────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "reseller" | "support";

export const ROLES: UserRole[] = ["owner", "admin", "reseller", "support"];

// ── User ───────────────────────────────────────────────────────────────────────

export interface User {
  id:        string;
  email:     string;
  username:  string;
  role:      UserRole;
  active:    boolean;
  createdAt: string;
  updatedAt: string;
  creditWallet?: CreditWallet;
}

export interface SessionUser {
  id:       string;
  email:    string;
  username: string;
  role:     UserRole;
}

// ── Credits ────────────────────────────────────────────────────────────────────

export interface CreditWallet {
  id:      string;
  userId:  string;
  balance: number;
}

// ── Products ───────────────────────────────────────────────────────────────────

export interface Product {
  id:          string;
  name:        string;
  slug:        string;
  description?: string;
  price:       number;
  active:      boolean;
  metadata?:   Record<string, unknown>;
  createdAt:   string;
  updatedAt:   string;
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

export interface DiscordChannel {
  id:        string;
  guildId:   string;
  channelId: string;
  name:      string;
  type:      "text" | "voice" | "category";
  active:    boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface VoiceSession {
  id:        string;
  channelId: string;
  userId:    string;
  joinedAt:  string;
  leftAt?:   string;
}

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
