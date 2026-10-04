import { NextResponse } from "next/server";
import webpush from "web-push";
import { getAllSubscriptions, removeSubscriptionByEndpoint } from "@/lib/pushSubscriptions";

// Manual "send a test notification to every current subscriber" route -
// not part of the goal/kickoff system itself (see /api/cron/check-goals),
// just a way to check that push actually reaches a device without
// waiting for a real match to kick off. Visit it in a browser (or open
// the URL) with the same secret value set for GOALS_CRON_SECRET in
// Vercel: /api/push/test?secret=...
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
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return NextResponse.json(
      { error: "Missing required environment variables" },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const subscriptions = await getAllSubscriptions();
  const payload = JSON.stringify({
    title: "🔔 Test notification",
    body: "If you can see this, push notifications are working.",
    url: "/",
  });

  let sent = 0;
  let removed = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await removeSubscriptionByEndpoint(sub.subscription.endpoint);
        removed += 1;
      } else {
        console.error("push/test: sendNotification failed", error);
      }
    }
  }

  return NextResponse.json({ subscribers: subscriptions.length, sent, removed });
}
