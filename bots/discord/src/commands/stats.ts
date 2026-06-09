import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getVoiceStats, getVoiceChannels } from "../services/apiService";

export default {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Muestra las estadísticas del Voice Licensing Engine"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: false });

    const [stats, channels] = await Promise.all([
      getVoiceStats(),
      getVoiceChannels(),
    ]);

    if (!stats) {
      await interaction.editReply({
        content: "❌ No se pudo conectar con GianCore. Intenta más tarde.",
      });
      return;
    }

    const guildChannels = channels.filter(
      (c) => c.guild?.guildId === interaction.guildId || !c.guild
    );
    const activeInGuild = guildChannels.filter(
      (c) => c.active && c.voiceRule?.enabled
    ).length;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📊 Voice Licensing — Estadísticas")
      .setDescription("Datos en tiempo real del Voice Engine de GianCore.")
      .addFields(
        { name: "🎤 Sesiones activas",    value: String(stats.activeSessions), inline: true },
        { name: "🔑 Licencias activas",   value: String(stats.activeLicenses), inline: true },
        { name: "👥 Usuarios conectados", value: String(stats.connectedUsers), inline: true },
        { name: "📢 Canales activos",     value: String(stats.activeChannels), inline: true },
        { name: "📅 Sesiones hoy",        value: String(stats.totalToday),     inline: true },
        { name: "📈 Total histórico",     value: String(stats.totalAllTime),   inline: true },
      )
      .addFields({
        name:   `Este servidor`,
        value:  `${activeInGuild} canal${activeInGuild !== 1 ? "es" : ""} configurado${activeInGuild !== 1 ? "s" : ""}`,
        inline: false,
      })
      .setFooter({ text: "GianCore Voice Licensing Engine" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
