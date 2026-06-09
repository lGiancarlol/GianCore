import { config } from "./config";
import { logger, LOG_CTX } from "./config/logger";
import { buildClient } from "./client";
import { checkApiConnectivity } from "./services/apiService";
import { stopHeartbeat } from "./services/heartbeatService";

async function main() {
  logger.info(LOG_CTX.BOT, "Starting GianCore Discord Bot...");
  logger.info(LOG_CTX.BOT, `API endpoint: ${config.api.url}`);

  // ── Validate API connectivity before login ──────────────────────────────────
  logger.info(LOG_CTX.BOT, "Checking API connectivity...");
  const apiReachable = await checkApiConnectivity();

  if (!apiReachable) {
    logger.warn(LOG_CTX.BOT,
      "GianCore API is not reachable. Bot will start anyway but voice events may fail.",
      { url: config.api.url },
    );
  } else {
    logger.info(LOG_CTX.BOT, "API connectivity OK");
  }

  const client = buildClient();

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(LOG_CTX.BOT, `Received ${signal} — shutting down gracefully`);
    stopHeartbeat();
    client.destroy();
    process.exit(0);
  };

  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error(LOG_CTX.BOT, "Unhandled promise rejection", { reason: String(reason) });
  });

  process.on("uncaughtException", (err) => {
    logger.error(LOG_CTX.BOT, "Uncaught exception", { error: err.message, stack: err.stack });
    process.exit(1);
  });

  await client.login(config.discord.token);
}

main();
