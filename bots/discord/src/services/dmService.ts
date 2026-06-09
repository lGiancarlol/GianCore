import { User, EmbedBuilder } from "discord.js";
import { logger } from "../config/logger";

const RED    = 0xc0392b;
const GREEN  = 0x27ae60;
const AMBER  = 0xe67e22;

function formatDuration(minutes: number): string {
  if (minutes < 60)  return `${minutes} minuto${minutes !== 1 ? "s" : ""}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hora${h !== 1 ? "s" : ""}`;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "Sin expiración";
  return new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

// ── License generated ─────────────────────────────────────────────────────────

export async function dmLicenseGenerated(
  user:      User,
  key:       string,
  expiresAt: string | null,
  durationMinutes: number,
  channelName: string,
): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor(GREEN)
      .setTitle("✅ Licencia generada")
      .setDescription("Entraste a un canal de voz habilitado. Tu licencia está activa.")
      .addFields(
        { name: "🔑 License Key",   value: `\`\`\`${key}\`\`\``,                       inline: false },
        { name: "⏱ Duración",       value: formatDuration(durationMinutes),              inline: true  },
        { name: "📅 Expira",         value: formatExpiry(expiresAt),                     inline: true  },
        { name: "📢 Canal",          value: channelName,                                 inline: true  },
      )
      .setFooter({ text: "La licencia se desactivará automáticamente al salir del canal." })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    logger.debug("DmService", "License DM sent", { userId: user.id });
  } catch (err) {
    logger.warn("DmService", "Could not send license DM (DMs disabled?)", { userId: user.id });
  }
}

// ── License deactivated ───────────────────────────────────────────────────────

export async function dmLicenseDeactivated(
  user:        User,
  durationSecs: number,
  channelName: string,
): Promise<void> {
  try {
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    const embed = new EmbedBuilder()
      .setColor(AMBER)
      .setTitle("⚠️ Licencia desactivada")
      .setDescription("Saliste del canal de voz. Tu licencia ha sido desactivada.")
      .addFields(
        { name: "📢 Canal",           value: channelName, inline: true },
        { name: "⏱ Tiempo en canal",  value: timeStr,     inline: true },
      )
      .setFooter({ text: "Vuelve a unirte al canal para obtener una nueva licencia." })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    logger.debug("DmService", "Deactivation DM sent", { userId: user.id });
  } catch {
    logger.warn("DmService", "Could not send deactivation DM", { userId: user.id });
  }
}

// ── Error DM (cooldown / daily limit) ─────────────────────────────────────────

export async function dmVoiceError(user: User, reason: string): Promise<void> {
  const MESSAGES: Record<string, string> = {
    cooldown:         "⏳ Estás en período de cooldown. Espera antes de volver a unirte.",
    daily_limit:      "🚫 Se alcanzó el límite diario de licencias para este canal.",
    channel_disabled: "🔒 Este canal no tiene licenciamiento activo.",
    invalid_channel:  "❓ Este canal no está configurado en GianCore.",
    already_active:   "ℹ️ Ya tienes una sesión activa en este canal.",
  };

  const description = MESSAGES[reason] ?? `Error inesperado: \`${reason}\``;

  try {
    const embed = new EmbedBuilder()
      .setColor(RED)
      .setTitle("❌ Licencia no generada")
      .setDescription(description)
      .setTimestamp();

    await user.send({ embeds: [embed] });
  } catch {
    // DMs cerrados — silencioso
  }
}
