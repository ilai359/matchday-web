import { NextResponse } from "next/server";
import { saveSubscription, StoredPushSubscription } from "@/lib/pushSubscriptions";

// Called by the browser right after it subscribes to push notifications
// (or whenever the user's followed clubs change while already
// subscribed - see updatePushClubs in pushClient.ts), to save/update
// which clubs this device should get goal alerts for.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subscription, clubIds } = (body ?? {}) as {
    subscription?: StoredPushSubscription;
    clubIds?: unknown;
  };

  if (
    !subscription ||
    typeof subscription.endpoint !== "string" ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== "string" ||
    typeof subscription.keys.auth !== "string" ||
    !Array.isArray(clubIds)
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const cleanClubIds = clubIds.filter((id): id is string => typeof id === "string");
  await saveSubscription(subscription, cleanClubIds);

  return NextResponse.json({ ok: true });
}
