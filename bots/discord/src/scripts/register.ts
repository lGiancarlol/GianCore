import "dotenv/config";
import { REST, Routes } from "discord.js";
import { config } from "../config";
import { logger } from "../config/logger";

import setvoice    from "../commands/setvoice";
import setduration from "../commands/setduration";
import configCmd   from "../commands/config";
import statsCmd    from "../commands/stats";

const commands = [setvoice, setduration, configCmd, statsCmd].map((c) => c.data.toJSON());

const rest = new REST({ version: "10" }).setToken(config.discord.token);

(async () => {
  try {
    logger.info("Register", `Registering ${commands.length} slash command(s)...`);

    const data = await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: commands },
    ) as unknown[];

    logger.info("Register", `Successfully registered ${data.length} command(s) globally`);
    logger.info("Register", "Note: global commands can take up to 1 hour to propagate");
  } catch (err) {
    logger.error("Register", "Failed to register commands", { error: String(err) });
    process.exit(1);
  }
})();
