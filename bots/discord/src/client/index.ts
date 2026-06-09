import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ChatInputCommandInteraction,
  Interaction,
} from "discord.js";
import { logger, LOG_CTX } from "../config/logger";
import type { BotCommand } from "../types";

// ── Commands ───────────────────────────────────────────────────────────────────

import setvoice   from "../commands/setvoice";
import setduration from "../commands/setduration";
import configCmd  from "../commands/config";
import statsCmd   from "../commands/stats";

const COMMANDS: BotCommand[] = [setvoice, setduration, configCmd, statsCmd];

// ── Events ─────────────────────────────────────────────────────────────────────

import readyEvent        from "../events/ready";
import voiceStateUpdate  from "../events/voiceStateUpdate";

// ── Build client ───────────────────────────────────────────────────────────────

export function buildClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.DirectMessages,
    ],
  });

  // Command map
  const commands = new Collection<string, BotCommand>();
  for (const cmd of COMMANDS) {
    commands.set(cmd.data.name, cmd);
    logger.debug(LOG_CTX.CLIENT, `Command registered: /${cmd.data.name}`);
  }

  // Register events
  const events = [readyEvent, voiceStateUpdate];
  for (const event of events) {
    if ((event as any).once) {
      client.once(event.name, (...args) => (event.execute as any)(...args));
    } else {
      client.on(event.name, (...args) => (event.execute as any)(...args));
    }
    logger.debug(LOG_CTX.CLIENT, `Event registered: ${event.name}`);
  }

  // Interaction handler
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = commands.get(interaction.commandName);
    if (!cmd) {
      logger.warn(LOG_CTX.CLIENT, `Unknown command: /${interaction.commandName}`);
      await (interaction as ChatInputCommandInteraction).reply({
        content: "Comando desconocido.",
        ephemeral: true,
      });
      return;
    }

    try {
      logger.info(LOG_CTX.CLIENT, `Executing /${interaction.commandName}`, {
        userId:  interaction.user.id,
        guildId: interaction.guildId ?? "DM",
      });
      await cmd.execute(interaction as ChatInputCommandInteraction);
    } catch (err) {
      logger.error(LOG_CTX.CLIENT, `Error in /${interaction.commandName}`, {
        error: String(err),
      });
      const reply = { content: "❌ Ocurrió un error al ejecutar el comando.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await (interaction as ChatInputCommandInteraction).editReply(reply);
      } else {
        await (interaction as ChatInputCommandInteraction).reply(reply);
      }
    }
  });

  return client;
}
