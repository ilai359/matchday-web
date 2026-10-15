import { NextResponse } from "next/server";
import { saveSubscription, saveApnsToken, StoredPushSubscription } from "@/lib/pushSubscriptions";

// Called right after a device turns on notifications (or whenever the
// user's followed clubs change while already subscribed - see
// updatePushClubs in pushClient.ts), to save/update which clubs this
// device should get alerts for. Accepts either a browser's web push
// subscription or, from the iPhone app, an Apple push device token.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subscription, apnsToken, clubIds } = (body ?? {}) as {
    subscription?: StoredPushSubscription;
    apnsToken?: unknown;
    clubIds?: unknown;
  };

  if (!Array.isArray(clubIds)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const cleanClubIds = clubIds.filter((id): id is string => typeof id === "string");

  // Apple device tokens are hex strings (64 characters today; allowed to
  // be longer in future).
  if (apnsToken !== undefined) {
    if (typeof apnsToken !== "string" || !/^[0-9a-fA-F]{64,200}$/.test(apnsToken)) {
      return NextResponse.json({ error: "Invalid device token" }, { status: 400 });
    }
    await saveApnsToken(apnsToken, cleanClubIds);
    return NextResponse.json({ ok: true });
  }

  if (
    !subscription ||
    typeof subscription.endpoint !== "string" ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== "string" ||
    typeof subscription.keys.auth !== "string"
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await saveSubscription(subscription, cleanClubIds);
  return NextResponse.json({ ok: true });
}
