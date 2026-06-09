import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { getVoiceSessions } from "@/services/voiceService";

export async function GET(req: Request) {
  const check = await requirePermission("discord:view");
  if (!check.ok) return check.response;

  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active") === "true";
    const limit  = Math.min(Number(searchParams.get("limit") ?? 50), 200);

    const sessions = await getVoiceSessions(active, limit);
    return NextResponse.json({ data: sessions });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
