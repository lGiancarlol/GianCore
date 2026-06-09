import { User, EmbedBuilder } from "discord.js";
import { logger, LOG_CTX } from "../config/logger";

const RED   = 0xc0392b;
const GREEN = 0x27ae60;
const AMBER = 0xe67e22;
const BLUE  = 0x3498db;
const GREY  = 0x95a5a6;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? "s" : ""}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hora${h !== 1 ? "s" : ""}`;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "Sin expiración";
  return new Date(iso).toLocaleString("es-AR", {
    timeZone:    "America/Argentina/Buenos_Aires",
    day:         "2-digit",
    month:       "2-digit",
    year:        "numeric",
    hour:        "2-digit",
    minute:      "2-digit",
  });
}

async function safeSend(user: User, embed: EmbedBuilder, context: string): Promise<void> {
  try {
    await user.send({ embeds: [embed] });
    logger.debug(context, "DM sent", { userId: user.id });
  } catch {
    logger.warn(context, "DM failed — user may have DMs disabled", { userId: user.id });
  }
}

// ── License generated ──────────────────────────────────────────────────────────

export async function dmLicenseGenerated(
  user:            User,
  key:             string,
  expiresAt:       string | null,
  durationMinutes: number,
  channelName:     string,
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(GREEN)
    .setTitle("✅ Licencia generada")
    .setDescription("Entraste a un canal de voz habilitado. Tu licencia está activa.")
    .addFields(
      { name: "🔑 License Key", value: `\`\`\`${key}\`\`\``,              inline: false },
      { name: "⏱ Duración",     value: formatDuration(durationMinutes),    inline: true  },
      { name: "📅 Expira",       value: formatExpiry(expiresAt),            inline: true  },
      { name: "📢 Canal",        value: channelName,                        inline: true  },
    )
    .setFooter({ text: "La licencia se desactivará automáticamente al salir del canal." })
    .setTimestamp();

  await safeSend(user, embed, LOG_CTX.LICENSE_CREATED);
}

// ── License deactivated ────────────────────────────────────────────────────────

export async function dmLicenseDeactivated(
  user:         User,
  durationSecs: number,
  channelName:  string,
): Promise<void> {
  const mins    = Math.floor(durationSecs / 60);
  const secs    = durationSecs % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const embed = new EmbedBuilder()
    .setColor(AMBER)
    .setTitle("⚠️ Licencia desactivada")
    .setDescription("Saliste del canal de voz. Tu licencia ha sido desactivada.")
    .addFields(
      { name: "📢 Canal",          value: channelName, inline: true },
      { name: "⏱ Tiempo en canal", value: timeStr,     inline: true },
    )
    .setFooter({ text: "Vuelve a unirte al canal para obtener una nueva licencia." })
    .setTimestamp();

  await safeSend(user, embed, LOG_CTX.LICENSE_DEACTIVATED);
}

// ── Error DMs by HTTP status code ──────────────────────────────────────────────

export async function dmVoiceError(
  user:   User,
  reason: string,
  status?: number,
): Promise<void> {
  // Determine embed by HTTP status first, fall back to reason string
  let title       = "❌ Licencia no generada";
  let description = `Error inesperado: \`${reason}\``;
  let color       = RED;

  if (status === 429 || reason === "cooldown" || reason === "daily_limit") {
    color       = AMBER;
    title       = "⏳ Demasiadas solicitudes";
    description = reason === "daily_limit"
      ? "🚫 Se alcanzó el **límite diario** de licencias para este canal. Inténtalo mañana."
      : "⏳ Estás en **período de cooldown**. Espera un momento antes de volver a unirte.";
  } else if (status === 403 || reason === "channel_disabled") {
    color       = GREY;
    title       = "🔒 Canal no habilitado";
    description = "Este canal no tiene licenciamiento activo. Contacta a un administrador.";
  } else if (status === 404 || reason === "invalid_channel") {
    color       = BLUE;
    title       = "❓ Canal no configurado";
    description = "Este canal no está registrado en GianCore. Un administrador debe configurarlo con `/setvoice`.";
  } else if (reason === "already_active") {
    color       = BLUE;
    title       = "ℹ️ Sesión ya activa";
    description = "Ya tienes una licencia activa en este canal. Solo puedes tener una a la vez.";
  } else if (status === 500 || (status && status >= 500)) {
    color       = RED;
    title       = "🔴 Error del servidor";
    description = "Ocurrió un error interno en GianCore. Intenta nuevamente en unos minutos.";
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();

  await safeSend(user, embed, LOG_CTX.API_ERROR);
}
