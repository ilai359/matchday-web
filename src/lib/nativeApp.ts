// The iPhone app's own native features (see
// ios/App/App/ClubsideNativePlugin.swift): home-screen widget data, Apple's
// "add to calendar" sheet, vibrations and the native share sheet.
//
// Only app builds that include that native code (1.1 build 3 and later)
// add "ClubsideApp/" to their user agent (capacitor.config.ts'
// appendUserAgent). Everywhere else - browsers, older app builds - every
// function here is a harmless no-op or returns false, so callers can use
// them without checking first.

const NATIVE_APP_MARKER = "ClubsideApp/";

type CapacitorGlobal = { isNativePlatform?: () => boolean };

export function hasNativeFeatures(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(
    capacitor?.isNativePlatform?.() && navigator.userAgent.includes(NATIVE_APP_MARKER)
  );
}

type ClubsideNativePlugin = {
  setWidgetData(options: { json: string }): Promise<void>;
  addToCalendar(options: {
    title: string;
    start: string;
    durationMinutes?: number;
    location?: string;
    notes?: string;
    url?: string;
  }): Promise<{ saved: boolean }>;
  haptic(options: { style: HapticStyle }): Promise<void>;
  shareImage(options: {
    base64?: string;
    filename?: string;
    text?: string;
    url?: string;
  }): Promise<{ completed: boolean }>;
};

export type HapticStyle =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error";

// Capacitor plugins are Proxies that answer to ANY property name -
// including "then" - so the plugin object itself is never returned from
// an async function or resolved from a promise (that hangs forever; see
// the same note in pushClient.ts). It's kept here and used directly.
let plugin: ClubsideNativePlugin | null = null;
let loading: Promise<void> | null = null;

function loadPlugin(): Promise<void> {
  if (plugin) return Promise.resolve();
  if (!loading) {
    loading = import("@capacitor/core").then(({ registerPlugin }) => {
      plugin = registerPlugin<ClubsideNativePlugin>("ClubsideNative");
    });
  }
  return loading;
}

/** A small vibration. Does nothing outside the iPhone app. */
export function haptic(style: HapticStyle = "light"): void {
  if (!hasNativeFeatures()) return;
  loadPlugin()
    .then(() => plugin?.haptic({ style }))
    .catch(() => {});
}

/** Opens Apple's add-event sheet. Resolves true if the match was saved. */
export async function addMatchToCalendar(event: {
  title: string;
  start: string;
  durationMinutes?: number;
  location?: string;
  notes?: string;
  url?: string;
}): Promise<boolean> {
  if (!hasNativeFeatures()) return false;
  await loadPlugin();
  if (!plugin) return false;
  const result = await plugin.addToCalendar(event);
  return Boolean(result?.saved);
}

/** The iPhone share sheet with an image. Returns false if it couldn't open. */
export async function shareImageNatively(
  blob: Blob,
  filename: string,
  text: string
): Promise<boolean> {
  if (!hasNativeFeatures()) return false;
  try {
    await loadPlugin();
    if (!plugin) return false;
    const base64 = await blobToBase64(blob);
    await plugin.shareImage({ base64, filename, text });
    return true;
  } catch {
    return false;
  }
}

/** Saves the followed clubs (and their matches) for the home-screen widget. */
export async function saveWidgetData(clubIds: string[], payload: unknown): Promise<void> {
  if (!hasNativeFeatures()) return;
  await loadPlugin();
  if (!plugin) return;
  await plugin.setWidgetData({ json: JSON.stringify({ clubIds, payload }) });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** A calendar file, for adding a match to the calendar outside the app. */
export function downloadCalendarFile(event: {
  id: string;
  title: string;
  start: string;
  durationMinutes?: number;
  location?: string;
  notes?: string;
  url?: string;
}): void {
  const start = new Date(event.start);
  const end = new Date(start.getTime() + (event.durationMinutes ?? 120) * 60 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clubside//Match//EN",
    "BEGIN:VEVENT",
    `UID:clubside-${event.id}@clubside`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
    ...(event.notes ? [`DESCRIPTION:${escape(event.notes)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clubside-match-${event.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
