// Browser-side helpers for turning goal-alert push notifications on/off,
// used by the toggle in Settings. The actual sending happens server-side
// (see src/app/api/cron/check-goals/route.ts) - this file only handles
// the one-time browser permission/subscription dance and keeping the
// server's record of "which clubs does this device care about" in sync.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window.PushManager !== "undefined" &&
    typeof window.Notification !== "undefined"
  );
}

/** "granted" / "denied" / "default" (not yet asked) - mirrors the browser's own Notification.permission. */
export function getNotificationPermission(): NotificationPermission | null {
  if (!isPushSupported()) return null;
  return Notification.permission;
}

async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function hasActivePushSubscription(): Promise<boolean> {
  const subscription = await getExistingSubscription();
  return subscription !== null;
}

async function sendSubscriptionToServer(
  subscription: PushSubscription,
  clubIds: string[]
): Promise<void> {
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), clubIds }),
  });
}

/** Asks for notification permission (if not already granted/denied) and subscribes this device for the given clubs. Returns false if permission was denied or push isn't supported. */
export async function subscribeToPush(clubIds: string[]): Promise<boolean> {
  if (!isPushSupported()) return false;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast needed because TypeScript's DOM lib types
      // PushSubscriptionOptionsInit.applicationServerKey as
      // ArrayBufferView<ArrayBuffer> specifically, while a plain
      // Uint8Array is typed as ArrayBufferView<ArrayBufferLike> - a real
      // Uint8Array works fine here at runtime regardless.
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  await sendSubscriptionToServer(subscription, clubIds);
  return true;
}

/** Keeps an already-subscribed device's club list in sync (e.g. after following/unfollowing a club) without asking for permission again. No-op if this device isn't subscribed. */
export async function updatePushClubs(clubIds: string[]): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  await sendSubscriptionToServer(subscription, clubIds);
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}
