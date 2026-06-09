import { NextResponse } from "next/server";
import { closeVoiceSession } from "@/services/voiceService";

// Called by the Discord bot when a user leaves a voice channel
// Body: { channelId: string, userId: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { channelId, userId } = body;

    if (!channelId || !userId) {
      return NextResponse.json(
        { error: "channelId and userId are required" },
        { status: 400 },
      );
    }

    const ip     = req.headers.get("x-forwarded-for") ?? undefined;
    const result = await closeVoiceSession(channelId, userId, ip);

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 404 });
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[voice/leave]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
