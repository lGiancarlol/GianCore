import type {
  IProvider,
  ProviderRequest,
  ProviderResponse,
  HealthCheckResult,
  UserProviderActions,
  KeyActionResult,
} from "../types";

export interface TelegramUserProviderConfig {
  /** URL of the telethon-bridge microservice */
  bridgeUrl:       string;
  /** Shared secret for bridge authentication */
  bridgeToken:     string;
  /** Telegram API id (from my.telegram.org) */
  apiId:           number;
  /** Telegram API hash (from my.telegram.org) */
  apiHash:         string;
  /** Telethon StringSession for the user account */
  sessionString:   string;
  /** @username or numeric id of the external bot */
  targetBot:       string;
  /** Command template for license request. Use {ref} placeholder. e.g. "/start {ref}" */
  commandTemplate: string;
  /** Regex with capture group 1 to extract the key from bot reply */
  keyPattern:      string;
  /** Command templates for key management. Use {key} placeholder. */
  commands?: {
    status?:    string;  // e.g. "/status {key}"
    activate?:  string;  // e.g. "/activate {key}"
    deactivate?:string;  // e.g. "/deactivate {key}"
    resetIp?:   string;  // e.g. "/resetip {key}"
  };
  /** Max seconds to wait for bot reply */
  timeoutSecs?: number;
}

/**
 * TelegramUserProvider
 *
 * Uses a real Telegram user account (via Telethon) to interact with
 * external bots. Supports:
 *   - requestLicense   → send command + extract key
 *   - clickButton      → press InlineKeyboardButton + extract key
 *   - queryKey         → check key status
 *   - activateKey      → activate a key
 *   - deactivateKey    → deactivate / revoke a key
 *   - resetIp          → reset IP binding
 *   - healthCheck      → verify bridge is up
 *
 * All heavy lifting is done by the telethon-bridge Python microservice.
 */
export class TelegramUserProvider implements IProvider, UserProviderActions {
  readonly id:   string;
  readonly name: string;
  readonly type = "telegram_user" as const;

  private readonly cfg: TelegramUserProviderConfig;
  private readonly timeout: number;

  constructor(id: string, name: string, config: TelegramUserProviderConfig) {
    this.id      = id;
    this.name    = name;
    this.cfg     = config;
    this.timeout = config.timeoutSecs ?? 45;
  }

  // ── Bridge HTTP client ────────────────────────────────────────────────────

  private get accountPayload() {
    return {
      account_id:     this.id,
      api_id:         this.cfg.apiId,
      api_hash:       this.cfg.apiHash,
      session_string: this.cfg.sessionString,
    };
  }

  private async bridgePost<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.cfg.bridgeUrl}${path}`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${this.cfg.bridgeToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      throw new Error(`Bridge ${path} HTTP ${res.status}: ${txt}`);
    }
    return res.json() as Promise<T>;
  }

  // ── IProvider ─────────────────────────────────────────────────────────────

  async requestLicense(req: ProviderRequest): Promise<ProviderResponse> {
    const command = this.cfg.commandTemplate.replace("{ref}", req.productExternalRef);
    try {
      const result = await this.bridgePost<BridgeOkResponse>("/request-license", {
        account:     this.accountPayload,
        target_bot:  this.cfg.targetBot,
        command,
        key_pattern: this.cfg.keyPattern,
        timeout:     this.timeout,
      });
      return {
        ok:           result.ok,
        key:          result.key   ?? undefined,
        rawResponse:  result.raw_response ?? undefined,
        error:        result.error ?? undefined,
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async revokeLicense(key: string): Promise<{ ok: boolean; error?: string }> {
    return this.deactivateKey(key);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.cfg.bridgeUrl}/health`, {
        headers: { "Authorization": `Bearer ${this.cfg.bridgeToken}` },
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── UserProviderActions ──────────────────────────────────────────────────

  /** Click an InlineKeyboardButton and optionally extract a key from the reply */
  async clickButton(messageId: number, buttonText: string, keyPattern?: string): Promise<KeyActionResult> {
    try {
      const result = await this.bridgePost<BridgeOkResponse>("/click-button", {
        account:     this.accountPayload,
        target_bot:  this.cfg.targetBot,
        message_id:  messageId,
        button_text: buttonText,
        key_pattern: keyPattern ?? null,
        timeout:     this.timeout,
      });
      return { ok: result.ok, key: result.key ?? undefined, raw: result.raw_response ?? undefined, error: result.error ?? undefined };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async queryKey(key: string): Promise<KeyActionResult> {
    return this._keyAction("status", key);
  }

  async activateKey(key: string): Promise<KeyActionResult> {
    return this._keyAction("activate", key);
  }

  async deactivateKey(key: string): Promise<KeyActionResult> {
    return this._keyAction("deactivate", key);
  }

  async resetIp(key: string): Promise<KeyActionResult> {
    return this._keyAction("resetIp", key);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async _keyAction(action: keyof NonNullable<TelegramUserProviderConfig["commands"]>, key: string): Promise<KeyActionResult> {
    const template = this.cfg.commands?.[action];
    if (!template) return { ok: false, error: `Command for '${action}' not configured` };

    const command = template.replace("{key}", key);
    try {
      const result = await this.bridgePost<BridgeOkResponse>("/key-action", {
        account:    this.accountPayload,
        target_bot: this.cfg.targetBot,
        command,
        timeout:    this.timeout,
      });
      return { ok: result.ok, key: result.key ?? undefined, raw: result.raw_response ?? undefined, error: result.error ?? undefined };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

// ── Internal bridge response shape ────────────────────────────────────────────

interface BridgeOkResponse {
  ok:           boolean;
  key?:         string | null;
  raw_response?: string | null;
  error?:       string | null;
}
