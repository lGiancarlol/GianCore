"use client";
import { useEffect, useState, useCallback } from "react";
import type { VoiceStats, VoiceSession, VoiceCooldown } from "@/types";

interface VoiceChannelWithRule {
  id:        string;
  channelId: string;
  name:      string;
  active:    boolean;
  guild?:    { name: string; guildId: string };
  voiceRule?: {
    enabled:         boolean;
    durationMinutes: number;
    cooldownSeconds: number;
    maxPerDay:       number;
    product?:        { id: string; name: string };
  };
  _count?: { voiceSessions: number };
}

export function useVoiceStats(refreshMs = 15_000) {
  const [stats,   setStats]   = useState<VoiceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    fetch("/api/voice/stats")
      .then((r) => r.json())
      .then((r) => setStats(r.data?.stats ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, refreshMs);
    return () => clearInterval(id);
  }, [fetch_, refreshMs]);

  return { stats, loading, refresh: fetch_ };
}

export function useVoiceSessions(onlyActive = false) {
  const [data,    setData]    = useState<VoiceSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    fetch(`/api/voice/sessions?active=${onlyActive}&limit=100`)
      .then((r) => r.json())
      .then((r) => setData(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onlyActive]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refresh: fetch_ };
}

export function useVoiceChannels() {
  const [data,    setData]    = useState<VoiceChannelWithRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    fetch("/api/voice/channels")
      .then((r) => r.json())
      .then((r) => setData(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refresh: fetch_ };
}

export function useVoiceCooldowns() {
  const [data,    setData]    = useState<VoiceCooldown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    fetch("/api/voice/stats?cooldowns=true")
      .then((r) => r.json())
      .then((r) => setData(r.data?.cooldowns ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refresh: fetch_ };
}
