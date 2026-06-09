import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getVoiceChannels, updateVoiceChannelRule } from "../services/apiService";
import { logger } from "../config/logger";

export default {
  data: new SlashCommandBuilder()
    .setName("setduration")
    .setDescription("Actualiza la duración o cooldown de un canal de voz configurado")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt.setName("canal").setDescription("Canal de voz a actualizar").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("duracion").setDescription("Nueva duración en minutos").setMinValue(1)
    )
    .addIntegerOption((opt) =>
      opt.setName("cooldown").setDescription("Nuevo cooldown en segundos").setMinValue(0)
    )
    .addIntegerOption((opt) =>
      opt.setName("max_por_dia").setDescription("Nuevo límite diario").setMinValue(1)
    )
    .addBooleanOption((opt) =>
      opt.setName("habilitado").setDescription("Activar o desactivar el canal")
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const discordChannel  = interaction.options.getChannel("canal", true);
    const durationMinutes = interaction.options.getInteger("duracion")    ?? undefined;
    const cooldownSeconds = interaction.options.getInteger("cooldown")    ?? undefined;
    const maxPerDay       = interaction.options.getInteger("max_por_dia") ?? undefined;
    const enabled         = interaction.options.getBoolean("habilitado")  ?? undefined;

    if (!durationMinutes && !cooldownSeconds && !maxPerDay && enabled === undefined) {
      await interaction.editReply({ content: "⚠️ Debes especificar al menos un parámetro a actualizar." });
      return;
    }

    // Resolve internal channel id from API
    const channels = await getVoiceChannels();
    const channel  = channels.find((c) => c.channelId === discordChannel.id);

    if (!channel) {
      await interaction.editReply({
        content: `❌ El canal <#${discordChannel.id}> no está configurado en GianCore. Usa \`/setvoice\` primero.`,
      });
      return;
    }

    logger.info("CMD:setduration", "Updating voice rule", {
      channelId: discordChannel.id, durationMinutes, cooldownSeconds, maxPerDay, enabled,
    });

    const result = await updateVoiceChannelRule({
      id: channel.id,
      durationMinutes,
      cooldownSeconds,
      maxPerDay,
      enabled,
    });

    if (!result.ok) {
      await interaction.editReply({ content: `❌ Error: \`${result.error}\`` });
      return;
    }

    const rule = channel.voiceRule;
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("✅ Regla actualizada")
      .addFields(
        { name: "📢 Canal",     value: `<#${discordChannel.id}>`,                                inline: false },
        { name: "⏱ Duración",  value: `${durationMinutes ?? rule?.durationMinutes ?? "—"} min`, inline: true  },
        { name: "⏳ Cooldown",  value: `${cooldownSeconds ?? rule?.cooldownSeconds ?? "—"} seg`, inline: true  },
        { name: "📊 Máx/día",  value: String(maxPerDay   ?? rule?.maxPerDay       ?? "—"),      inline: true  },
        { name: "🔘 Estado",   value: (enabled ?? rule?.enabled) ? "Habilitado" : "Deshabilitado", inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
