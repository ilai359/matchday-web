"use client";

import { useEffect } from "react";
import Link from "next/link";

// Next.js's file convention: catches an error thrown while rendering a
// page (a bug, an unexpected API shape, etc.) and shows this instead of
// crashing to a blank screen or Next's plain default error page. Matches
// the app's existing "not found" screens visually. Logging the error to
// the console (and, for anything thrown server-side, Vercel's logs) keeps
// it diagnosable without showing any of that detail to whoever hit it.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F5F6F8] px-5 text-center dark:bg-[#0B0D12]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl dark:bg-white/10">
        ⚠️
      </div>
      <h1 className="text-lg font-black text-[#111318] dark:text-white">
        Something went wrong
      </h1>
      <p className="max-w-xs text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        This page hit a snag loading. Give it another try, or head back to
        the home page.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl bg-[#111318] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] dark:bg-white dark:text-[#111318]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-2xl border border-black/[0.08] bg-white px-6 py-3 text-sm font-black text-[#111318] shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
