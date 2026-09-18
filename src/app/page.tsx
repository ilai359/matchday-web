"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { matches } from "../data/matches";
import { useClubs } from "../context/ClubsContext";
import { getClub, displayName } from "../lib/clubHelpers";
import { formatDate, formatTime } from "../lib/dateHelpers";
import { formatCompetition } from "../lib/competitionNames";
import {
  fetchLiveMatches,
  fetchVenueFallbacks,
  extractTeamId,
  LiveMatch,
} from "../lib/footballApi";
import ClubBadge from "../components/ClubBadge";
import YourClubs from "../components/YourClubs";

export default function Home() {
  const { selectedIds, loaded } = useClubs();
  const router = useRouter();
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    fetchLiveMatches()
      .then(setLiveMatches)
      .catch(() => {})
      .finally(() => setLiveLoading(false));
  }, []);

  // Onboarding is the one, real "welcome" screen now - a brand-new visitor
  // (nothing followed yet) is sent straight there instead of this page
  // showing its own separate welcome screen. Waits for "loaded" first:
  // selectedIds briefly looks empty for every returning visitor too, for
  // the instant before their real saved list loads in from the browser -
  // without that check, this would bounce existing users out to
  // /onboarding and back on every single visit.
  useEffect(() => {
    if (loaded && selectedIds.length === 0) {
      router.replace("/onboarding");
    }
  }, [loaded, selectedIds, router]);

  const myLiveMatches = liveMatches
    .filter(
      (m) => selectedIds.includes(m.homeClubId) || selectedIds.includes(m.awayClubId)
    )
    .sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
    );

  // Last-resort venue lookup for whichever of the matches above are
  // against a club outside our own 132-club list (e.g. a Champions League
  // opponent), so those don't just show no venue at all. See
  // fetchVenueFallbacks for why this only ever fetches each club once and
  // only for matches that don't already have a venue from somewhere else.
  const [venueFallback, setVenueFallback] = useState<Record<string, string>>({});
  useEffect(() => {
    const needLookup = liveMatches.filter(
      (m) =>
        !m.venue &&
        (selectedIds.includes(m.homeClubId) || selectedIds.includes(m.awayClubId))
    );
    if (needLookup.length === 0) return;
    let cancelled = false;
    fetchVenueFallbacks(needLookup).then((result) => {
      if (!cancelled) setVenueFallback((prev) => ({ ...prev, ...result }));
    });
    return () => {
      cancelled = true;
    };
  }, [liveMatches, selectedIds]);

  function venueFor(match: { venue?: string; homeCrest?: string | null }): string | undefined {
    if (match.venue) return match.venue;
    const teamId = extractTeamId(match.homeCrest ?? undefined);
    return teamId ? venueFallback[teamId] : undefined;
  }
  const myMockMatches = matches
    .filter(
      (match) =>
        selectedIds.includes(match.homeClubId) ||
        selectedIds.includes(match.awayClubId)
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff).getTime() -
        new Date(b.kickoff).getTime()
    );
  const now = new Date().getTime();
  const combinedMatches =
    myLiveMatches.length > 0
      ? myLiveMatches.map((m) => ({
          id: m.id,
          competition: m.competition,
          homeClubId: m.homeClubId,
          awayClubId: m.awayClubId,
          homeTeamName: m.homeTeamName,
          awayTeamName: m.awayTeamName,
          homeCrest: m.homeCrest,
          awayCrest: m.awayCrest,
          kickoff: m.kickoff,
          venue: m.venue,
        }))
      : myMockMatches.map((m) => ({
          id: m.id,
          competition: m.competition,
          homeClubId: m.homeClubId,
          awayClubId: m.awayClubId,
          homeTeamName: getClub(m.homeClubId)?.name ?? m.homeClubId,
          awayTeamName: getClub(m.awayClubId)?.name ?? m.awayClubId,
          homeCrest: getClub(m.homeClubId)?.crest,
          awayCrest: getClub(m.awayClubId)?.crest,
          kickoff: m.kickoff,
          venue: m.venue,
        }));
  const futureMatches = combinedMatches.filter(
    (match) => new Date(match.kickoff).getTime() >= now
  );
  const nextMatch = futureMatches[0];
  const upcomingMatches = futureMatches.slice(1, 5);

  // Either we don't know yet whether this person has followed clubs
  // (still reading the saved list), or they haven't and are about to be
  // sent to /onboarding (effect above) - either way, show nothing rather
  // than flash a UI that's about to be replaced a moment later.
  if (!loaded || selectedIds.length === 0) {
    return <main className="min-h-screen bg-[#070A12]" />;
  }

  const homeClub = nextMatch ? getClub(nextMatch.homeClubId) : undefined;
  const awayClub = nextMatch ? getClub(nextMatch.awayClubId) : undefined;
  const homeColor = homeClub?.primaryColor ?? "#2563EB";
  const awayColor = awayClub?.primaryColor ?? "#7C3AED";
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24 dark:bg-[#0B0D12]">
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-10 pt-10">
          <div className="flex min-w-0 items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
                Your football
              </div>
              <h1 className="text-[38px] font-black leading-none tracking-[-0.055em]">
                Club
                <span className="text-blue-400">side</span>
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-5 text-white/45">
                Everything important from the clubs you follow.
              </p>
            </div>
            <button
              onClick={() => {
                window.location.href = "/clubs";
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-lg backdrop-blur-md transition hover:bg-white/[0.13] active:scale-95"
              aria-label="My clubs"
            >
              ⚽
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        {!liveLoading && myLiveMatches.length > 0 && (
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
              Live data
            </span>
          </div>
        )}
        {nextMatch && (
          <section className="mb-9">
            <div className="mb-3 px-1">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                Next match
              </div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#111318] dark:text-white">
                Coming up
              </h2>
            </div>
            <div
              className="relative overflow-hidden rounded-[30px] text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]"
              style={{
                background: `linear-gradient(135deg, ${homeColor} 0%, #111827 50%, ${awayColor} 145%)`,
              }}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/15 blur-[80px]" />
                <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-black/30 blur-[80px]" />
              </div>
              <div className="relative z-10 p-6">
                <div className="mb-7 flex items-center justify-between gap-3">
                  <div className="min-w-0 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/80 backdrop-blur-xl">
                    <span className="block truncate">
                      {formatCompetition(nextMatch.competition)}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-white/65">
                    {formatDate(nextMatch.kickoff)}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_70px_1fr] items-start gap-3">
                  <div className="min-w-0">
                    <div className="mb-3">
                      <ClubBadge
                        name={nextMatch.homeTeamName}
                        crest={homeClub?.crest ?? nextMatch.homeCrest ?? undefined}
                        color={homeColor}
                        size={56}
                      />
                    </div>
                    <div className="break-words text-lg font-black leading-[1.1]">
                      {displayName(nextMatch.homeTeamName, nextMatch.homeClubId)}
                    </div>
                    <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      Home
                    </div>
                  </div>
                  <div className="flex flex-col items-center pt-2 text-center">
                    <div className="mt-1 whitespace-nowrap text-xl font-black">
                      {formatTime(nextMatch.kickoff)}
                    </div>
                    <div className="mt-3 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/55">
                      VS
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col items-end text-right">
                    <div className="mb-3">
                      <ClubBadge
                        name={nextMatch.awayTeamName}
                        crest={awayClub?.crest ?? nextMatch.awayCrest ?? undefined}
                        color={awayColor}
                        size={56}
                      />
                    </div>
                    <div className="break-words text-lg font-black leading-[1.1]">
                      {displayName(nextMatch.awayTeamName, nextMatch.awayClubId)}
                    </div>
                    <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      Away
                    </div>
                  </div>
                </div>
                <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="min-w-0 text-xs font-medium text-white/60">
                    <span className="mr-1.5">⌖</span>
                    <span className="break-words">
                      {venueFor(nextMatch)}
                    </span>
                  </div>
                  <Link
                    href={`/match/${nextMatch.id}`}
                    className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
        {upcomingMatches.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-[22px] font-black tracking-tight text-[#111318] dark:text-white">
                  Up next
                </h2>
                <p className="mt-0.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  Your upcoming fixtures
                </p>
              </div>
              <span className="rounded-full bg-[#E9ECF2] px-3 py-1.5 text-[11px] font-black text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
                {upcomingMatches.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {upcomingMatches.map((match) => {
                const matchHomeClub = getClub(match.homeClubId);
                const isHomeFollowed = selectedIds.includes(match.homeClubId);
                const isAwayFollowed = selectedIds.includes(match.awayClubId);
                return (
                  <Link
                    key={match.id}
                    href={`/match/${match.id}`}
                    className="relative block overflow-hidden rounded-[22px] border border-black/[0.045] bg-white p-4 shadow-[0_5px_20px_rgba(0,0,0,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.07)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none"
                  >
                    <div
                      className="absolute bottom-0 left-0 top-0 w-1"
                      style={{
                        backgroundColor:
                          matchHomeClub?.primaryColor ?? "#3B82F6",
                      }}
                    />
                    <div className="flex items-center gap-4 pl-1">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                            {formatCompetition(match.competition)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[15px] leading-snug">
                          <span
                            className={
                              isHomeFollowed
                                ? "font-black text-[#111318] dark:text-white"
                                : "rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
                            }
                          >
                            {displayName(match.homeTeamName, match.homeClubId)}
                          </span>
                          <span className="font-bold text-zinc-300 dark:text-zinc-600">
                            vs
                          </span>
                          <span
                            className={
                              isAwayFollowed
                                ? "font-black text-[#111318] dark:text-white"
                                : "rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
                            }
                          >
                            {displayName(match.awayTeamName, match.awayClubId)}
                          </span>
                        </div>
                        <div className="mt-2 truncate text-xs font-medium text-zinc-400 dark:text-zinc-500">
                          {formatDate(match.kickoff)}
                          {venueFor(match) ? ` · ${venueFor(match)}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-2xl bg-[#F3F5F8] px-3 py-2.5 text-center dark:bg-white/10">
                        <div className="whitespace-nowrap text-sm font-black text-[#111318] dark:text-white">
                          {formatTime(match.kickoff)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        {!nextMatch && (
          <section className="py-12">
            <div className="rounded-[28px] border border-black/[0.04] bg-white px-6 py-10 text-center shadow-sm dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl dark:bg-white/10">
                ⚽
              </div>
              <h2 className="mb-2 text-lg font-black text-[#111318] dark:text-white">
                You&apos;re all caught up
              </h2>
              <p className="mx-auto max-w-xs text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                New matches from your clubs will appear here.
              </p>
            </div>
          </section>
        )}
        <YourClubs />
      </div>
    </main>
  );
}