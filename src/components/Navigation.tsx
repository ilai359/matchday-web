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
        className="fixed bottom-20 left-5 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition active:scale-95"
        style={{
          backgroundColor: isProfileActive ? "#2563EB" : "#111318",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        <ProfileIcon />
      </Link>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 flex justify-around py-3"
        style={{
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          WebkitBackfaceVisibility: "hidden",
          backfaceVisibility: "hidden",
          isolation: "isolate",
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`text-sm font-medium ${
                isActive ? "text-black" : "text-[#6B6B6B]"
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