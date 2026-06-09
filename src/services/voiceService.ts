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
  // expired — clean up
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

// ── Daily limit helper ─────────────────────────────────────────────────────────

async function countTodaySessions(channelId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.voiceSession.count({
    where: { channelId, joinedAt: { gte: start } },
  });
}

// ── Active session helper ──────────────────────────────────────────────────────

export async function getActiveSession(channelId: string, discordUserId: string) {
  return prisma.voiceSession.findFirst({
    where:   { channelId, discordUserId, leftAt: null },
    include: { license: true, channel: true },
  });
}

// ── License generation ────────────────────────────────────────────────────────

function generateKeyWithPrefix(prefix?: string | null): string {
  const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const segments = `${rand()}-${rand()}-${rand()}-${rand()}`;
  return prefix ? `${prefix.toUpperCase()}-${segments}` : segments;
}

async function generateVoiceLicense(
  productId:       string,
  durationMinutes: number,
  licensePrefix:   string | null | undefined,
  meta:            Record<string, unknown>,
) {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const owner     = await prisma.user.findFirst({ where: { role: "owner" } });
  const key       = generateKeyWithPrefix(licensePrefix);

  return prisma.license.create({
    data: {
      key,
      productId,
      userId:   owner?.id ?? (await getOrCreateSystemUser()),
      status:   "active",
      expiresAt,
      metadata: { source: "voice", ...meta },
    },
  });
}

async function getOrCreateSystemUser(): Promise<string> {
  const existing = await prisma.user.findFirst({ where: { email: "system@giancore.internal" } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      email:        "system@giancore.internal",
      username:     "system",
      passwordHash: "",
      role:         "owner",
    },
  });
  return created.id;
}

async function deactivateVoiceLicense(licenseId: string) {
  return prisma.license.update({
    where: { id: licenseId },
    data:  { status: "inactive" },
  });
}

// ── JOIN ───────────────────────────────────────────────────────────────────────

export async function createVoiceSession(
  discordChannelId: string,
  discordUserId:    string,
  discordUsername:  string,
  ip?: string,
): Promise<VoiceJoinResult> {

  // 1. Resolve channel + rule
  const channel = await getVoiceChannel(discordChannelId);
  if (!channel || !channel.active) {
    return { ok: false, reason: "invalid_channel" };
  }

  const rule = channel.voiceRule;
  if (!rule || !rule.enabled) {
    return { ok: false, reason: "channel_disabled" };
  }

  // 2. Check already active
  const existing = await getActiveSession(channel.id, discordUserId);
  if (existing) {
    return { ok: false, reason: "already_active" };
  }

  // 3. Check cooldown
  const { onCooldown } = await checkCooldown(channel.id, discordUserId);
  if (onCooldown) {
    return { ok: false, reason: "cooldown" };
  }

  // 4. Check daily limit
  const todayCount = await countTodaySessions(channel.id);
  if (todayCount >= rule.maxPerDay) {
    return { ok: false, reason: "daily_limit" };
  }

  // 5. Generate license with prefix from rule
  const license = await generateVoiceLicense(
    rule.productId,
    rule.durationMinutes,
    rule.licensePrefix,
    { discordUserId, discordUsername, channelId: discordChannelId },
  );

  // 6. Create session
  const session = await prisma.voiceSession.create({
    data: {
      channelId:       channel.id,
      discordUserId,
      discordUsername,
      licenseId:       license.id,
    },
    include: { channel: true, license: true },
  });

  // 7. Audit log
  await createAuditLog({
    action:   "voice.join",
    entity:   "voice_session",
    entityId: session.id,
    ip,
    metadata: { discordUserId, discordUsername, channelId: discordChannelId, licenseId: license.id },
  });

  return { ok: true, session: session as any, license: license as any };
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

  if (!session) {
    return { ok: false, reason: "session_not_found" };
  }

  const now      = new Date();
  const duration = Math.floor((now.getTime() - new Date(session.joinedAt).getTime()) / 1000);

  // Close session
  const closed = await prisma.voiceSession.update({
    where: { id: session.id },
    data:  { leftAt: now, durationSeconds: duration },
    include: { channel: true, license: true },
  });

  // Deactivate license
  if (session.licenseId) {
    await deactivateVoiceLicense(session.licenseId);
  }

  // Set cooldown
  if (channel?.voiceRule?.cooldownSeconds) {
    await setCooldown(channel.id, discordUserId, channel.voiceRule.cooldownSeconds);
  }

  // Audit log
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
  const now   = new Date();
  const start = new Date(); start.setHours(0, 0, 0, 0);

  const [activeSessions, activeLicenses, totalToday, totalAllTime, activeChannels] =
    await Promise.all([
      prisma.voiceSession.count({ where: { leftAt: null } }),
      prisma.license.count({
        where: { status: "active", metadata: { path: ["source"], equals: "voice" } },
      }),
      prisma.voiceSession.count({ where: { joinedAt: { gte: start } } }),
      prisma.voiceSession.count(),
      prisma.discordChannel.count({ where: { active: true, type: "voice", voiceRule: { enabled: true } } }),
    ]);

  // Unique active users = distinct discordUserId in open sessions
  const openSessions = await prisma.voiceSession.findMany({
    where:  { leftAt: null },
    select: { discordUserId: true },
  });
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
    take:    limit,
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
