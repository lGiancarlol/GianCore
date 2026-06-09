import { config } from "../config";

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const COLORS: Record<Level, string> = {
  debug: "\x1b[36m",  // cyan
  info:  "\x1b[32m",  // green
  warn:  "\x1b[33m",  // yellow
  error: "\x1b[31m",  // red
};
const RESET = "\x1b[0m";

function pad(n: number, digits = 2) {
  return String(n).padStart(digits, "0");
}

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function log(level: Level, context: string, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[config.logLevel]) return;

  const color  = COLORS[level];
  const prefix = `${RESET}[${timestamp()}] ${color}${level.toUpperCase().padEnd(5)}${RESET} [${context}]`;
  const metaStr = meta ? " " + JSON.stringify(meta) : "";

  (level === "error" ? console.error : console.log)(`${prefix} ${message}${metaStr}`);
}

// ── Named contexts ─────────────────────────────────────────────────────────────

export const LOG_CTX = {
  VOICE_JOIN:           "VOICE_JOIN",
  VOICE_LEAVE:          "VOICE_LEAVE",
  LICENSE_CREATED:      "LICENSE_CREATED",
  LICENSE_DEACTIVATED:  "LICENSE_DEACTIVATED",
  API_ERROR:            "API_ERROR",
  HEARTBEAT:            "HEARTBEAT",
  BOT:                  "BOT",
  CLIENT:               "CLIENT",
} as const;

export const logger = {
  debug: (ctx: string, msg: string, meta?: Record<string, unknown>) => log("debug", ctx, msg, meta),
  info:  (ctx: string, msg: string, meta?: Record<string, unknown>) => log("info",  ctx, msg, meta),
  warn:  (ctx: string, msg: string, meta?: Record<string, unknown>) => log("warn",  ctx, msg, meta),
  error: (ctx: string, msg: string, meta?: Record<string, unknown>) => log("error", ctx, msg, meta),
};
