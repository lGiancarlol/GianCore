import type {
  IProvider,
  ProviderRequest,
  ProviderResponse,
  HealthCheckResult,
} from "../types";

export interface TelegramProviderConfig {
  /** Bot token of OUR bot used to message the external bot */
  botToken:     string;
  /** Telegram user/bot id of the EXTERNAL bot that distributes licenses */
  targetBotId:  string;
  /** Command template. Use {ref} as placeholder. e.g. "/generate {ref}" */
  commandTemplate: string;
  /** Regex pattern to extract the key from the bot's reply. e.g. "Key:\\s*(\\S+)" */
  keyPattern:   string;
  /** Max seconds to wait for a reply before giving up (default 30) */
  timeoutSecs?: number;
  /** Optional base URL for Telegram Bot API */
  apiBaseUrl?:  string;
}

/**
 * TelegramProvider V1
 *
 * Sends a command to an external Telegram bot using our bot token,
 * polls for the reply, extracts the license key via regex, and returns it.
 *
 * Flow:
 *   1. sendMessage(targetBotId, command)           → gets sent message id
 *   2. getUpdates(offset, timeout) polling loop    → waits for reply
 *   3. match reply text against keyPattern         → extracts key
 */
export class TelegramProvider implements IProvider {
  readonly id:   string;
  readonly name: string;
  readonly type = "telegram_bot" as const;

  private readonly cfg: TelegramProviderConfig;
  private readonly api: string;
  private readonly timeoutMs: number;

  constructor(id: string, name: string, config: TelegramProviderConfig) {
    this.id        = id;
    this.name      = name;
    this.cfg       = config;
    this.api       = `${config.apiBaseUrl ?? "https://api.telegram.org"}/bot${config.botToken}`;
    this.timeoutMs = (config.timeoutSecs ?? 30) * 1000;
  }

  // ── Telegram API helpers ───────────────────────────────────────────────────

  private async tgPost<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.api}/${method}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const json = await res.json() as { ok: boolean; result: T; description?: string };
    if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
    return json.result;
  }

  /** Send a message and return the sent message_id */
  private async sendCommand(command: string): Promise<number> {
    const msg = await this.tgPost<{ message_id: number }>("sendMessage", {
      chat_id: this.cfg.targetBotId,
      text:    command,
    });
    return msg.message_id;
  }

  /** Poll getUpdates until a message from targetBotId arrives after sentMsgId */
  private async pollForReply(afterMsgId: number, deadline: number): Promise<string | null> {
    let offset = 0;
    while (Date.now() < deadline) {
      const updates = await this.tgPost<TgUpdate[]>("getUpdates", {
        offset,
        timeout:   5,
        allowed_updates: ["message"],
      });

      for (const u of updates) {
        offset = u.update_id + 1;
        const msg = u.message;
        if (!msg) continue;
        const fromId = String(msg.from?.id ?? msg.chat?.id ?? "");
        // Accept reply from the target bot that arrived after our command
        if (fromId === String(this.cfg.targetBotId) && msg.message_id > afterMsgId) {
          return msg.text ?? null;
        }
      }

      // Small pause between polls to avoid hammering
      await sleep(1000);
    }
    return null;
  }

  /** Extract the license key from the bot's reply text using keyPattern */
  private extractKey(text: string): string | null {
    const re = new RegExp(this.cfg.keyPattern, "i");
    const m  = text.match(re);
    return m?.[1] ?? null;
  }

  // ── IProvider ──────────────────────────────────────────────────────────────

  async requestLicense(req: ProviderRequest): Promise<ProviderResponse> {
    const command  = this.cfg.commandTemplate.replace("{ref}", req.productExternalRef);
    const deadline = Date.now() + this.timeoutMs;

    try {
      const sentMsgId = await this.sendCommand(command);
      const reply     = await this.pollForReply(sentMsgId, deadline);

      if (!reply) {
        return { ok: false, error: "Timeout: no reply from provider bot" };
      }

      const key = this.extractKey(reply);
      if (!key) {
        return { ok: false, error: `Key not found in reply: ${reply.slice(0, 120)}`, rawResponse: reply };
      }

      return { ok: true, key, rawResponse: reply };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async revokeLicense(_key: string): Promise<{ ok: boolean; error?: string }> {
    // Revocation via Telegram bots is provider-specific — not standardized yet
    return { ok: false, error: "revokeLicense not implemented for TelegramProvider" };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.tgPost("getMe", {});
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

// ── Internal types ─────────────────────────────────────────────────────────────

interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?:      string;
    from?:      { id: number };
    chat?:      { id: number };
  };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
