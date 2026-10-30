"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativePushApp, refreshNativePushToken } from "../lib/pushClient";
import { haptic } from "../lib/nativeApp";

// iPhone app only (a no-op in browsers): when someone taps a goal/kickoff
// notification, open the match it's about - the server puts that page's
// path in the notification as `url` (see src/lib/apns.ts). Also refreshes
// this device's push token once per launch, in case iOS issued a new one.
export default function NativePushBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativePushApp()) return;

    let removed = false;
    let handle: { remove: () => Promise<void> } | null = null;
    let receivedHandle: { remove: () => Promise<void> } | null = null;

    import("@capacitor/push-notifications")
      .then(({ PushNotifications }) =>
        PushNotifications.addListener("pushNotificationReceived", () => {
          haptic("success");
        })
      )
      .then((h) => {
        if (removed) h.remove().catch(() => {});
        else receivedHandle = h;
      })
      .catch(() => {});

    import("@capacitor/push-notifications")
      .then(({ PushNotifications }) =>
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const url = action.notification?.data?.url;
          // Only ever navigate within the app itself.
          if (typeof url === "string" && url.startsWith("/")) {
            router.push(url);
          }
        })
      )
      .then((h) => {
        if (removed) h.remove().catch(() => {});
        else handle = h;
      })
      .catch(() => {});

    refreshNativePushToken().catch(() => {});

    return () => {
      removed = true;
      handle?.remove().catch(() => {});
      receivedHandle?.remove().catch(() => {});
    };
  }, [router]);

  return null;
}
