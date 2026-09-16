"use client";

import Link from "next/link";
import { useTheme } from "../../context/ThemeContext";
import { useClubs } from "../../context/ClubsContext";
import { clubs } from "../../data/clubs";
import ClubBadge from "../../components/ClubBadge";

const TOTAL_LEAGUES = new Set(clubs.map((club) => club.league)).size;
const TOTAL_COUNTRIES = new Set(clubs.map((club) => club.country)).size;

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { selectedIds, resetClubs } = useClubs();

  const followedClubs = clubs.filter((club) => selectedIds.includes(club.id));
  const followedLeagues = [...new Set(followedClubs.map((club) => club.league))];
  const previewClubs = followedClubs.slice(0, 6);
  const extraCount = followedClubs.length - previewClubs.length;

  function handleReset() {
    const confirmed = window.confirm(
      "Unfollow all your clubs? You can always follow them again from My Clubs."
    );
    if (confirmed) {
      resetClubs();
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24 dark:bg-[#0B0D12]">
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 pt-10">
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
            Account
          </div>
          <h1 className="text-[36px] font-black leading-none tracking-[-0.05em]">
            Settings
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-5 text-white/45">
            Manage how Clubside looks and works.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Your Clubs
          </h2>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            {followedClubs.length > 0 ? (
              <div className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {previewClubs.map((club) => (
                    <ClubBadge
                      key={club.id}
                      name={club.name}
                      crest={club.crest}
                      color={club.primaryColor}
                      size={38}
                    />
                  ))}
                  {extraCount > 0 && (
                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-2xl bg-[#F2F4F7] text-xs font-black text-zinc-400 dark:bg-white/[0.06] dark:text-zinc-500">
                      +{extraCount}
                    </div>
                  )}
                </div>

                <div className="mt-3 text-sm font-black text-[#111318] dark:text-white">
                  {followedClubs.length}{" "}
                  {followedClubs.length === 1 ? "club" : "clubs"} followed
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                  Across {followedLeagues.length}{" "}
                  {followedLeagues.length === 1 ? "league" : "leagues"}:{" "}
                  {followedLeagues.join(", ")}
                </div>

                <Link
                  href="/clubs"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400"
                >
                  Manage clubs →
                </Link>
              </div>
            ) : (
              <div className="px-5 py-5 text-center">
                <div className="text-sm font-black text-[#111318] dark:text-white">
                  You&apos;re not following any clubs yet
                </div>
                <div className="mx-auto mt-1 max-w-[240px] text-[11px] font-medium leading-relaxed text-zinc-400 dark:text-zinc-500">
                  Follow clubs to get their fixtures, results, and news here.
                </div>
                <Link
                  href="/clubs"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#111318] px-5 py-2.5 text-xs font-black text-white dark:bg-white dark:text-[#111318]"
                >
                  Follow your first club
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Appearance
          </h2>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-lg dark:bg-white/[0.06]">
                  ☀️
                </div>
                <div>
                  <div className="text-sm font-black text-[#111318] dark:text-white">
                    Light
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    Bright and clean
                  </div>
                </div>
              </div>
              {theme === "light" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111318] dark:bg-white">
                  <div className="h-2 w-2 rounded-full bg-white dark:bg-[#0B0D12]" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-200 dark:border-white/15" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className="flex w-full items-center justify-between border-t border-zinc-100 px-5 py-4 text-left dark:border-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-lg dark:bg-white/[0.06]">
                  🌙
                </div>
                <div>
                  <div className="text-sm font-black text-[#111318] dark:text-white">
                    Dark
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    Easier at night
                  </div>
                </div>
              </div>
              {theme === "dark" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111318] dark:bg-white">
                  <div className="h-2 w-2 rounded-full bg-white dark:bg-[#0B0D12]" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-200 dark:border-white/15" />
              )}
            </button>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Data
          </h2>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <button
              type="button"
              onClick={handleReset}
              disabled={selectedIds.length === 0}
              className="flex w-full items-center justify-between px-5 py-4 text-left disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-lg dark:bg-white/[0.06]">
                  🗑️
                </div>
                <div>
                  <div className="text-sm font-black text-[#DC2626] dark:text-red-400">
                    Unfollow all clubs
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    Clears your followed clubs on this device
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Coverage
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[22px] border border-black/[0.045] bg-white px-3 py-4 text-center shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
              <div className="text-2xl font-black text-[#111318] dark:text-white">
                {clubs.length}
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Clubs
              </div>
            </div>
            <div className="rounded-[22px] border border-black/[0.045] bg-white px-3 py-4 text-center shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
              <div className="text-2xl font-black text-[#111318] dark:text-white">
                {TOTAL_LEAGUES}
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Leagues
              </div>
            </div>
            <div className="rounded-[22px] border border-black/[0.045] bg-white px-3 py-4 text-center shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
              <div className="text-2xl font-black text-[#111318] dark:text-white">
                {TOTAL_COUNTRIES}
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Countries
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            About
          </h2>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                Clubside
              </span>
              <span className="text-sm font-black text-[#111318] dark:text-white">
                v1.0
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4 dark:border-white/[0.06]">
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                Data source
              </span>
              <span className="text-sm font-black text-[#111318] dark:text-white">
                football-data.org
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
