"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { matches } from "../../../data/matches";
import { useClubs } from "../../../context/ClubsContext";
import { getClub, getClubName } from "../../../lib/clubHelpers";
import { formatFullDate, formatTime } from "../../../lib/dateHelpers";
import { formatCompetition } from "../../../lib/competitionNames";
import { fetchLiveMatches, LiveMatch } from "../../../lib/footballApi";
import ClubBadge from "../../../components/ClubBadge";

type DisplayMatch = {
  id: string;
  competition: string;
  homeName: string;
  awayName: string;
  homeCrest?: string;
  awayCrest?: string;
  homeColor: string;
  awayColor: string;
  homeClubId?: string;
  awayClubId?: string;
  kickoff: string;
  venue?: string;
  city?: string;
  statusLabel: string;
};

function buildFromMock(mockMatch: (typeof matches)[number]): DisplayMatch {
  const homeClub = getClub(mockMatch.homeClubId);
  const awayClub = getClub(mockMatch.awayClubId);
  return {
    id: mockMatch.id,
    competition: formatCompetition(mockMatch.competition),
    homeName: getClubName(mockMatch.homeClubId),
    awayName: getClubName(mockMatch.awayClubId),
    homeCrest: homeClub?.crest,
    awayCrest: awayClub?.crest,
    homeColor: homeClub?.primaryColor ?? "#2563EB",
    awayColor: awayClub?.primaryColor ?? "#7C3AED",
    homeClubId: mockMatch.homeClubId,
    awayClubId: mockMatch.awayClubId,
    kickoff: mockMatch.kickoff,
    venue: mockMatch.venue,
    city: mockMatch.city,
    statusLabel: "Scheduled",
  };
}

function buildFromLive(liveMatch: LiveMatch): DisplayMatch {
  const homeClub = getClub(liveMatch.homeClubId);
  const awayClub = getClub(liveMatch.awayClubId);
  return {
    id: liveMatch.id,
    competition: formatCompetition(liveMatch.competition),
    homeName: homeClub?.name ?? liveMatch.homeTeamName,
    awayName: awayClub?.name ?? liveMatch.awayTeamName,
    homeCrest: homeClub?.crest ?? liveMatch.homeCrest ?? undefined,
    awayCrest: awayClub?.crest ?? liveMatch.awayCrest ?? undefined,
    homeColor: homeClub?.primaryColor ?? "#2563EB",
    awayColor: awayClub?.primaryColor ?? "#7C3AED",
    homeClubId: homeClub?.id,
    awayClubId: awayClub?.id,
    kickoff: liveMatch.kickoff,
    venue: liveMatch.venue,
    city: undefined,
    statusLabel: liveMatch.status === "TIMED" ? "Scheduled" : liveMatch.status,
  };
}

export default function MatchDetailClient({ id }: { id: string }) {
  const { selectedIds } = useClubs();
  const mockMatch = matches.find((m) => m.id === id);

  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [liveLoading, setLiveLoading] = useState(!mockMatch);

  useEffect(() => {
    if (mockMatch) return;
    fetchLiveMatches()
      .then((live) => {
        const found = live.find((m) => m.id === id) ?? null;
        setLiveMatch(found);
      })
      .catch(() => setLiveMatch(null))
      .finally(() => setLiveLoading(false));
  }, [id, mockMatch]);

  const displayMatch: DisplayMatch | null = mockMatch
    ? buildFromMock(mockMatch)
    : liveMatch
    ? buildFromLive(liveMatch)
    : null;

  if (!mockMatch && liveLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F6F8]">
        <div className="text-sm font-bold text-zinc-400">Loading match…</div>
      </main>
    );
  }

  if (!displayMatch) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F5F6F8] px-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl">
          ⚽
        </div>
        <h1 className="text-lg font-black text-[#111318]">Match not found</h1>
        <p className="max-w-xs text-sm leading-6 text-zinc-500">
          This match may have already been played or the link is out of date.
        </p>
        <Link
          href="/matches"
          className="rounded-2xl bg-[#111318] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98]"
        >
          Back to Matches
        </Link>
      </main>
    );
  }

  const isHomeFollowed = displayMatch.homeClubId
    ? selectedIds.includes(displayMatch.homeClubId)
    : false;
  const isAwayFollowed = displayMatch.awayClubId
    ? selectedIds.includes(displayMatch.awayClubId)
    : false;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24">
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 pt-8">
          <Link
            href="/matches"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-white/60 transition hover:text-white/90"
          >
            ← Back to Matches
          </Link>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
            {displayMatch.competition}
          </div>
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.03em]">
            {displayMatch.homeName} vs {displayMatch.awayName}
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <article className="relative overflow-hidden rounded-[30px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)]">
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${displayMatch.homeColor}, ${displayMatch.awayColor})`,
            }}
          />
          <div className="p-6">
            <div className="mb-6 flex items-center justify-center">
              <div className="rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                {displayMatch.statusLabel}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_80px_1fr] items-start gap-3">
              <div className="min-w-0 text-center">
                <div className="mb-3 flex justify-center">
                  <ClubBadge
                    name={displayMatch.homeName}
                    crest={displayMatch.homeCrest}
                    color={displayMatch.homeColor}
                    size={64}
                  />
                </div>
                <div
                  className={`break-words leading-tight ${
                    isHomeFollowed
                      ? "text-[16px] font-black text-[#111318]"
                      : "text-[14px] font-medium text-zinc-400"
                  }`}
                >
                  {displayMatch.homeName}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Home
                </div>
              </div>
              <div className="pt-3 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Kickoff
                </div>
                <div className="mt-1 whitespace-nowrap text-xl font-black tracking-tight text-[#111318]">
                  {formatTime(displayMatch.kickoff)}
                </div>
                <div className="mx-auto mt-2 w-fit rounded-full bg-[#F2F4F7] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  VS
                </div>
              </div>
              <div className="min-w-0 text-center">
                <div className="mb-3 flex justify-center">
                  <ClubBadge
                    name={displayMatch.awayName}
                    crest={displayMatch.awayCrest}
                    color={displayMatch.awayColor}
                    size={64}
                  />
                </div>
                <div
                  className={`break-words leading-tight ${
                    isAwayFollowed
                      ? "text-[16px] font-black text-[#111318]"
                      : "text-[14px] font-medium text-zinc-400"
                  }`}
                >
                  {displayMatch.awayName}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Away
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-100 pt-6">
              <div className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-400">
                Match details
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-[#F8F9FB] px-4 py-3">
                  <span className="text-xs font-bold text-zinc-500">Date</span>
                  <span className="text-sm font-black text-[#111318]">
                    {formatFullDate(displayMatch.kickoff)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#F8F9FB] px-4 py-3">
                  <span className="text-xs font-bold text-zinc-500">Kickoff</span>
                  <span className="text-sm font-black text-[#111318]">
                    {formatTime(displayMatch.kickoff)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#F8F9FB] px-4 py-3">
                  <span className="text-xs font-bold text-zinc-500">Competition</span>
                  <span className="text-sm font-black text-[#111318]">
                    {displayMatch.competition}
                  </span>
                </div>
                {displayMatch.venue && (
                  <div className="flex items-center justify-between rounded-2xl bg-[#F8F9FB] px-4 py-3">
                    <span className="text-xs font-bold text-zinc-500">Venue</span>
                    <span className="text-sm font-black text-[#111318]">
                      {displayMatch.venue}
                    </span>
                  </div>
                )}
                {displayMatch.city && (
                  <div className="flex items-center justify-between rounded-2xl bg-[#F8F9FB] px-4 py-3">
                    <span className="text-xs font-bold text-zinc-500">City</span>
                    <span className="text-sm font-black text-[#111318]">
                      {displayMatch.city}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 px-4 py-3 text-center text-[11px] font-medium text-zinc-400">
              Live score and match stats aren&apos;t available yet — coming in a future update.
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}