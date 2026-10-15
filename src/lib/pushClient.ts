// Client-side helpers for turning goal-alert notifications on/off, used
// by the toggle in Settings. The actual sending happens server-side (see
// src/app/api/cron/check-goals/route.ts) - this file only handles the
// one-time permission/subscription dance and keeping the server's record
// of "which clubs does this device care about" in sync.
//
// Two kinds of device:
//   - a browser: standard web push (service worker + VAPID key)
//   - the iPhone app: the site runs inside a native container that has
//     no web push at all, so it registers with Apple's push service
//     through the Capacitor push plugin instead, and the server sends to
//     its device token (see src/lib/apns.ts).
// Every exported function below picks the right one automatically.

// ---------------------------------------------------------------------
// iPhone app (native) side
// ---------------------------------------------------------------------

// Only app builds that include the native half of this (build 2 and
// later - see capacitor.config.ts' appendUserAgent) add this marker to
// their user agent. Build 1 also has the push plugin compiled in but not
// the code that hands its device token back, so asking it to register
// would show the permission prompt and then silently never finish -
// those builds keep the old "not supported" message instead.
const NATIVE_PUSH_MARKER = "ClubsideNativePush";

const NATIVE_TOKEN_KEY = "clubside-apns-token";
const NATIVE_CLUBS_KEY = "clubside-apns-clubs";

type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string };

/** True inside the iPhone app at all, whether or not this build can do notifications yet. */
export function isInsideNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}

export function isNativePushApp(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(
    capacitor?.isNativePlatform?.() &&
      capacitor.getPlatform?.() === "ios" &&
      navigator.userAgent.includes(NATIVE_PUSH_MARKER)
  );
}

// Why the last attempt to turn notifications on didn't work, in plain
// words - shown under the toggle in Settings so a failure isn't silent.
let lastPushError: string | null = null;

export function getLastPushError(): string | null {
  return lastPushError;
}

function pushLog(message: string): void {
  // Shows up in Xcode's console when the app is run from Xcode.
  console.log(`[push] ${message}`);
}

// Returns the module, never the plugin object itself. Capacitor plugins
// are Proxies that answer to ANY property name - including "then" - so
// returning one from an async function (or resolving a promise with it)
// makes JavaScript treat it as a promise and wait on it forever. That's
// exactly what left the Settings toggle stuck on "Turning on…".
function loadPushModule() {
  return import("@capacitor/push-notifications");
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Not saved - worst case the app asks the system for its token again
    // next time, nothing breaks.
  }
}

async function nativePermission(): Promise<NotificationPermission> {
  const { PushNotifications: push } = await loadPushModule();
  const { receive } = await push.checkPermissions();
  if (receive === "granted") return "granted";
  if (receive === "denied") return "denied";
  return "default";
}

// Asks iOS for this device's push token. Resolves to null if
// registration fails or doesn't answer within 15 seconds.
async function registerNative(): Promise<string | null> {
  const { PushNotifications: push } = await loadPushModule();
  return new Promise<string | null>((resolve) => {
    let done = false;
    const handles: { remove: () => Promise<void> }[] = [];
    const finish = (token: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      handles.forEach((h) => h.remove().catch(() => {}));
      resolve(token);
    };
    const timer = setTimeout(() => {
      pushLog("timed out waiting for a device token");
      lastPushError = "iPhone didn't answer the notification registration in time.";
      finish(null);
    }, 15_000);

    Promise.all([
      push.addListener("registration", (token) => {
        pushLog("got device token from iOS");
        finish(token.value);
      }),
      push.addListener("registrationError", (error) => {
        pushLog(`registration error: ${error.error}`);
        lastPushError = `iPhone couldn't register for notifications (${error.error}).`;
        finish(null);
      }),
    ])
      .then((added) => {
        handles.push(...added);
        if (done) added.forEach((h) => h.remove().catch(() => {}));
        return push.register();
      })
      .catch((error) => {
        pushLog(`register() failed: ${String(error)}`);
        lastPushError = `Couldn't start notification registration (${String(error)}).`;
        finish(null);
      });
  });
}

async function sendNativeTokenToServer(token: string, clubIds: string[]): Promise<void> {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apnsToken: token, clubIds }),
  });
  if (!response.ok) {
    throw new Error(`server answered ${response.status}`);
  }
  writeLocal(NATIVE_TOKEN_KEY, token);
  writeLocal(NATIVE_CLUBS_KEY, JSON.stringify(clubIds));
}

async function removeNativeTokenFromServer(token: string): Promise<void> {
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apnsToken: token }),
  });
}

async function subscribeNative(clubIds: string[]): Promise<boolean> {
  lastPushError = null;
  const { PushNotifications: push } = await loadPushModule();
  let { receive } = await push.checkPermissions();
  pushLog(`permission before asking: ${receive}`);
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    ({ receive } = await push.requestPermissions());
    pushLog(`permission after asking: ${receive}`);
  }
  if (receive !== "granted") {
    lastPushError = "Notifications weren't allowed.";
    return false;
  }

  const token = await registerNative();
  if (!token) return false;
  try {
    await sendNativeTokenToServer(token, clubIds);
  } catch (error) {
    pushLog(`saving token failed: ${String(error)}`);
    lastPushError = "Couldn't reach Clubside's server - check your connection and try again.";
    return false;
  }
  pushLog("subscribed");
  return true;
}

/**
 * Called once each time the app starts (see NativePushBridge). iOS can
 * hand an app a new push token (after a restore, reinstall, etc.), so
 * if notifications are on, this re-registers and, if the token changed,
 * swaps the old one for the new one on the server - otherwise alerts
 * would quietly stop arriving.
 */
export async function refreshNativePushToken(): Promise<void> {
  if (!isNativePushApp()) return;
  const savedToken = readLocal(NATIVE_TOKEN_KEY);
  if (!savedToken) return;
  if ((await nativePermission()) !== "granted") return;

  const token = await registerNative();
  if (!token || token === savedToken) return;

  let clubIds: string[] = [];
  try {
    clubIds = JSON.parse(readLocal(NATIVE_CLUBS_KEY) ?? "[]");
  } catch {
    clubIds = [];
  }
  await sendNativeTokenToServer(token, clubIds);
  await removeNativeTokenFromServer(savedToken).catch(() => {});
}

// ---------------------------------------------------------------------
// Browser (web push) side
// ---------------------------------------------------------------------

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

function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window.PushManager !== "undefined" &&
    typeof window.Notification !== "undefined"
  );
}

async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
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

// ---------------------------------------------------------------------
// Public API (used by Settings and ClubsContext)
// ---------------------------------------------------------------------

export function isPushSupported(): boolean {
  return isNativePushApp() || isWebPushSupported();
}

/** "granted" / "denied" / "default" (not yet asked), or null if notifications aren't supported here. */
export async function getNotificationPermission(): Promise<NotificationPermission | null> {
  if (isNativePushApp()) {
    try {
      return await nativePermission();
    } catch {
      return null;
    }
  }
  if (!isWebPushSupported()) return null;
  return Notification.permission;
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (isNativePushApp()) {
    if (!readLocal(NATIVE_TOKEN_KEY)) return false;
    return (await getNotificationPermission()) === "granted";
  }
  const subscription = await getExistingSubscription();
  return subscription !== null;
}

/** Asks for notification permission (if not already granted/denied) and subscribes this device for the given clubs. Returns false if permission was denied or notifications aren't supported. */
export async function subscribeToPush(clubIds: string[]): Promise<boolean> {
  if (isNativePushApp()) {
    try {
      return await subscribeNative(clubIds);
    } catch (error) {
      pushLog(`subscribe failed: ${String(error)}`);
      lastPushError = `Something went wrong turning on alerts (${String(error)}).`;
      return false;
    }
  }

  if (!isWebPushSupported()) return false;
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
  if (isNativePushApp()) {
    const token = readLocal(NATIVE_TOKEN_KEY);
    if (!token) return;
    await sendNativeTokenToServer(token, clubIds);
    return;
  }
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  await sendSubscriptionToServer(subscription, clubIds);
}

export async function unsubscribeFromPush(): Promise<void> {
  if (isNativePushApp()) {
    const token = readLocal(NATIVE_TOKEN_KEY);
    if (!token) return;
    await removeNativeTokenFromServer(token);
    writeLocal(NATIVE_TOKEN_KEY, null);
    writeLocal(NATIVE_CLUBS_KEY, null);
    return;
  }

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

const AUTO_PROMPT_KEY = "matchday-push-auto-prompted";

/**
 * Called the moment someone follows their very first club - the
 * natural first time to ask for notification permission, instead of
 * only offering it once someone finds the toggle in Settings.
 *
 * Only ever tries this once per device, whatever the outcome (granted,
 * denied, or dismissed) - tracked in localStorage so it doesn't ask
 * again on every first-follow (e.g. after resetting followed clubs).
 * Settings keeps its own "Goal alerts" toggle for turning this on (or
 * back on) any time after, so nobody's stuck with whatever they chose
 * in this one moment.
 */
export async function maybeAskForNotificationsOnFirstFollow(clubId: string): Promise<void> {
  if (!isPushSupported()) return;

  try {
    if (localStorage.getItem(AUTO_PROMPT_KEY)) return;
    localStorage.setItem(AUTO_PROMPT_KEY, "1");
  } catch {
    // localStorage unavailable (private browsing etc.) - skip rather
    // than risk asking on every single "first" follow.
    return;
  }

  // Already answered before (e.g. via Settings, on another visit) -
  // nothing new to ask.
  if ((await getNotificationPermission()) !== "default") return;

  await subscribeToPush([clubId]);
}
