import axios, { AxiosError } from "axios";
import { config } from "../config";
import { logger } from "../config/logger";
import type {
  VoiceJoinResponse,
  VoiceLeaveResponse,
  VoiceChannel,
  VoiceStats,
} from "../types";

// ── Axios instance ─────────────────────────────────────────────────────────────

const http = axios.create({
  baseURL: config.api.url,
  timeout: 10_000,
  headers: {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${config.api.token}`,
  },
});

// ── Error helper ───────────────────────────────────────────────────────────────

function apiError(err: unknown): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error ?? err.message;
  }
  return String(err);
}

// ── Voice endpoints ────────────────────────────────────────────────────────────

export async function voiceJoin(payload: {
  channelId:       string;
  userId:          string;
  username:        string;
}): Promise<{ ok: true; data: VoiceJoinResponse } | { ok: false; reason: string; status: number }> {
  try {
    const res = await http.post<{ data: VoiceJoinResponse }>("/api/voice/join", {
      channelId: payload.channelId,
      userId:    payload.userId,
      username:  payload.username,
    });
    return { ok: true, data: res.data.data };
  } catch (err) {
    const status = err instanceof AxiosError ? (err.response?.status ?? 500) : 500;
    const reason = apiError(err);
    logger.warn("ApiService", "voiceJoin failed", { payload, reason, status });
    return { ok: false, reason, status };
  }
}

export async function voiceLeave(payload: {
  channelId: string;
  userId:    string;
}): Promise<{ ok: true; data: VoiceLeaveResponse } | { ok: false; reason: string }> {
  try {
    const res = await http.post<{ data: VoiceLeaveResponse }>("/api/voice/leave", {
      channelId: payload.channelId,
      userId:    payload.userId,
    });
    return { ok: true, data: res.data.data };
  } catch (err) {
    const reason = apiError(err);
    logger.warn("ApiService", "voiceLeave failed", { payload, reason });
    return { ok: false, reason };
  }
}

// ── Channel endpoints ──────────────────────────────────────────────────────────

export async function getVoiceChannels(): Promise<VoiceChannel[]> {
  try {
    const res = await http.get<{ data: VoiceChannel[] }>("/api/voice/channels");
    return res.data.data ?? [];
  } catch (err) {
    logger.error("ApiService", "getVoiceChannels failed", { reason: apiError(err) });
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
    return { ok: false, error: apiError(err) };
  }
}

export async function updateVoiceChannelRule(payload: {
  id:              string;
  durationMinutes?: number;
  cooldownSeconds?: number;
  maxPerDay?:       number;
  enabled?:         boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await http.patch("/api/voice/channels", payload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: apiError(err) };
  }
}

// ── Stats endpoint ─────────────────────────────────────────────────────────────

export async function getVoiceStats(): Promise<VoiceStats | null> {
  try {
    const res = await http.get<{ data: { stats: VoiceStats } }>("/api/voice/stats");
    return res.data.data.stats;
  } catch (err) {
    logger.error("ApiService", "getVoiceStats failed", { reason: apiError(err) });
    return null;
  }
}
