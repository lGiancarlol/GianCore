import { Events, VoiceState } from "discord.js";
import { voiceJoin, voiceLeave } from "../services/apiService";
import { dmLicenseGenerated, dmLicenseDeactivated, dmVoiceError } from "../services/dmService";
import { logger, LOG_CTX } from "../config/logger";

export default {
  name: Events.VoiceStateUpdate,

  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const userId   = member.id;
    const username = member.user.username;
    const guildId  = newState.guild.id;

    const joined = !oldState.channelId && !!newState.channelId;
    const left   = !!oldState.channelId && !newState.channelId;
    const moved  = !!oldState.channelId && !!newState.channelId
                   && oldState.channelId !== newState.channelId;

    // ── JOIN ───────────────────────────────────────────────────────────────────
    if (joined && newState.channelId) {
      await handleJoin(userId, username, guildId, newState.channelId, member.user,
        newState.channel?.name ?? newState.channelId);
    }

    // ── LEAVE ──────────────────────────────────────────────────────────────────
    else if (left && oldState.channelId) {
      await handleLeave(userId, username, guildId, oldState.channelId, member.user,
        oldState.channel?.name ?? oldState.channelId);
    }

    // ── MOVE ───────────────────────────────────────────────────────────────────
    else if (moved && oldState.channelId && newState.channelId) {
      logger.info(LOG_CTX.VOICE_LEAVE, "User moved — closing old session", {
        userId, username, from: oldState.channelId, to: newState.channelId, guildId,
      });

      // Close old without sending DM (avoid noise on channel switches)
      await voiceLeave({ channelId: oldState.channelId, userId });

      // Open new
      await handleJoin(userId, username, guildId, newState.channelId, member.user,
        newState.channel?.name ?? newState.channelId);
    }
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

async function handleJoin(
  userId:      string,
  username:    string,
  guildId:     string,
  channelId:   string,
  user:        import("discord.js").User,
  channelName: string,
) {
  logger.info(LOG_CTX.VOICE_JOIN, "User joined voice channel", {
    userId, username, channelId, guildId,
  });

  const result = await voiceJoin({ channelId, userId, username });

  if (result.ok) {
    const { license, session } = result.data;

    const durationMins = license.expiresAt
      ? Math.max(1, Math.round(
          (new Date(license.expiresAt).getTime() - new Date(session.joinedAt).getTime()) / 60_000,
        ))
      : 60;

    logger.info(LOG_CTX.LICENSE_CREATED, "License generated", {
      userId,
      licenseKey: license.key,
      licenseId:  license.id,
      channelId,
      expiresAt:  license.expiresAt,
      durationMins,
    });

    await dmLicenseGenerated(user, license.key, license.expiresAt, durationMins, channelName);

  } else {
    const userFacing = new Set([
      "cooldown", "daily_limit", "channel_disabled",
      "already_active", "invalid_channel",
    ]);

    if (userFacing.has(result.reason) || result.status >= 400) {
      await dmVoiceError(user, result.reason, result.status);
    }

    const level = result.status >= 500 ? "error" : "warn";
    logger[level](LOG_CTX.VOICE_JOIN, "Join rejected", {
      userId, channelId, reason: result.reason, status: result.status,
    });
  }
}

async function handleLeave(
  userId:      string,
  username:    string,
  guildId:     string,
  channelId:   string,
  user:        import("discord.js").User,
  channelName: string,
) {
  logger.info(LOG_CTX.VOICE_LEAVE, "User left voice channel", {
    userId, username, channelId, guildId,
  });

  const result = await voiceLeave({ channelId, userId });

  if (result.ok) {
    const duration = result.data.session.durationSeconds ?? 0;

    logger.info(LOG_CTX.LICENSE_DEACTIVATED, "License deactivated", {
      userId, channelId, durationSeconds: duration,
    });

    await dmLicenseDeactivated(user, duration, channelName);

  } else {
    // session_not_found = channel not configured — expected, no noise
    if (result.reason !== "session_not_found") {
      logger.warn(LOG_CTX.VOICE_LEAVE, "Leave error", {
        userId, channelId, reason: result.reason, status: (result as any).status,
      });
    }
  }
}
