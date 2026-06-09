"use client";
import { useEffect, useState, useCallback } from "react";

export interface BotStatus {
  online:   boolean;
  status:   string;
  uptime:   number;
  guilds:   number;
  sessions: number;
  lastSeen: string | null;
}

export function useDiscordHeartbeat(refreshMs = 30_000) {
  const [data,    setData]    = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    fetch("/api/integrations/discord/heartbeat")
      .then((r) => r.json())
      .then((r) => setData(r.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, refreshMs);
    return () => clearInterval(id);
  }, [fetch_, refreshMs]);

  return { data, loading, refresh: fetch_ };
}
