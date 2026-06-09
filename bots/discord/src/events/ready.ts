import { Events, Client } from "discord.js";
import { logger } from "../config/logger";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client): void {
    logger.info("Bot", `Ready — logged in as ${client.user?.tag}`);
    logger.info("Bot", `Serving ${client.guilds.cache.size} guild(s)`);
  },
};
