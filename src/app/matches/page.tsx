"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { clubs } from "../../data/clubs";
import { matches } from "../../data/matches";
import { useClubs } from "../../context/ClubsContext";
import { getClub, getClubName } from "../../lib/clubHelpers";
import { formatDate, formatTime } from "../../lib/dateHelpers";
import { fetchLiveMatches, LiveMatch } from "../../lib/footballApi";
import ClubBadge from "../../components/ClubBadge";
export default function Matches() {
  const { selectedIds } = useClubs();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(false);
  useEffect(() => {
    fetchLiveMatches()
      .then(setLiveMatches)
      .catch(() => setLiveError(true))
      .finally(() => setLiveLoading(false));
  }, []);
  const myLiveMatches = liveMatches
    .filter(
      (m) => selectedIds.includes(m.homeClubId) || selectedIds.includes(m.awayClubId)
    )
    .sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
    );
  const myClubs = clubs.filter((club) =>
    selectedIds.includes(club.id)
  );
  const now = new Date().getTime();
  const myMatches = matches
    .filter(
      (match) =>
        selectedIds.includes(match.homeClubId) ||
        selectedIds.includes(match.awayClubId)
    )
    .filter((match) => new Date(match.kickoff).getTime() >= now)
    .filter((match) => {
      if (activeFilter === "all") return true;
      return (
        match.homeClubId === activeFilter ||
        match.awayClubId === activeFilter
      );
    })
    .sort(
      (a, b) =>
        new Date(a.kickoff).getTime() -
        new Date(b.kickoff).getTime()
    );
  if (selectedIds.length === 0) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#070A12] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-blue-600/25 blur-[100px]" />
          <div className="absolute -right-40 top-24 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-5 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-3xl backdrop-blur-xl">
            ⚽
          </div>
          <h1 className="mb-2 text-2xl font-black tracking-tight">
            No clubs selected
          </h1>
          <p className="mb-8 max-w-xs text-sm leading-6 text-white/50">
            Choose the clubs you follow to see all their upcoming matches here.
          </p>
          <button
            onClick={() => (window.location.href = "/onboarding")}
            className="rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-black shadow-xl transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Choose clubs
          </button>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24">
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 pt-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
                Your fixtures
              </div>
              <h1 className="text-[36px] font-black leading-none tracking-[-0.05em]">
                Matches
              </h1>
              <p className="mt-3 text-sm text-white/45">
                Every upcoming game from your clubs.
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-xl backdrop-blur-xl">
              ⚽
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        {!liveLoading && !liveError && myLiveMatches.length > 0 && (
          <section className="mb-9">
            <div className="flex flex-col gap-4">
              {myLiveMatches.map((match) => {
                const isHomeFollowed = selectedIds.includes(match.homeClubId);
                const isAwayFollowed = selectedIds.includes(match.awayClubId);
                const homeClub = getClub(match.homeClubId);
                const awayClub = getClub(match.awayClubId);
                const homeColor = homeClub?.primaryColor ?? "#94A3B8";
                const awayColor = awayClub?.primaryColor ?? "#94A3B8";
                return (
                  <article
                    key={match.id}
                    className="relative overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.08)]"
                  >
                    <div
                      className="h-1.5 w-full"
                      style={{
                        background: `linear-gradient(90deg, ${homeColor}, ${awayColor})`,
                      }}
                    />
                    <div className="p-5">
                      <div className="mb-5 flex items-center justify-end gap-3">
                        <div className="shrink-0 rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[11px] font-bold text-zinc-500">
                          {match.competition}
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_72px_1fr] items-center gap-3">
                        <div className="min-w-0">
                          <div className="mb-3">
                            <ClubBadge
                              name={homeClub?.name ?? match.homeTeamName}
                              crest={homeClub?.crest ?? match.homeCrest ?? undefined}
                              color={homeColor}
                              size={48}
                            />
                          </div>
                          <div
                            className={`break-words leading-tight ${
                              isHomeFollowed
                                ? "text-[16px] font-black text-[#111318]"
                                : "text-[14px] font-medium text-zinc-400"
                            }`}
                          >
                            {homeClub?.name ?? match.homeTeamName}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400">
                            Kickoff
                          </div>
                          <div className="mt-1 whitespace-nowrap text-lg font-black tracking-tight text-[#111318]">
                            {formatTime(match.kickoff)}
                          </div>
                          <div className="mx-auto mt-2 w-fit rounded-full bg-[#F2F4F7] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                            VS
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-col items-end text-right">
                          <div className="mb-3">
                            <ClubBadge
                              name={awayClub?.name ?? match.awayTeamName}
                              crest={awayClub?.crest ?? match.awayCrest ?? undefined}
                              color={awayColor}
                              size={48}
                            />
                          </div>
                          <div
                            className={`break-words leading-tight ${
                              isAwayFollowed
                                ? "text-[16px] font-black text-[#111318]"
                                : "text-[14px] font-medium text-zinc-400"
                            }`}
                          >
                            {awayClub?.name ?? match.awayTeamName}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-600">
                            {formatDate(match.kickoff)}
                          </div>
                          {match.venue && (
                            <div className="mt-0.5 truncate text-[11px] text-zinc-400">
                              {match.venue}
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/match/${match.id}`}
                          className="shrink-0 rounded-xl bg-[#F2F4F7] px-3 py-2 text-[11px] font-black text-zinc-600 transition hover:bg-[#E8EBF0]"
                        >
                          Details →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {liveError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load live match data. Showing saved matches below.
          </div>
        )}
        <section className="mb-7">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <h2 className="text-lg font-black text-[#111318]">
                Filter by club
              </h2>
              <p className="mt-0.5 text-xs font-medium text-zinc-400">
                Show matches from one club
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-zinc-500 shadow-sm">
              {myMatches.length} matches
            </div>
          </div>
          <div className="-mx-5 overflow-x-auto px-5 pb-2">
            <div className="flex w-max gap-2">
              <button
                onClick={() => setActiveFilter("all")}
                className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                  activeFilter === "all"
                    ? "bg-[#111318] text-white shadow-lg shadow-black/10"
                    : "border border-black/[0.05] bg-white text-zinc-600 shadow-sm"
                }`}
              >
                All clubs
              </button>
              {myClubs.map((club) => {
                const isActive = activeFilter === club.id;
                return (
                  <button
                    key={club.id}
                    onClick={() => setActiveFilter(club.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold transition-all ${
                      isActive
                        ? "text-white shadow-lg"
                        : "border border-black/[0.05] bg-white text-zinc-600 shadow-sm"
                    }`}
                    style={
                      isActive
                        ? {
                            background: `linear-gradient(135deg, ${
                              club.primaryColor ?? "#2563EB"
                            }, #111827)`,
                          }
                        : undefined
                    }
                  >
                    <ClubBadge
                      name={club.name}
                      crest={club.crest}
                      color={club.primaryColor}
                      size={24}
                    />
                    {club.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        {myMatches.length === 0 && (
          <section className="py-10">
            <div className="rounded-[28px] border border-black/[0.04] bg-white px-6 py-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl">
                📅
              </div>
              <h2 className="mb-2 text-lg font-black text-[#111318]">
                No upcoming matches
              </h2>
              <p className="mx-auto max-w-xs text-sm leading-6 text-zinc-500">
                There aren&apos;t any upcoming matches for this filter right now.
              </p>
            </div>
          </section>
        )}
        {myMatches.length > 0 && (
          <section>
            <div className="mb-4">
              <h2 className="text-[22px] font-black tracking-tight text-[#111318]">
                Upcoming (saved)
              </h2>
              <p className="mt-0.5 text-xs font-medium text-zinc-400">
                Your next fixtures
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {myMatches.map((match, index) => {
                const homeClub = getClub(match.homeClubId);
                const awayClub = getClub(match.awayClubId);
                const homeColor = homeClub?.primaryColor ?? "#2563EB";
                const awayColor = awayClub?.primaryColor ?? "#7C3AED";
                const isNextMatch = index === 0;
                return (
                  <article
                    key={match.id}
                    className={`relative overflow-hidden rounded-[26px] border bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.08)] ${
                      isNextMatch
                        ? "border-blue-200/70"
                        : "border-black/[0.045]"
                    }`}
                  >
                    <div
                      className="h-1.5 w-full"
                      style={{
                        background: `linear-gradient(90deg, ${homeColor}, ${awayColor})`,
                      }}
                    />
                    <div className="p-5">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {isNextMatch && (
                            <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">
                              Next match
                            </div>
                          )}
                          <div className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                            {match.competition}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[11px] font-bold text-zinc-500">
                          {formatDate(match.kickoff)}
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_72px_1fr] items-center gap-3">
                        <div className="min-w-0">
                          <div className="mb-3">
                            <ClubBadge
                              name={homeClub?.name ?? match.homeClubId}
                              crest={homeClub?.crest}
                              color={homeColor}
                              size={48}
                            />
                          </div>
                          <div className="break-words text-[15px] font-black leading-tight text-[#111318]">
                            {getClubName(match.homeClubId)}
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Home
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400">
                            Kickoff
                          </div>
                          <div className="mt-1 whitespace-nowrap text-xl font-black tracking-tight text-[#111318]">
                            {formatTime(match.kickoff)}
                          </div>
                          <div className="mx-auto mt-2 w-fit rounded-full bg-[#F2F4F7] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                            VS
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-col items-end text-right">
                          <div className="mb-3">
                            <ClubBadge
                              name={awayClub?.name ?? match.awayClubId}
                              crest={awayClub?.crest}
                              color={awayColor}
                              size={48}
                            />
                          </div>
                          <div className="break-words text-[15px] font-black leading-tight text-[#111318]">
                            {getClubName(match.awayClubId)}
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Away
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-zinc-600">
                            {match.venue}
                          </div>
                          {match.city && (
                            <div className="mt-0.5 truncate text-[11px] text-zinc-400">
                              {match.city}
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/match/${match.id}`}
                          className="shrink-0 rounded-xl bg-[#F2F4F7] px-3 py-2 text-[11px] font-black text-zinc-600 transition hover:bg-[#E8EBF0]"
                        >
                          Details →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}