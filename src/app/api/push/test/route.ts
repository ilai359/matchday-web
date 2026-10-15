import { NextResponse } from "next/server";
import webpush from "web-push";
import { getAllSubscriptions } from "@/lib/pushSubscriptions";
import { sendToDevice } from "@/lib/pushSend";
import { isApnsConfigured } from "@/lib/apns";

// Manual "send a test notification to every current subscriber" route -
// not part of the goal/kickoff system itself (see /api/cron/check-goals),
// just a way to check that push actually reaches a device without
// waiting for a real match to kick off. Covers both browsers (web push)
// and the iPhone app (APNs). Visit it in a browser with the same secret
// value set for GOALS_CRON_SECRET in Vercel: /api/push/test?secret=...
//
// Gated behind that secret rather than left open, since this is a public
// URL once deployed - without a check, anyone who found it could spam a
// push notification to every subscriber.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!process.env.GOALS_CRON_SECRET || secret !== process.env.GOALS_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  let webPushReady = false;
  if (vapidPublic && vapidPrivate && vapidSubject) {
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
      webPushReady = true;
    } catch (error) {
      console.error("push/test: VAPID keys rejected", error);
    }
  }

  const subscriptions = await getAllSubscriptions();
  const message = {
    title: "🔔 Test notification",
    body: "If you can see this, push notifications are working.",
    url: "/",
  };

  const counts = { sent: 0, removed: 0, skipped: 0, error: 0 };
  for (const sub of subscriptions) {
    const outcome = await sendToDevice(sub, message, webPushReady);
    counts[outcome] += 1;
  }

  return NextResponse.json({
    subscribers: subscriptions.length,
    appSubscribers: subscriptions.filter((s) => s.apnsToken).length,
    webPushReady,
    apnsConfigured: isApnsConfigured(),
    ...counts,
  });
}
