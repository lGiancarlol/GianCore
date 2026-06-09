import { Events, VoiceState } from "discord.js";
import { voiceJoin, voiceLeave } from "../services/apiService";
import { dmLicenseGenerated, dmLicenseDeactivated, dmVoiceError } from "../services/dmService";
import { logger } from "../config/logger";
import type { BotCommand } from "../types";

// ── voiceStateUpdate ───────────────────────────────────────────────────────────
// Fires when a user: joins, leaves, moves between, or mutes in a voice channel.

export const voiceStateUpdateEvent = {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {

    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const userId   = member.id;
    const username = member.user.username;
    const guildId  = newState.guild.id;

    const joined = !oldState.channelId && !!newState.channelId;
    const left   = !!oldState.channelId && !newState.channelId;
    const moved  = !!oldState.channelId && !!newState.channelId && oldState.channelId !== newState.channelId;

    // ── User joined a voice channel ────────────────────────────────────────────
    if (joined && newState.channelId) {
      logger.info("VoiceEvent", "User joined voice channel", {
        userId, username, channelId: newState.channelId, guildId,
      });

      const result = await voiceJoin({
        channelId: newState.channelId,
        userId,
        username,
      });

      if (result.ok) {
        const { license, session } = result.data;
        const channelName = newState.channel?.name ?? newState.channelId;
        const durationMins = license.expiresAt
          ? Math.round((new Date(license.expiresAt).getTime() - new Date(session.joinedAt).getTime()) / 60_000)
          : 60;

        logger.info("VoiceEvent", "License generated", {
          userId, licenseId: license.id, channelId: newState.channelId,
        });

        await dmLicenseGenerated(member.user, license.key, license.expiresAt, durationMins, channelName);

      } else {
        // Only DM on known user-facing errors, not server errors
        const userFacing = ["cooldown", "daily_limit", "channel_disabled", "already_active"];
        if (userFacing.includes(result.reason)) {
          await dmVoiceError(member.user, result.reason);
        }
        logger.warn("VoiceEvent", "Join rejected by API", { userId, reason: result.reason });
      }
    }

    // ── User left a voice channel ──────────────────────────────────────────────
    else if (left && oldState.channelId) {
      logger.info("VoiceEvent", "User left voice channel", {
        userId, username, channelId: oldState.channelId, guildId,
      });

      const result = await voiceLeave({
        channelId: oldState.channelId,
        userId,
      });

      if (result.ok) {
        const channelName = oldState.channel?.name ?? oldState.channelId;
        const duration    = result.data.session.durationSeconds ?? 0;

        logger.info("VoiceEvent", "Session closed", { userId, duration });
        await dmLicenseDeactivated(member.user, duration, channelName);

      } else {
        // Session not found = channel was not configured. Silently ignore.
        if (result.reason !== "session_not_found") {
          logger.warn("VoiceEvent", "Leave error", { userId, reason: result.reason });
        }
      }
    }

    // ── User moved between channels ────────────────────────────────────────────
    else if (moved && oldState.channelId && newState.channelId) {
      logger.info("VoiceEvent", "User moved channels", {
        userId, from: oldState.channelId, to: newState.channelId,
      });

      // Close old session first
      await voiceLeave({ channelId: oldState.channelId, userId });

      // Open new session in the new channel
      const joinResult = await voiceJoin({
        channelId: newState.channelId,
        userId,
        username,
      });

      if (joinResult.ok) {
        const { license, session } = joinResult.data;
        const channelName  = newState.channel?.name ?? newState.channelId;
        const durationMins = license.expiresAt
          ? Math.round((new Date(license.expiresAt).getTime() - new Date(session.joinedAt).getTime()) / 60_000)
          : 60;

        await dmLicenseGenerated(member.user, license.key, license.expiresAt, durationMins, channelName);
      } else {
        const userFacing = ["cooldown", "daily_limit", "channel_disabled", "already_active"];
        if (userFacing.includes(joinResult.reason)) {
          await dmVoiceError(member.user, joinResult.reason);
        }
      }
    }
  },
};

// Export with discord.js event shape
export default {
  name:    voiceStateUpdateEvent.name,
  execute: voiceStateUpdateEvent.execute,
};
