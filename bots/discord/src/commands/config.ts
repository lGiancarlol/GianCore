import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getVoiceChannels, getVoiceStats } from "../services/apiService";
import { config } from "../config";

export default {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Muestra la configuración de GianCore para este servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId!;

    const [channels, stats] = await Promise.all([
      getVoiceChannels(),
      getVoiceStats(),
    ]);

    // Filter to this guild only
    const guildChannels = channels.filter(
      (c) => c.guild?.guildId === guildId || !c.guild
    );

    const apiOnline = stats !== null;

    // ── API Status embed ──────────────────────────────────────────────────────
    const statusEmbed = new EmbedBuilder()
      .setColor(apiOnline ? 0x27ae60 : 0xc0392b)
      .setTitle("⚙️ Configuración GianCore")
      .addFields(
        {
          name:   "🌐 API",
          value:  `\`${config.api.url}\` — ${apiOnline ? "✅ Online" : "❌ Offline"}`,
          inline: false,
        },
        {
          name:   "📊 Sesiones activas",
          value:  apiOnline ? String(stats!.activeSessions) : "—",
          inline: true,
        },
        {
          name:   "🔑 Licencias activas",
          value:  apiOnline ? String(stats!.activeLicenses) : "—",
          inline: true,
        },
        {
          name:   "👥 Usuarios conectados",
          value:  apiOnline ? String(stats!.connectedUsers) : "—",
          inline: true,
        },
      )
      .setTimestamp();

    if (guildChannels.length === 0) {
      statusEmbed.addFields({
        name:   "📢 Canales configurados",
        value:  "Ninguno — usa `/setvoice` para configurar el primero.",
        inline: false,
      });
      await interaction.editReply({ embeds: [statusEmbed] });
      return;
    }

    // ── Channels embed ────────────────────────────────────────────────────────
    const channelLines = guildChannels.map((ch) => {
      const rule   = ch.voiceRule;
      const status = ch.active && rule?.enabled ? "🟢" : "🔴";
      const dur    = rule ? `${rule.durationMinutes}m` : "—";
      const cool   = rule ? `${rule.cooldownSeconds}s` : "—";
      const prod   = rule?.product?.name ?? "Sin producto";
      return `${status} <#${ch.channelId}> · ${dur} · CD: ${cool} · ${prod}`;
    });

    statusEmbed.addFields({
      name:  `📢 Canales configurados (${guildChannels.length})`,
      value: channelLines.join("\n") || "—",
      inline: false,
    });

    await interaction.editReply({ embeds: [statusEmbed] });
  },
};
