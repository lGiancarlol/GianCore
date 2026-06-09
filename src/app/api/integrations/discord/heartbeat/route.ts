import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called by the Discord bot every 60s
// Auth: Bearer token from API_TOKEN env var
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token      = authHeader.replace("Bearer ", "").trim();

  if (!token || token !== process.env.API_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { status = "online", uptime = 0, guilds = 0, sessions = 0, timestamp } = body;

  // Upsert a Setting row that stores the last heartbeat
  await prisma.setting.upsert({
    where:  { key: "discord_bot_heartbeat" },
    update: {
      value: {
        status,
        uptime,
        guilds,
        sessions,
        lastSeen:  timestamp ?? new Date().toISOString(),
      },
    },
    create: {
      key:   "discord_bot_heartbeat",
      value: {
        status,
        uptime,
        guilds,
        sessions,
        lastSeen: timestamp ?? new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({ ok: true });
}

// GET — dashboard polls this to check bot status
export async function GET(req: Request) {
  const session_header = req.headers.get("authorization");
  // Allow unauthenticated GET for dashboard polling, but only return safe fields
  const setting = await prisma.setting.findUnique({
    where: { key: "discord_bot_heartbeat" },
  });

  if (!setting) {
    return NextResponse.json({ data: { online: false, lastSeen: null } });
  }

  const hb      = setting.value as Record<string, unknown>;
  const lastSeen = hb.lastSeen as string | null;
  const online   = lastSeen
    ? Date.now() - new Date(lastSeen).getTime() < 90_000  // online if < 90s ago
    : false;

  return NextResponse.json({
    data: {
      online,
      status:   hb.status   ?? "unknown",
      uptime:   hb.uptime   ?? 0,
      guilds:   hb.guilds   ?? 0,
      sessions: hb.sessions ?? 0,
      lastSeen,
    },
  });
}
