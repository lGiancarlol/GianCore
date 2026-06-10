// ── Provider Engine – Core Interfaces ─────────────────────────────────────────

export type ProviderType = "telegram_bot" | "telegram_user" | "keyauth" | "auth_panel" | "rest_api";

export interface ProviderRequest {
  productExternalRef: string;
  userId:             string;
  metadata?:          Record<string, unknown>;
}

export interface ProviderResponse {
  ok:           boolean;
  key?:         string;
  expiresAt?:   Date;
  rawResponse?: unknown;
  error?:       string;
}

export interface HealthCheckResult {
  ok:         boolean;
  latencyMs?: number;
  error?:     string;
}

export interface KeyActionResult {
  ok:     boolean;
  key?:   string;
  raw?:   string;
  error?: string;
}

// Every provider must implement this interface
export interface IProvider {
  readonly id:   string;
  readonly name: string;
  readonly type: ProviderType;

  requestLicense(req: ProviderRequest): Promise<ProviderResponse>;
  revokeLicense(key: string):           Promise<{ ok: boolean; error?: string }>;
  healthCheck():                        Promise<HealthCheckResult>;
}

// Optional extended interface for user-account providers (Telethon)
export interface UserProviderActions {
  clickButton(messageId: number, buttonText: string, keyPattern?: string): Promise<KeyActionResult>;
  queryKey(key: string):      Promise<KeyActionResult>;
  activateKey(key: string):   Promise<KeyActionResult>;
  deactivateKey(key: string): Promise<KeyActionResult>;
  resetIp(key: string):       Promise<KeyActionResult>;
}
