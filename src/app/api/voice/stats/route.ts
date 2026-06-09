import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireBotToken } from "@/lib/botAuth";
import { getVoiceStats, getActiveCooldowns } from "@/services/voiceService";

export async function GET(req: Request) {
  // Allow both: dashboard session OR bot Bearer token
  const session  = await auth();
  const botError = requireBotToken(req);
  if (!session && botError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const includeCooldowns = searchParams.get("cooldowns") === "true";

    const [stats, cooldowns] = await Promise.all([
      getVoiceStats(),
      includeCooldowns ? getActiveCooldowns() : Promise.resolve([]),
    ]);

    return NextResponse.json({ data: { stats, cooldowns } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
