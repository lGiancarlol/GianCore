import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/auditService";
import type { VoiceJoinResult, VoiceLeaveResult, VoiceStats } from "@/types";

// ── Channel helpers ────────────────────────────────────────────────────────────

export async function getVoiceChannel(discordChannelId: string) {
  return prisma.discordChannel.findUnique({
    where:   { channelId: discordChannelId },
    include: { voiceRule: { include: { product: true } } },
  });
}

export async function getVoiceChannels() {
  return prisma.discordChannel.findMany({
    where:   { type: "voice" },
    include: {
      voiceRule: { include: { product: { select: { id: true, name: true, slug: true } } } },
      guild:     { select: { id: true, name: true, guildId: true } },
      _count:    { select: { voiceSessions: { where: { leftAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Cooldown helpers ───────────────────────────────────────────────────────────

export async function checkCooldown(
  channelId: string,
  discordUserId: string,
): Promise<{ onCooldown: boolean; expiresAt?: Date }> {
  const cooldown = await prisma.voiceCooldown.findUnique({
    where: { channelId_discordUserId: { channelId, discordUserId } },
  });
  if (!cooldown) return { onCooldown: false };
  if (cooldown.expiresAt > new Date()) {
    return { onCooldown: true, expiresAt: cooldown.expiresAt };
  }
  await prisma.voiceCooldown.delete({
    where: { channelId_discordUserId: { channelId, discordUserId } },
  });
  return { onCooldown: false };
}

async function setCooldown(channelId: string, discordUserId: string, seconds: number) {
  if (seconds <= 0) return;
  const expiresAt = new Date(Date.now() + seconds * 1000);
  await prisma.voiceCooldown.upsert({
    where:  { channelId_discordUserId: { channelId, discordUserId } },
    update: { expiresAt },
    create: { channelId, discordUserId, expiresAt },
  });
}

// ── Active session helper ──────────────────────────────────────────────────────

export async function getActiveSession(channelId: string, discordUserId: string) {
  return prisma.voiceSession.findFirst({
    where:   { channelId, discordUserId, leftAt: null },
    include: { license: true, channel: true },
  });
}

// ── License key generation (crypto-safe) ──────────────────────────────────────

function generateKeyWithPrefix(prefix?: string | null): string {
  const seg = () => randomBytes(2).toString("hex").toUpperCase();
  const segments = `${seg()}-${seg()}-${seg()}-${seg()}`;
  return prefix ? `${prefix.toUpperCase()}-${segments}` : segments;
}

// ── System user ────────────────────────────────────────────────────────────────

async function getOrCreateSystemUser(): Promise<string> {
  const user = await prisma.user.upsert({
    where:  { email: "system@giancore.internal" },
    update: {},
    create: {
      email:        "system@giancore.internal",
      username:     "system",
      passwordHash: "",
      role:         "owner",
      active:       true,
    },
  });
  return user.id;
}

// ── License generation ────────────────────────────────────────────────────────

async function generateVoiceLicense(
  productId:       string,
  durationMinutes: number,
  licensePrefix:   string | null | undefined,
  meta:            Record<string, unknown>,
  tx:              typeof prisma,
) {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const owner     = await (tx as any).user.findFirst({ where: { role: "owner", active: true } });
  const userId    = owner?.id ?? await getOrCreateSystemUser();
  const key       = generateKeyWithPrefix(licensePrefix);

  return (tx as any).license.create({
    data: {
      key,
      productId,
      userId,
      status:   "active",
      expiresAt,
      metadata: { source: "voice", ...meta },
    },
  });
}

async function deactivateVoiceLicense(licenseId: string) {
  return prisma.license.update({
    where: { id: licenseId },
    data:  { status: "inactive" },
  });
}

// ── JOIN — fully atomic serializable transaction ───────────────────────────────

export async function createVoiceSession(
  discordChannelId: string,
  discordUserId:    string,
  discordUsername:  string,
  ip?: string,
): Promise<VoiceJoinResult> {

  // Resolve channel + rule (outside tx — read-only pre-check)
  const channel = await getVoiceChannel(discordChannelId);
  if (!channel || !channel.active) return { ok: false, reason: "invalid_channel" };

  const rule = channel.voiceRule;
  if (!rule || !rule.enabled) return { ok: false, reason: "channel_disabled" };

  // Cooldown check (outside tx — non-critical, soft check)
  const { onCooldown } = await checkCooldown(channel.id, discordUserId);
  if (onCooldown) return { ok: false, reason: "cooldown" };

  // ── Serializable transaction: prevents duplicate sessions under concurrency ──
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-check active session inside tx
      const existing = await (tx as any).voiceSession.findFirst({
        where: { channelId: channel.id, discordUserId, leftAt: null },
      });
      if (existing) throw Object.assign(new Error("already_active"), { code: "already_active" });

      // Re-check daily limit inside tx
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const todayCount = await (tx as any).voiceSession.count({
        where: { channelId: channel.id, joinedAt: { gte: start } },
      });
      if (todayCount >= rule.maxPerDay) {
        throw Object.assign(new Error("daily_limit"), { code: "daily_limit" });
      }

      // Generate license inside tx
      const license = await generateVoiceLicense(
        rule.productId,
        rule.durationMinutes,
        rule.licensePrefix,
        { discordUserId, discordUsername, channelId: discordChannelId },
        tx as any,
      );

      // Create session inside tx
      const session = await (tx as any).voiceSession.create({
        data: {
          channelId:       channel.id,
          discordUserId,
          discordUsername,
          licenseId:       license.id,
        },
        include: { channel: true, license: true },
      });

      return { session, license };
    }, { isolationLevel: "Serializable" });

    // Audit log (outside tx — non-critical)
    await createAuditLog({
      action:   "voice.join",
      entity:   "voice_session",
      entityId: result.session.id,
      ip,
      metadata: { discordUserId, discordUsername, channelId: discordChannelId, licenseId: result.license.id },
    });

    return { ok: true, session: result.session as any, license: result.license as any };

  } catch (err: any) {
    const code = err?.code as string | undefined;
    if (code === "already_active") return { ok: false, reason: "already_active" };
    if (code === "daily_limit")    return { ok: false, reason: "daily_limit" };
    // Prisma unique constraint violation (P2002) = duplicate session race
    if (err?.code === "P2002")     return { ok: false, reason: "already_active" };
    throw err;
  }
}

// ── LEAVE ──────────────────────────────────────────────────────────────────────

export async function closeVoiceSession(
  discordChannelId: string,
  discordUserId:    string,
  ip?: string,
): Promise<VoiceLeaveResult> {

  const channel = await prisma.discordChannel.findUnique({
    where:   { channelId: discordChannelId },
    include: { voiceRule: true },
  });

  const session = channel
    ? await getActiveSession(channel.id, discordUserId)
    : null;

  if (!session) return { ok: false, reason: "session_not_found" };

  const now      = new Date();
  const duration = Math.floor((now.getTime() - new Date(session.joinedAt).getTime()) / 1000);

  const closed = await prisma.voiceSession.update({
    where:   { id: session.id },
    data:    { leftAt: now, durationSeconds: duration },
    include: { channel: true, license: true },
  });

  if (session.licenseId) await deactivateVoiceLicense(session.licenseId);

  if (channel?.voiceRule?.cooldownSeconds) {
    await setCooldown(channel.id, discordUserId, channel.voiceRule.cooldownSeconds);
  }

  await createAuditLog({
    action:   "voice.leave",
    entity:   "voice_session",
    entityId: session.id,
    ip,
    metadata: { discordUserId, channelId: discordChannelId, durationSeconds: duration },
  });

  return { ok: true, session: closed as any };
}

// ── Stats ──────────────────────────────────────────────────────────────────────

export async function getVoiceStats(): Promise<VoiceStats> {
  const start = new Date(); start.setHours(0, 0, 0, 0);

  const [activeSessions, activeLicenses, totalToday, totalAllTime, activeChannels, openSessions] =
    await Promise.all([
      prisma.voiceSession.count({ where: { leftAt: null } }),
      prisma.license.count({
        where: { status: "active", metadata: { path: ["source"], equals: "voice" } },
      }),
      prisma.voiceSession.count({ where: { joinedAt: { gte: start } } }),
      prisma.voiceSession.count(),
      prisma.discordChannel.count({ where: { active: true, type: "voice", voiceRule: { enabled: true } } }),
      prisma.voiceSession.findMany({
        where:  { leftAt: null },
        select: { discordUserId: true },
      }),
    ]);

  const connectedUsers = new Set(openSessions.map((s) => s.discordUserId)).size;
  return { activeSessions, activeLicenses, connectedUsers, activeChannels, totalToday, totalAllTime };
}

// ── Session list ───────────────────────────────────────────────────────────────

export async function getVoiceSessions(onlyActive = false, limit = 50) {
  return prisma.voiceSession.findMany({
    where:   onlyActive ? { leftAt: null } : undefined,
    include: {
      channel: { select: { id: true, name: true, channelId: true } },
      license: { select: { id: true, key: true, status: true } },
    },
    orderBy: { joinedAt: "desc" },
    take:    Math.min(limit, 200),
  });
}

// ── Cooldown list ──────────────────────────────────────────────────────────────

export async function getActiveCooldowns() {
  return prisma.voiceCooldown.findMany({
    where:   { expiresAt: { gt: new Date() } },
    include: { channel: { select: { id: true, name: true } } },
    orderBy: { expiresAt: "asc" },
  });
}
