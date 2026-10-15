// One place that knows how to deliver a notification to any kind of
// subscribed device - a browser (web push) or the iPhone app (APNs) -
// so check-goals and the manual test route can't drift apart on how
// either is sent or when a dead subscription gets cleaned up.
//
// Server-only.

import webpush from "web-push";
import { PushSubscriptionRecord, removeRecord } from "@/lib/pushSubscriptions";
import { isApnsConfigured, sendApnsNotification } from "@/lib/apns";

export type PushMessage = { title: string; body: string; url: string };

export type SendOutcome = "sent" | "removed" | "skipped" | "error";

/**
 * Sends `message` to one device. `webPushReady` says whether web push was
 * configured successfully this run (webpush.setVapidDetails didn't
 * throw). A device that's no longer valid is removed from storage and
 * reported as "removed"; one that can't be sent to right now because its
 * channel isn't configured is "skipped".
 */
export async function sendToDevice(
  record: PushSubscriptionRecord,
  message: PushMessage,
  webPushReady: boolean
): Promise<SendOutcome> {
  if (record.apnsToken) {
    if (!isApnsConfigured()) return "skipped";
    const result = await sendApnsNotification(record.apnsToken, message);
    if (result === "gone") {
      await removeRecord(record);
      return "removed";
    }
    return result === "sent" ? "sent" : "error";
  }

  if (record.subscription) {
    if (!webPushReady) return "skipped";
    try {
      await webpush.sendNotification(record.subscription, JSON.stringify(message));
      return "sent";
    } catch (error) {
      // 404/410 means the browser subscription is no longer valid (the
      // user cleared data or revoked permission).
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await removeRecord(record);
        return "removed";
      }
      console.error("pushSend: web push failed", error);
      return "error";
    }
  }

  return "skipped";
}
