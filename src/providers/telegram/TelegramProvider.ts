import type {
  IProvider,
  ProviderRequest,
  ProviderResponse,
  HealthCheckResult,
} from "../types";

export interface TelegramProviderConfig {
  // Bot token of the external Telegram bot that distributes licenses
  botToken:   string;
  // Telegram chat/group id where license requests are sent
  chatId:     string;
  // Optional base URL for Telegram Bot API (useful for local/test servers)
  apiBaseUrl?: string;
}

/**
 * TelegramProvider
 *
 * Base implementation for external Telegram bot providers.
 * Automation is NOT implemented yet — this class defines the contract
 * and connection config needed to do so later.
 */
export class TelegramProvider implements IProvider {
  readonly id:   string;
  readonly name: string;
  readonly type = "telegram_bot" as const;

  private readonly config: TelegramProviderConfig;
  private readonly apiBase: string;

  constructor(id: string, name: string, config: TelegramProviderConfig) {
    this.id      = id;
    this.name    = name;
    this.config  = config;
    this.apiBase = config.apiBaseUrl ?? "https://api.telegram.org";
  }

  // Not automated yet — returns a not_implemented response.
  // Will be replaced with actual bot interaction logic.
  async requestLicense(_req: ProviderRequest): Promise<ProviderResponse> {
    return {
      ok:    false,
      error: "TelegramProvider.requestLicense: automation not implemented yet",
    };
  }

  // Not automated yet.
  async revokeLicense(_key: string): Promise<{ ok: boolean; error?: string }> {
    return {
      ok:    false,
      error: "TelegramProvider.revokeLicense: automation not implemented yet",
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const url = `${this.apiBase}/bot${this.config.botToken}/getMe`;
      const res = await fetch(url);
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok:    false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
