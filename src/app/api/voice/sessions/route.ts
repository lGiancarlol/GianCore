import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getVoiceSessions } from "@/services/voiceService";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const active = searchParams.get("active") === "true";
  const limit  = Number(searchParams.get("limit") ?? 50);

  const sessions = await getVoiceSessions(active, limit);
  return NextResponse.json({ data: sessions });
}
