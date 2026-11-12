import type { CapacitorConfig } from "@capacitor/cli";

// Clubside's iPhone app. Since version 1.2 the screens are built into the
// app (the same Next.js site, built as plain files by
// scripts/build-app-bundle.mjs into out-app/ and ios/App/App/public) and
// only the data comes from the website's API. Newer screens are downloaded
// by the app itself (ScreensUpdater in ClubsideViewController.swift), so
// most changes still reach the app without a new App Store version.
// Versions up to 1.1 loaded the live website instead (server.url).
const config: CapacitorConfig = {
  appId: "com.ilai.clubside",
  appName: "Clubside",
  webDir: "out-app",
  ios: {
    contentInset: "automatic",
  },
  // Lets the live site tell this build apart from build 1, which has the
  // push plugin but not the native code that hands its device token back
  // (see AppDelegate.swift) - pushClient.ts only turns on app
  // notifications when it sees this marker. Bump the number if a future
  // build changes how native push works.
  // "ClubsideApp/N" (build 3 and later) tells the site this build has
  // Clubside's own native features - widget, calendar, vibrations, share
  // sheet (see src/lib/nativeApp.ts). 4 = built-in screens (1.2).
  appendUserAgent: "ClubsideNativePush/1 ClubsideApp/4",
  plugins: {
    PushNotifications: {
      // Show alerts even while the app is open on screen, not only when
      // it's in the background.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
