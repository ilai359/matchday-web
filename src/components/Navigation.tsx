"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const tabs = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/updates", label: "Updates" },
  { href: "/clubs", label: "Clubs" },
];
export default function Navigation() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 flex justify-around py-3"
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
  );
}