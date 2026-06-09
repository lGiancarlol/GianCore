import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { createVoiceChannel, getVoiceChannels } from "../services/apiService";
import { logger } from "../config/logger";

export default {
  data: new SlashCommandBuilder()
    .setName("setvoice")
    .setDescription("Configura un canal de voz para licenciamiento automático")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt.setName("canal").setDescription("Canal de voz a configurar").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("producto_id").setDescription("ID del producto en GianCore").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("duracion").setDescription("Duración de la licencia en minutos (default: 60)").setMinValue(1)
    )
    .addIntegerOption((opt) =>
      opt.setName("cooldown").setDescription("Cooldown entre licencias en segundos (default: 300)").setMinValue(0)
    )
    .addIntegerOption((opt) =>
      opt.setName("max_por_dia").setDescription("Máximo de licencias por día en el canal (default: 100)").setMinValue(1)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const channel         = interaction.options.getChannel("canal", true);
    const productId       = interaction.options.getString("producto_id", true);
    const durationMinutes = interaction.options.getInteger("duracion")    ?? 60;
    const cooldownSeconds = interaction.options.getInteger("cooldown")    ?? 300;
    const maxPerDay       = interaction.options.getInteger("max_por_dia") ?? 100;
    const guildId         = interaction.guildId!;

    logger.info("CMD:setvoice", "Configuring voice channel", {
      channelId: channel.id, productId, guildId,
    });

    const result = await createVoiceChannel({
      guildId,
      channelId:    channel.id,
      name:         channel.name ?? channel.id,
      productId,
      durationMinutes,
      cooldownSeconds,
      maxPerDay,
    });

    if (!result.ok) {
      await interaction.editReply({
        content: `❌ Error al configurar el canal: \`${result.error}\``,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle("✅ Canal configurado")
      .addFields(
        { name: "📢 Canal",       value: `<#${channel.id}>`,         inline: true  },
        { name: "⏱ Duración",    value: `${durationMinutes} min`,    inline: true  },
        { name: "⏳ Cooldown",    value: `${cooldownSeconds} seg`,    inline: true  },
        { name: "📊 Máx/día",    value: String(maxPerDay),            inline: true  },
        { name: "🏷 Producto ID", value: `\`${productId}\``,          inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
