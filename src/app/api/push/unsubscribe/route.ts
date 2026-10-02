import { NextResponse } from "next/server";
import { removeSubscriptionByEndpoint } from "@/lib/pushSubscriptions";

// Called when the user turns notifications off in Settings, so this
// device stops getting checked/notified going forward.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint } = (body ?? {}) as { endpoint?: unknown };
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await removeSubscriptionByEndpoint(endpoint);
  return NextResponse.json({ ok: true });
}
