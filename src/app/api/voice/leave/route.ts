import { NextResponse } from "next/server";
import { requireBotToken } from "@/lib/botAuth";
import { closeVoiceSession } from "@/services/voiceService";

export async function POST(req: Request) {
  const authError = requireBotToken(req);
  if (authError) return authError;

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
