import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { requireBotToken } from "@/lib/botAuth";
import { auth } from "@/lib/auth";
import { getVoiceChannels } from "@/services/voiceService";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session  = await auth();
  const botError = requireBotToken(req);
  if (!session && botError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const channels = await getVoiceChannels();
    return NextResponse.json({ data: channels });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const check = await requirePermission("discord:manage");
  if (!check.ok) return check.response;

  try {
    const body = await req.json();
    const {
      guildId, channelId, name,
      productId, durationMinutes = 60, cooldownSeconds = 0, maxPerDay = 100,
      enabled = true, licensePrefix,
    } = body;

    if (!guildId || !channelId || !name || !productId) {
      return NextResponse.json(
        { error: "guildId, channelId, name and productId are required" },
        { status: 400 },
      );
    }

    await prisma.discordGuild.upsert({
      where:  { guildId },
      update: {},
      create: { guildId, name: `Guild ${guildId}` },
    });

    const channel = await prisma.discordChannel.upsert({
      where:  { channelId },
      update: { name, active: true },
      create: { guildId, channelId, name, type: "voice" },
    });

    const rule = await prisma.voiceRule.upsert({
      where:  { channelId: channel.id },
      update: { productId, durationMinutes, cooldownSeconds, maxPerDay, enabled, licensePrefix: licensePrefix ?? null },
      create: { channelId: channel.id, productId, durationMinutes, cooldownSeconds, maxPerDay, enabled, licensePrefix: licensePrefix ?? null },
    });

    return NextResponse.json({ data: { channel, rule } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const check = await requirePermission("discord:manage");
  if (!check.ok) return check.response;

  try {
    const { id, active, enabled, durationMinutes, cooldownSeconds, maxPerDay, licensePrefix, productId } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const channel = await prisma.discordChannel.update({
      where: { id },
      data:  { ...(active !== undefined ? { active } : {}) },
    });

    const ruleUpdates: Record<string, unknown> = {};
    if (enabled          !== undefined) ruleUpdates.enabled          = enabled;
    if (durationMinutes  !== undefined) ruleUpdates.durationMinutes  = durationMinutes;
    if (cooldownSeconds  !== undefined) ruleUpdates.cooldownSeconds  = cooldownSeconds;
    if (maxPerDay        !== undefined) ruleUpdates.maxPerDay        = maxPerDay;
    if (licensePrefix    !== undefined) ruleUpdates.licensePrefix    = licensePrefix;
    if (productId        !== undefined) ruleUpdates.productId        = productId;

    if (Object.keys(ruleUpdates).length > 0) {
      await prisma.voiceRule.upsert({
        where:  { channelId: id },
        update: ruleUpdates,
        create: { channelId: id, productId: productId ?? "", ...ruleUpdates },
      });
    }

    return NextResponse.json({ data: channel });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
