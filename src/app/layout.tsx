import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClubsProvider } from "../context/ClubsContext";
import { ThemeProvider } from "../context/ThemeContext";
import Navigation from "../components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clubside",
  description: "Never miss what matters.",
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
                if (theme === "dark") {
                  document.documentElement.classList.add("dark");
                }
              } catch (e) {}
            `,
          }}
        />
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