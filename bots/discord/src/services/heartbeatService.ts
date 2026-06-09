import type { Client } from "discord.js";
import { sendHeartbeat } from "./apiService";
import { logger, LOG_CTX } from "../config/logger";

const INTERVAL_MS = 60_000;

let _timer: NodeJS.Timeout | null = null;
let _startTime = Date.now();

export function startHeartbeat(client: Client): void {
  if (_timer) return; // already running

  _startTime = Date.now();

  const beat = async () => {
    const uptime   = Math.floor((Date.now() - _startTime) / 1000);
    const guilds   = client.guilds.cache.size;
    // Count active voice states (users currently in voice channels)
    const sessions = client.guilds.cache.reduce(
      (acc, g) => acc + g.voiceStates.cache.filter((v) => v.channelId !== null).size,
      0,
    );

    const ok = await sendHeartbeat({ uptime, guilds, sessions });

    if (ok) {
      logger.debug(LOG_CTX.HEARTBEAT, `Heartbeat OK — uptime ${uptime}s`, { guilds, sessions });
    }
  };

  // Send immediately on start, then every 60s
  beat();
  _timer = setInterval(beat, INTERVAL_MS);
  logger.info(LOG_CTX.HEARTBEAT, `Heartbeat started — interval ${INTERVAL_MS / 1000}s`);
}

export function stopHeartbeat(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    logger.info(LOG_CTX.HEARTBEAT, "Heartbeat stopped");
  }
}
