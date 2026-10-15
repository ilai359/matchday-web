import type { CapacitorConfig } from "@capacitor/cli";

// This turns Clubside into a real iOS app WITHOUT rebuilding it. server.url
// points the native app straight at the live, already-deployed site - every
// API route, the Redis cache, everything already working on Vercel keeps
// working exactly as-is. The app is a thin native wrapper, not a copy: it
// gets a real app icon, launches full-screen with no browser chrome, shows
// up on the App Store, and - the actual point of doing this - can receive
// real Apple Push Notifications even when the app (or the phone) is fully
// closed, which Safari web push on iOS can't reliably do.
const config: CapacitorConfig = {
  appId: "com.ilai.clubside",
  appName: "Clubside",
  // Required by the Capacitor CLI even though server.url below means this
  // folder's content is never actually shown - see capacitor-shell/index.html.
  webDir: "capacitor-shell",
  server: {
    url: "https://matchday-web-zeta.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
  // Lets the live site tell this build apart from build 1, which has the
  // push plugin but not the native code that hands its device token back
  // (see AppDelegate.swift) - pushClient.ts only turns on app
  // notifications when it sees this marker. Bump the number if a future
  // build changes how native push works.
  appendUserAgent: "ClubsideNativePush/1",
  plugins: {
    PushNotifications: {
      // Show alerts even while the app is open on screen, not only when
      // it's in the background.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
