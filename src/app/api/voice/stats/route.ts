import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getVoiceStats, getActiveCooldowns } from "@/services/voiceService";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeCooldowns = searchParams.get("cooldowns") === "true";

  const [stats, cooldowns] = await Promise.all([
    getVoiceStats(),
    includeCooldowns ? getActiveCooldowns() : Promise.resolve([]),
  ]);

  return NextResponse.json({ data: { stats, cooldowns } });
}
