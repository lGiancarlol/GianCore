import { NextResponse } from "next/server";
import { requireBotToken } from "@/lib/botAuth";
import { createVoiceSession } from "@/services/voiceService";

export async function POST(req: Request) {
  const authError = requireBotToken(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { channelId, userId, username } = body;

    if (!channelId || !userId || !username) {
      return NextResponse.json(
        { error: "channelId, userId and username are required" },
        { status: 400 },
      );
    }

    const ip     = req.headers.get("x-forwarded-for") ?? undefined;
    const result = await createVoiceSession(channelId, userId, username, ip);

    if (!result.ok) {
      const STATUS: Record<string, number> = {
        invalid_channel:  404,
        channel_disabled: 403,
        cooldown:         429,
        daily_limit:      429,
        already_active:   409,
      };
      return NextResponse.json(
        { error: result.reason },
        { status: STATUS[result.reason] ?? 400 },
      );
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
