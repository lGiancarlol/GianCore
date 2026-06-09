import axios, { AxiosError } from "axios";
import { config } from "../config";
import { logger, LOG_CTX } from "../config/logger";
import type {
  VoiceJoinResponse,
  VoiceLeaveResponse,
  VoiceChannel,
  VoiceStats,
} from "../types";

// ── Axios instance ─────────────────────────────────────────────────────────────

export const http = axios.create({
  baseURL: config.api.url,
  timeout: 10_000,
  headers: {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${config.api.token}`,
  },
});

// ── Error helpers ──────────────────────────────────────────────────────────────

export interface ApiFailure {
  ok:     false;
  reason: string;
  status: number;
}

function extractError(err: unknown): { reason: string; status: number } {
  if (err instanceof AxiosError) {
    return {
      reason: err.response?.data?.error ?? err.message,
      status: err.response?.status ?? 500,
    };
  }
  return { reason: String(err), status: 500 };
}

function logApiError(operation: string, payload: unknown, err: unknown) {
  const { reason, status } = extractError(err);
  logger.error(LOG_CTX.API_ERROR, `${operation} failed`, { payload, reason, status });
  return { reason, status };
}

// ── Connectivity check ─────────────────────────────────────────────────────────

export async function checkApiConnectivity(): Promise<boolean> {
  try {
    await http.get("/api/voice/stats");
    return true;
  } catch {
    return false;
  }
}

// ── Heartbeat ──────────────────────────────────────────────────────────────────

export async function sendHeartbeat(meta: {
  uptime:   number;
  guilds:   number;
  sessions: number;
}): Promise<boolean> {
  try {
    await http.post("/api/integrations/discord/heartbeat", {
      status: "online",
      ...meta,
      timestamp: new Date().toISOString(),
    });
    logger.debug(LOG_CTX.HEARTBEAT, "Heartbeat sent", meta);
    return true;
  } catch (err) {
    const { reason, status } = extractError(err);
    logger.warn(LOG_CTX.HEARTBEAT, "Heartbeat failed", { reason, status });
    return false;
  }
}

// ── Voice join ─────────────────────────────────────────────────────────────────

export async function voiceJoin(payload: {
  channelId: string;
  userId:    string;
  username:  string;
}): Promise<{ ok: true; data: VoiceJoinResponse } | ApiFailure> {
  try {
    const res = await http.post<{ data: VoiceJoinResponse }>("/api/voice/join", {
      channelId: payload.channelId,
      userId:    payload.userId,
      username:  payload.username,
    });
    return { ok: true, data: res.data.data };
  } catch (err) {
    const { reason, status } = logApiError("voiceJoin", payload, err);
    return { ok: false, reason, status };
  }
}

// ── Voice leave ────────────────────────────────────────────────────────────────

export async function voiceLeave(payload: {
  channelId: string;
  userId:    string;
}): Promise<{ ok: true; data: VoiceLeaveResponse } | ApiFailure> {
  try {
    const res = await http.post<{ data: VoiceLeaveResponse }>("/api/voice/leave", {
      channelId: payload.channelId,
      userId:    payload.userId,
    });
    return { ok: true, data: res.data.data };
  } catch (err) {
    const { reason, status } = logApiError("voiceLeave", payload, err);
    return { ok: false, reason, status };
  }
}

// ── Voice channels ─────────────────────────────────────────────────────────────

export async function getVoiceChannels(): Promise<VoiceChannel[]> {
  try {
    const res = await http.get<{ data: VoiceChannel[] }>("/api/voice/channels");
    return res.data.data ?? [];
  } catch (err) {
    logApiError("getVoiceChannels", {}, err);
    return [];
  }
}

export async function createVoiceChannel(payload: {
  guildId:         string;
  channelId:       string;
  name:            string;
  productId:       string;
  durationMinutes: number;
  cooldownSeconds: number;
  maxPerDay:       number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await http.post("/api/voice/channels", payload);
    return { ok: true };
  } catch (err) {
    const { reason } = extractError(err);
    return { ok: false, error: reason };
  }
}

export async function updateVoiceChannelRule(payload: {
  id:               string;
  durationMinutes?: number;
  cooldownSeconds?: number;
  maxPerDay?:       number;
  enabled?:         boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await http.patch("/api/voice/channels", payload);
    return { ok: true };
  } catch (err) {
    const { reason } = extractError(err);
    return { ok: false, error: reason };
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────────

export async function getVoiceStats(): Promise<VoiceStats | null> {
  try {
    const res = await http.get<{ data: { stats: VoiceStats } }>("/api/voice/stats");
    return res.data.data.stats;
  } catch (err) {
    logApiError("getVoiceStats", {}, err);
    return null;
  }
}
