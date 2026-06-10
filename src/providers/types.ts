// ── Provider Engine – Core Interfaces ─────────────────────────────────────────

export type ProviderType = "telegram_bot" | "keyauth" | "auth_panel" | "rest_api";

export interface ProviderRequest {
  productExternalRef: string; // identifier the provider uses for the product
  userId:             string; // GianCore user id
  metadata?:          Record<string, unknown>;
}

export interface ProviderResponse {
  ok:           boolean;
  key?:         string;   // license key returned by the provider
  expiresAt?:   Date;
  rawResponse?: unknown;  // original provider payload
  error?:       string;
}

export interface HealthCheckResult {
  ok:         boolean;
  latencyMs?: number;
  error?:     string;
}

// Every provider must implement this interface
export interface IProvider {
  readonly id:   string; // matches Provider.id in DB
  readonly name: string;
  readonly type: ProviderType;

  requestLicense(req: ProviderRequest): Promise<ProviderResponse>;
  revokeLicense(key: string):           Promise<{ ok: boolean; error?: string }>;
  healthCheck():                        Promise<HealthCheckResult>;
}
