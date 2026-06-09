import { Events, Client } from "discord.js";
import { logger, LOG_CTX } from "../config/logger";
import { startHeartbeat } from "../services/heartbeatService";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client): void {
    logger.info(LOG_CTX.BOT, `Ready — logged in as ${client.user?.tag}`);
    logger.info(LOG_CTX.BOT, `Serving ${client.guilds.cache.size} guild(s)`);
    startHeartbeat(client);
  },
};
