import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { providerRegistry } from "@/providers";
import type { UserProviderActions } from "@/providers/types";
import { createProviderLog } from "@/services/providerService";

type Action = "query" | "activate" | "deactivate" | "reset_ip" | "click_button";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requirePermission("licenses:manage");
  if (!check.ok) return check.response;
  const { id } = await params;

  const { action, key, messageId, buttonText, keyPattern } = await req.json() as {
    action:       Action;
    key?:         string;
    messageId?:   number;
    buttonText?:  string;
    keyPattern?:  string;
  };

  const provider = providerRegistry.get(id);
  if (!provider) {
    return NextResponse.json({ ok: false, error: "Provider not registered in runtime" }, { status: 404 });
  }

  // Check if provider supports user actions
  const userProvider = provider as unknown as UserProviderActions;
  if (typeof userProvider.queryKey !== "function") {
    return NextResponse.json({ ok: false, error: "Provider does not support key actions" }, { status: 400 });
  }

  try {
    let result;

    switch (action) {
      case "query":
        if (!key) return NextResponse.json({ ok: false, error: "key is required" }, { status: 400 });
        result = await userProvider.queryKey(key);
        break;
      case "activate":
        if (!key) return NextResponse.json({ ok: false, error: "key is required" }, { status: 400 });
        result = await userProvider.activateKey(key);
        break;
      case "deactivate":
        if (!key) return NextResponse.json({ ok: false, error: "key is required" }, { status: 400 });
        result = await userProvider.deactivateKey(key);
        break;
      case "reset_ip":
        if (!key) return NextResponse.json({ ok: false, error: "key is required" }, { status: 400 });
        result = await userProvider.resetIp(key);
        break;
      case "click_button":
        if (!messageId || !buttonText) {
          return NextResponse.json({ ok: false, error: "messageId and buttonText are required" }, { status: 400 });
        }
        result = await userProvider.clickButton(messageId, buttonText, keyPattern);
        break;
      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    await createProviderLog({
      providerId: id,
      action:     `key_action:${action}`,
      request:    { action, key, messageId, buttonText },
      response:   result.ok ? { raw: result.raw } : undefined,
      error:      result.error,
    });

    return NextResponse.json(result);

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await createProviderLog({ providerId: id, action: `key_action:${action}`, error });
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
