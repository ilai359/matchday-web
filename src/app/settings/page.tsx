"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "../../context/ThemeContext";
import { useClubs } from "../../context/ClubsContext";
import { clubs, Club } from "../../data/clubs";
import ClubBadge from "../../components/ClubBadge";
import {
  fetchStandings,
  applyClubTieBreak,
  LEAGUE_TO_CODE,
  StandingsRow,
} from "../../lib/footballApi";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { selectedIds, resetClubs } = useClubs();

  const followedClubs = clubs.filter((club) => selectedIds.includes(club.id));
  const followedLeagues = [...new Set(followedClubs.map((club) => club.league))];
  const previewClubs = followedClubs.slice(0, 6);
  const extraCount = followedClubs.length - previewClubs.length;

  const [standingsByLeague, setStandingsByLeague] = useState<
    Record<string, StandingsRow[]>
  >({});
  const [standingsLoading, setStandingsLoading] = useState(true);

  const supportedLeagues = Array.from(
    new Set(followedLeagues.filter((league) => LEAGUE_TO_CODE[league]))
  );
  const supportedLeaguesKey = supportedLeagues.join(",");

  useEffect(() => {
    // Nothing to fetch - leave `standingsLoading` alone rather than
    // setState-ing it from inside the effect for this branch; the "no
    // supported leagues" case is instead folded into `isStandingsLoading`
    // below, the same pattern YourClubs.tsx uses for the identical case.
    if (supportedLeagues.length === 0) {
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandingsLoading(true);
    Promise.all(
      supportedLeagues.map(async (league) => {
        const code = LEAGUE_TO_CODE[league];
        const rows = await fetchStandings(code).catch(() => []);
        return [league, rows] as const;
      })
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, StandingsRow[]> = {};
        for (const [league, rows] of results) {
          next[league] = rows;
        }
        setStandingsByLeague(next);
      })
      .finally(() => {
        if (!cancelled) setStandingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportedLeaguesKey]);

  // Folds the "nothing to fetch" case in here instead of having the effect
  // set state for it (see comment above) - avoids an extra render for no
  // benefit, and keeps `standingsLoading`'s initial `true` from getting
  // stuck forever when no followed club has a supported league.
  const isStandingsLoading = standingsLoading && supportedLeagues.length > 0;

  // For each followed club whose league we have a table for, find that
  // club's own row - applying the same tied-position tie-break used
  // elsewhere in the app (Your Clubs), so the position shown here always
  // matches what the club's own page says.
  const clubStandings: { club: Club; row: StandingsRow }[] = followedClubs
    .map((club) => {
      const rows = standingsByLeague[club.league];
      if (!rows || rows.length === 0) return null;
      const ranked = applyClubTieBreak(rows, club.id);
      const row = ranked.find((r) => r.clubId === club.id);
      return row ? { club, row } : null;
    })
    .filter((entry): entry is { club: Club; row: StandingsRow } => entry !== null);

  const averagePosition =
    clubStandings.length > 0
      ? clubStandings.reduce((sum, entry) => sum + entry.row.position, 0) /
        clubStandings.length
      : null;

  const bestPlaced =
    clubStandings.length > 0
      ? clubStandings.reduce((best, entry) =>
          entry.row.position < best.row.position ? entry : best
        )
      : null;

  const combinedPoints = clubStandings.reduce(
    (sum, entry) => sum + entry.row.points,
    0
  );

  const hasClubStats = !isStandingsLoading && clubStandings.length > 0;

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

        {followedClubs.length > 0 && (isStandingsLoading || hasClubStats) && (
          <section className="mb-6">
            <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Club Stats
            </h2>

            <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
              {isStandingsLoading ? (
                <div className="px-5 py-6 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  Loading league standings…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-white/[0.06]">
                    <div className="px-4 py-4 text-center">
                      <div className="text-2xl font-black text-[#111318] dark:text-white">
                        {averagePosition?.toFixed(1)}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Avg. league position
                      </div>
                    </div>
                    <div className="px-4 py-4 text-center">
                      <div className="text-2xl font-black text-[#111318] dark:text-white">
                        {combinedPoints}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Combined points
                      </div>
                    </div>
                  </div>

                  {bestPlaced && (
                    <Link
                      href={`/clubs/${bestPlaced.club.id}`}
                      className="flex items-center gap-3 border-t border-zinc-100 px-5 py-4 dark:border-white/[0.06]"
                    >
                      <ClubBadge
                        name={bestPlaced.club.name}
                        crest={bestPlaced.club.crest}
                        color={bestPlaced.club.primaryColor}
                        size={38}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-[#111318] dark:text-white">
                          {bestPlaced.club.name}
                        </div>
                        <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                          Your best-placed club · {bestPlaced.club.league}
                        </div>
                      </div>
                      <div className="shrink-0 text-lg font-black text-[#111318] dark:text-white">
                        #{bestPlaced.row.position}
                      </div>
                    </Link>
                  )}

                  {clubStandings.length < followedClubs.length && (
                    <div className="border-t border-zinc-100 px-5 py-3 text-center text-[10px] font-medium text-zinc-400 dark:border-white/[0.06] dark:text-zinc-500">
                      Based on {clubStandings.length} of {followedClubs.length}{" "}
                      followed {followedClubs.length === 1 ? "club" : "clubs"} -
                      the rest aren&apos;t in a league we track standings for
                      yet.
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

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
          </div>
        </section>
      </div>
    </main>
  );
}
