import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ClubsProvider } from "../context/ClubsContext";
import { ThemeProvider } from "../context/ThemeContext";
import Navigation from "../components/Navigation";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import NativePushBridge from "../components/NativePushBridge";
import AppScreensReady from "../components/AppScreensReady";

// The Geist font files come with the app's own code (the "geist" package)
// rather than from Google Fonts, so the iPhone app's built-in screens have
// them without the internet.
const geistSans = GeistSans;
const geistMono = GeistMono;

const SITE_URL = "https://matchday-web-zeta.vercel.app";
const CLUBSIDE_DESCRIPTION =
  "Clubside is a football app that shows your clubs' matches, live scores, tables and news in one place, with alerts so you never miss what matters.";

// Facts about the app in a format search engines and AI assistants read
// (schema.org). Only true facts here - no made-up ratings or reviews.
const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Clubside",
  description: CLUBSIDE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "SportsApplication",
  operatingSystem: "iOS, Web",
  publisher: {
    "@type": "Organization",
    name: "Tidewave Games",
    email: "tidewavegames@gmail.com",
  },
};

export const metadata: Metadata = {
  title: "Clubside",
  // One clear sentence about the app, so search engines and AI assistants
  // can describe it correctly. Keep it the same as the App Store text.
  description: CLUBSIDE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "Clubside",
    description: CLUBSIDE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Clubside",
    type: "website",
  },
  // Lets "Add to Home Screen" on iOS open the app full-screen (no Safari
  // address bar/tabs) instead of just bookmarking the page. The app icon
  // itself already comes from apple-icon.png via Next's file convention -
  // this only affects how it behaves once opened. "default" status bar
  // (rather than an overlay style) avoids clipping content under the
  // notch.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Clubside",
  },
};

export const viewport: Viewport = {
  // Matches the dark background used elsewhere in the app - colors the
  // browser/OS chrome (e.g. Android's toolbar) when installed.
  themeColor: "#0B0D12",
  // Lets the page draw behind the iPhone home indicator instead of Safari
  // reserving a plain white/black strip there - required for the bottom
  // nav bar's own safe-area padding (see Navigation.tsx) to have any
  // effect. Without this, env(safe-area-inset-bottom) is always 0.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem("matchday-theme");
                if (theme !== "light") {
                  document.documentElement.classList.add("dark");
                }
              } catch (e) {}
              // Inside the iPhone app: behave like an app, not a web
              // page - no link previews on long-press, no text
              // selection, no pinch-zoom (see .native-app in globals.css).
              try {
                if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
                  document.documentElement.classList.add("native-app");
                  var vp = document.querySelector('meta[name="viewport"]');
                  if (vp && vp.content.indexOf("user-scalable") === -1) {
                    vp.setAttribute("content", vp.content + ", maximum-scale=1, user-scalable=no");
                  }
                }
              } catch (e) {}
              // iPhone app 1.2 and later: the screens are stored on the
              // phone (capacitor://localhost), but the API stays on the
              // website - send every /api/ request there.
              try {
                if (location.protocol === "capacitor:") {
                  var SITE = "https://matchday-web-zeta.vercel.app";
                  var nativeFetch = window.fetch.bind(window);
                  window.fetch = function (input, init) {
                    try {
                      if (typeof input === "string" && input.indexOf("/api/") === 0) {
                        input = SITE + input;
                        // Sent as plain text, iOS skips an extra permission
                        // check before each POST - the API reads the JSON
                        // body the same either way.
                        if (init && init.body && init.headers) {
                          var h = new Headers(init.headers);
                          if ((h.get("content-type") || "").indexOf("application/json") === 0) {
                            h.set("content-type", "text/plain;charset=UTF-8");
                            init = Object.assign({}, init, { headers: h });
                          }
                        }
                      }
                    } catch (e) {}
                    return nativeFetch(input, init);
                  };
                }
              } catch (e) {}
              // First start of app 1.2: clubs, tips and settings saved by
              // the older app (which loaded the website) are moved over
              // once. The screen stays hidden for that second.
              try {
                if (location.protocol === "capacitor:" && !localStorage.getItem("clubside-data-moved")) {
                  var cap = window.Capacitor;
                  if (cap && cap.nativePromise) {
                    var root = document.documentElement;
                    var show = function () { root.classList.remove("moving-data"); };
                    root.classList.add("moving-data");
                    var safety = setTimeout(show, 8000);
                    cap.nativePromise("ClubsideNative", "getOldAppData", {}).then(function (r) {
                      clearTimeout(safety);
                      if (!r || !r.checked) { show(); return; }
                      var old = {};
                      try { old = JSON.parse(r.json || "{}") || {}; } catch (e) {}
                      // The older app's data wins: anything here is only
                      // from the last few seconds of this very first start.
                      var moved = 0;
                      for (var k in old) {
                        if (Object.prototype.hasOwnProperty.call(old, k)) {
                          localStorage.setItem(k, String(old[k]));
                          moved++;
                        }
                      }
                      localStorage.setItem("clubside-data-moved", "1");
                      if (moved > 0) location.replace("/");
                      else show();
                    }, function () { clearTimeout(safety); show(); });
                  }
                }
              } catch (e) {}
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
        <ServiceWorkerRegister />
        <NativePushBridge />
        <AppScreensReady />
        <ThemeProvider>
          <ClubsProvider>
            <div
              className="flex-1 bg-[#F5F6F8] dark:bg-[#0B0D12]"
              // Reserves enough space above the fixed nav bar (see
              // Navigation.tsx) so page content never sits underneath it -
              // an inline style rather than a Tailwind class since it
              // needs the same env(safe-area-inset-bottom) calc the nav
              // bar itself uses, kept in sync with its height.
              style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
            >
              {children}
            </div>
            <Navigation />
          </ClubsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}