"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { matches } from "../data/matches";
import { updates } from "../data/updates";
import { useClubs } from "../context/ClubsContext";
import { getClub, displayName } from "../lib/clubHelpers";
import { formatDate, formatFullDate, formatTime } from "../lib/dateHelpers";
import { categoryStyles } from "../lib/categoryStyles";
import { fetchLiveMatches, LiveMatch } from "../lib/footballApi";
import ClubBadge from "../components/ClubBadge";
export default function Home() {
  const { selectedIds } = useClubs();
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  useEffect(() => {
    fetchLiveMatches()
      .then(setLiveMatches)
      .catch(() => {})
      .finally(() => setLiveLoading(false));
  }, []);
  const myLiveMatches = liveMatches
    .filter(
      (m) => selectedIds.includes(m.homeClubId) || selectedIds.includes(m.awayClubId)
    )
    .sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
    );
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
          kickoff: m.kickoff,
          venue: m.venue,
        }));
  const futureMatches = combinedMatches.filter(
    (match) => new Date(match.kickoff).getTime() >= now
  );
  const nextMatch = futureMatches[0];
  const upcomingMatches = futureMatches.slice(1, 5);
  const myUpdates = updates
    .filter((update) => selectedIds.includes(update.clubId))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime()
    );
  if (selectedIds.length === 0) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#070A12] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-44 h-[420px] w-[420px] rounded-full bg-blue-600/25 blur-[100px]" />
          <div className="absolute -right-44 top-32 h-[430px] w-[430px] rounded-full bg-violet-600/25 blur-[110px]" />
          <div className="absolute bottom-[-180px] left-1/2 h-[430px] w-[430px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[110px]" />
        </div>
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-12">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold tracking-wide text-white/80">
                YOUR FOOTBALL. YOUR FEED.
              </span>
            </div>
            <div className="mb-5">
              <div className="mb-2 text-sm font-black uppercase tracking-[0.32em] text-blue-300/80">
                Welcome to
              </div>
              <h1 className="text-6xl font-black tracking-[-0.06em] sm:text-7xl">
                Match
                <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  day
                </span>
              </h1>
            </div>
            <h2 className="mb-3 text-2xl font-black tracking-tight">
              Never miss what matters.
            </h2>
            <p className="mx-auto mb-9 max-w-sm text-base leading-7 text-white/55">
              Matches, injuries, transfers, press updates and everything
              happening around the clubs you care about.
            </p>
            <button
              onClick={() => {
                window.location.href = "/onboarding";
              }}
              className="group w-full rounded-2xl bg-white px-6 py-4 text-base font-black text-black shadow-2xl shadow-blue-500/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/20 active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                Choose my clubs
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </button>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs font-semibold text-white/35">
              <span>Matches</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>News</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Updates</span>
            </div>
          </div>
        </div>
      </main>
    );
  }
  const homeClub = nextMatch ? getClub(nextMatch.homeClubId) : undefined;
  const awayClub = nextMatch ? getClub(nextMatch.awayClubId) : undefined;
  const homeColor = homeClub?.primaryColor ?? "#2563EB";
  const awayColor = awayClub?.primaryColor ?? "#7C3AED";
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24">
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
                Match
                <span className="text-blue-400">day</span>
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
            <div className="mb-3 flex items-end justify-between px-1">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  Next match
                </div>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#111318]">
                  Coming up
                </h2>
              </div>
              <div className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-500 shadow-sm">
                {nextMatch.competition}
              </div>
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
                      {nextMatch.competition}
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
                        crest={homeClub?.crest}
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
                        crest={awayClub?.crest}
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
                      {nextMatch.venue}
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
                <h2 className="text-[22px] font-black tracking-tight text-[#111318]">
                  Up next
                </h2>
                <p className="mt-0.5 text-xs font-medium text-zinc-400">
                  Your upcoming fixtures
                </p>
              </div>
              <span className="rounded-full bg-[#E9ECF2] px-3 py-1.5 text-[11px] font-black text-zinc-500">
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
                    className="relative block overflow-hidden rounded-[22px] border border-black/[0.045] bg-white p-4 shadow-[0_5px_20px_rgba(0,0,0,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.07)]"
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
                          <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                            {match.competition}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[15px] leading-snug">
                          <span
                            className={
                              isHomeFollowed
                                ? "font-black text-[#111318]"
                                : "rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500"
                            }
                          >
                            {displayName(match.homeTeamName, match.homeClubId)}
                          </span>
                          <span className="font-bold text-zinc-300">
                            vs
                          </span>
                          <span
                            className={
                              isAwayFollowed
                                ? "font-black text-[#111318]"
                                : "rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500"
                            }
                          >
                            {displayName(match.awayTeamName, match.awayClubId)}
                          </span>
                        </div>
                        <div className="mt-2 truncate text-xs font-medium text-zinc-400">
                          {formatDate(match.kickoff)}
                          {match.venue ? ` · ${match.venue}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-2xl bg-[#F3F5F8] px-3 py-2.5 text-center">
                        <div className="whitespace-nowrap text-sm font-black text-[#111318]">
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
        {myUpdates.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-[22px] font-black tracking-tight text-[#111318]">
                  Latest
                </h2>
                <p className="mt-0.5 text-xs font-medium text-zinc-400">
                  What&apos;s happening around your clubs
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm text-white shadow-lg shadow-orange-500/20">
                ⚡
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {myUpdates.map((update) => {
                const club = getClub(update.clubId);
                const category =
                  categoryStyles[update.category] ??
                  categoryStyles.Club;
                const clubColor = club?.primaryColor ?? "#111827";
                return (
                  <article
                    key={update.id}
                    className="overflow-hidden rounded-[24px] border border-black/[0.045] bg-white shadow-[0_5px_20px_rgba(0,0,0,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.07)]"
                  >
                    <div className="p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <ClubBadge
                            name={club?.name ?? update.clubId}
                            crest={club?.crest}
                            color={clubColor}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-[#111318]">
                              {club?.name ?? update.clubId}
                            </div>
                            <div className="mt-0.5 text-[10px] font-semibold text-zinc-400">
                              {formatFullDate(update.publishedAt)}
                            </div>
                          </div>
                        </div>
                        <div
                          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5"
                          style={{
                            backgroundColor: category.background,
                            color: category.color,
                          }}
                        >
                          <span className="text-[10px] font-black">
                            {category.icon}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider">
                            {update.category}
                          </span>
                        </div>
                      </div>
                      <h3 className="mb-2 text-[16px] font-black leading-snug tracking-[-0.01em] text-[#111318]">
                        {update.title}
                      </h3>
                      <p className="text-[13px] leading-[1.65] text-zinc-500">
                        {update.summary}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
                        <span className="text-[11px] font-semibold text-zinc-400">
                          Club update
                        </span>
                        <button
                          className="text-[11px] font-black transition-opacity hover:opacity-70"
                          style={{
                            color: category.color,
                          }}
                        >
                          Read more →
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {!nextMatch && myUpdates.length === 0 && (
          <section className="py-12">
            <div className="rounded-[28px] border border-black/[0.04] bg-white px-6 py-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl">
                ⚽
              </div>
              <h2 className="mb-2 text-lg font-black text-[#111318]">
                You&apos;re all caught up
              </h2>
              <p className="mx-auto max-w-xs text-sm leading-6 text-zinc-500">
                New matches and updates from your clubs will appear here.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}