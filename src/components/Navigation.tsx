"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/updates", label: "Updates" },
  { href: "/clubs", label: "Clubs" },
];

function ProfileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const isProfileActive = pathname === "/settings";

  return (
    <>
      <Link
        href="/settings"
        aria-label="Profile and settings"
        className="fixed left-5 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition active:scale-95"
        style={{
          backgroundColor: isProfileActive ? "#2563EB" : "#111318",
          // Stays clear of the nav bar below (see its own comment) on
          // every device, including the ones with an iPhone-style home
          // indicator that the nav bar's padding now leaves room for.
          bottom: "calc(4.25rem + env(safe-area-inset-bottom, 0px))",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        <ProfileIcon />
      </Link>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-zinc-200 bg-white pt-1.5 dark:border-white/10 dark:bg-[#0B0D12]"
        style={{
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          WebkitBackfaceVisibility: "hidden",
          backfaceVisibility: "hidden",
          isolation: "isolate",
          // The bar was sitting right at the very bottom edge with almost
          // no padding, which made it both cramped and, on an iPhone with
          // a home indicator, partly under it - easy to miss-tap. This
          // keeps the original 0.75rem of breathing room and adds
          // whatever extra the device's home indicator needs on top of
          // it (0 on a device without one).
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              // Extra vertical padding here (not just on <nav>) so each
              // tab's own tap target is taller, not only the bar around
              // it - the text itself was the entire clickable area before.
              className={`px-1 py-1.5 text-sm font-medium ${
                isActive
                  ? "text-black dark:text-white"
                  : "text-[#6B6B6B] dark:text-zinc-500"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}