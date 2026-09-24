import Link from "next/link";

// Next.js's file convention: shown automatically for any URL that doesn't
// match a route, or wherever code calls notFound(). Matches the style of
// the "Match not found" / "Club not found" screens already used elsewhere
// in the app, instead of falling back to Next's plain default 404.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F5F6F8] px-5 text-center dark:bg-[#0B0D12]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl dark:bg-white/10">
        ⚽
      </div>
      <h1 className="text-lg font-black text-[#111318] dark:text-white">
        Page not found
      </h1>
      <p className="max-w-xs text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        This page doesn&apos;t exist, or the link is out of date.
      </p>
      <Link
        href="/"
        className="rounded-2xl bg-[#111318] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] dark:bg-white dark:text-[#111318]"
      >
        Back to Clubside
      </Link>
    </main>
  );
}
