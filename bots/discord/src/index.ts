import { config } from "./config";
import { logger } from "./config/logger";
import { buildClient } from "./client";

async function main() {
  logger.info("Bot", "Starting GianCore Discord Bot...");
  logger.info("Bot", `API endpoint: ${config.api.url}`);

  const client = buildClient();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info("Bot", `Received ${signal} — shutting down gracefully`);
    client.destroy();
    process.exit(0);
  };

  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Bot", "Unhandled promise rejection", { reason: String(reason) });
  });

  process.on("uncaughtException", (err) => {
    logger.error("Bot", "Uncaught exception", { error: err.message });
    process.exit(1);
  });

  await client.login(config.discord.token);
}

main();
