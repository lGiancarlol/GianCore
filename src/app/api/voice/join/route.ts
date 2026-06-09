import { NextResponse } from "next/server";
import { createVoiceSession } from "@/services/voiceService";

// Called by the Discord bot when a user joins a voice channel
// Body: { channelId: string, userId: string, username: string }
export async function POST(req: Request) {
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
  } catch (err) {
    console.error("[voice/join]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
