import { NextResponse } from "next/server";
import { removeSubscriptionByEndpoint, removeApnsToken } from "@/lib/pushSubscriptions";

// Called when the user turns notifications off in Settings, so this
// device stops getting checked/notified going forward. Takes a browser's
// web push `endpoint`, or the iPhone app's `apnsToken`.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, apnsToken } = (body ?? {}) as { endpoint?: unknown; apnsToken?: unknown };
  if (typeof apnsToken === "string") {
    await removeApnsToken(apnsToken);
    return NextResponse.json({ ok: true });
  }
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await removeSubscriptionByEndpoint(endpoint);
  return NextResponse.json({ ok: true });
}
