import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { getProviders, createProvider } from "@/services/providerService";

export async function GET() {
  const check = await requirePermission("licenses:view");
  if (!check.ok) return check.response;
  try {
    const data = await getProviders();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  try {
    const { name, type, config, active } = await req.json();
    if (!name || !type || !config) {
      return NextResponse.json({ error: "name, type and config are required" }, { status: 400 });
    }
    const data = await createProvider({ name, type, config, active });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
