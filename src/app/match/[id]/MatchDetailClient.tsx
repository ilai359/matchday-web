"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { matches } from "../../../data/matches";
import { useClubs } from "../../../context/ClubsContext";
import { getClub, getClubName } from "../../../lib/clubHelpers";
import { formatFullDate, formatTime } from "../../../lib/dateHelpers";
import { formatCompetition } from "../../../lib/competitionNames";
import {
  fetchLiveMatches,
  fetchFinishedMatches,
  fetchLiveMatchStatus,
  LiveMatch,
  FinishedMatch,
  LiveMatchStatus,
  LEAGUE_TO_CODE,
} from "../../../lib/footballApi";
import ClubBadge from "../../../components/ClubBadge";

type DisplayMatch = {
  id: string;
  competition: string;
  rawCompetition: string;
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
    rawCompetition: mockMatch.competition,
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
    rawCompetition: liveMatch.competition,
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

// Prefer the app's clean short club name; fall back to the raw API name
// only if we couldn't match this team to a club we know about.
function shortName(clubId: string | null, rawName: string): string {
  return clubId ? getClubName(clubId) : rawName;
}

// Prefer the app's own crest image; fall back to whatever the API sent.
function crestFor(clubId: string | null, apiCrest: string | null): string | undefined {
  const club = clubId ? getClub(clubId) : undefined;
  return club?.crest ?? apiCrest ?? undefined;
}

// Appends a 2-digit hex alpha channel to a 6-digit hex color, e.g.
// withAlpha("#2563EB", "40") -> "#2563EB40" (a strong ~25% tint).
function withAlpha(hex: string, alphaHex: string): string {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function resultFor(
  match: FinishedMatch,
  clubId: string
): "W" | "D" | "L" | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  const isHome = match.homeClubId === clubId;
  const clubScore = isHome ? match.homeScore : match.awayScore;
  const oppScore = isHome ? match.awayScore : match.homeScore;
  if (clubScore > oppScore) return "W";
  if (clubScore < oppScore) return "L";
  return "D";
}

// European club seasons run roughly July–June. If it's July or later, the
// season "starts" this calendar year; otherwise it started last calendar year.
function getSeasonStartYear(date: Date): number {
  const month = date.getMonth(); // 0 = January, 6 = July
  const year = date.getFullYear();
  return month >= 6 ? year : year - 1;
}

function FormPills({
  matches: formMatches,
  clubId,
}: {
  matches: FinishedMatch[];
  clubId?: string;
}) {
  if (!clubId || formMatches.length === 0) {
    return (
      <div className="text-[11px] font-medium text-zinc-400">
        No matches played yet this season
      </div>
    );
  }
  return (
    <div>
      <div className="flex gap-1.5">
        {formMatches.map((m) => {
          const result = resultFor(m, clubId);
          const style =
            result === "W"
              ? "bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)]"
              : result === "L"
              ? "bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)]"
              : "bg-zinc-300 text-zinc-700";
          const homeShort = shortName(m.homeClubId, m.homeTeamName);
          const awayShort = shortName(m.awayClubId, m.awayTeamName);
          return (
            <div
              key={m.id}
              title={`${homeShort} ${m.homeScore}-${m.awayScore} ${awayShort}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black ${style}`}
            >
              {result ?? "–"}
            </div>
          );
        })}
      </div>
      {formMatches.length < 3 && (
        <div className="mt-2 text-[10px] font-medium text-zinc-400">
          Season just getting started
        </div>
      )}
    </div>
  );
}

function HeadToHeadRow({
  match,
  homeColor,
  awayColor,
}: {
  match: FinishedMatch;
  homeColor: string;
  awayColor: string;
}) {
  const homeShort = shortName(match.homeClubId, match.homeTeamName);
  const awayShort = shortName(match.awayClubId, match.awayTeamName);
  const homeCrest = crestFor(match.homeClubId, match.homeCrest);
  const awayCrest = crestFor(match.awayClubId, match.awayCrest);
  const homeWin =
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.homeScore > match.awayScore;
  const awayWin =
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.awayScore > match.homeScore;

  return (
    <div className="rounded-2xl bg-white/85 px-3 py-3 shadow-sm">
      <div className="mb-2 text-center text-[10px] font-bold text-zinc-400">
        {formatFullDate(match.kickoff)}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span
            className={`truncate text-[13px] ${
              homeWin ? "font-black text-[#111318]" : "font-medium text-zinc-400"
            }`}
          >
            {homeShort}
          </span>
          <ClubBadge name={homeShort} crest={homeCrest} color={homeColor} size={26} />
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#F5F6F8] px-3 py-1">
          <span
            className="text-base font-black"
            style={{ color: homeWin ? homeColor : "#A1A1AA" }}
          >
            {match.homeScore}
          </span>
          <span className="text-zinc-300">–</span>
          <span
            className="text-base font-black"
            style={{ color: awayWin ? awayColor : "#A1A1AA" }}
          >
            {match.awayScore}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <ClubBadge name={awayShort} crest={awayCrest} color={awayColor} size={26} />
          <span
            className={`truncate text-[13px] ${
              awayWin ? "font-black text-[#111318]" : "font-medium text-zinc-400"
            }`}
          >
            {awayShort}
          </span>
        </div>
      </div>
    </div>
  );
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

  // Kept separate on purpose: head-to-head history looks back two seasons,
  // but "recent form" pills should only ever reflect the current season.
  const [currentSeasonMatches, setCurrentSeasonMatches] = useState<FinishedMatch[]>([]);
  const [previousSeasonMatches, setPreviousSeasonMatches] = useState<FinishedMatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const rawCompetition = displayMatch?.rawCompetition;
  const homeClubId = displayMatch?.homeClubId;
  const awayClubId = displayMatch?.awayClubId;
  const leagueCode = rawCompetition ? LEAGUE_TO_CODE[rawCompetition] : undefined;
  useEffect(() => {
    if (!leagueCode || !homeClubId || !awayClubId) {
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    const currentSeasonYear = getSeasonStartYear(new Date());
    const previousSeasonYear = currentSeasonYear - 1;
    Promise.all([
      fetchFinishedMatches(leagueCode, String(currentSeasonYear)),
      fetchFinishedMatches(leagueCode, String(previousSeasonYear)),
    ])
      .then(([current, previous]) => {
        if (!cancelled) {
          setCurrentSeasonMatches(current);
          setPreviousSeasonMatches(previous);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentSeasonMatches([]);
          setPreviousSeasonMatches([]);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leagueCode, homeClubId, awayClubId]);

  // --- Live score polling ---
  // Only bother checking while the match could plausibly be about to start,
  // in progress, or just finished (15 min before kickoff to 3 hours after).
  // Stops polling once the match is confirmed finished.
  const [liveStatus, setLiveStatus] = useState<LiveMatchStatus | null>(null);
  const kickoffForPolling = displayMatch?.kickoff;

  useEffect(() => {
    if (!kickoffForPolling) return;
    const kickoffTime = new Date(kickoffForPolling).getTime();
    if (Number.isNaN(kickoffTime)) return;

    const minutesSinceKickoff = (Date.now() - kickoffTime) / 60000;
    const withinLiveWindow = minutesSinceKickoff >= -15 && minutesSinceKickoff <= 180;
    if (!withinLiveWindow) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function poll() {
      fetchLiveMatchStatus(id)
        .then((result) => {
          if (cancelled || !result) return;
          setLiveStatus(result);
          if (result.status === "FINISHED" && intervalId) {
            clearInterval(intervalId);
          }
        })
        .catch(() => {});
    }

    poll();
    intervalId = setInterval(poll, 45000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, kickoffForPolling]);

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

  const isLive = liveStatus?.status === "IN_PLAY" || liveStatus?.status === "PAUSED";
  const isMatchFinished = liveStatus?.status === "FINISHED";
  const statusPillLabel = isLive
    ? liveStatus?.status === "PAUSED"
      ? "Half-time"
      : "Live"
    : isMatchFinished
    ? "Full-time"
    : displayMatch.statusLabel;

  const headToHeadMatches = [...currentSeasonMatches, ...previousSeasonMatches]
    .filter(
      (m) =>
        (m.homeClubId === displayMatch.homeClubId &&
          m.awayClubId === displayMatch.awayClubId) ||
        (m.homeClubId === displayMatch.awayClubId &&
          m.awayClubId === displayMatch.homeClubId)
    )
    .sort(
      (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()
    )
    .slice(0, 5);

  function recentFormFor(clubId?: string): FinishedMatch[] {
    if (!clubId) return [];
    return currentSeasonMatches
      .filter((m) => m.homeClubId === clubId || m.awayClubId === clubId)
      .sort(
        (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()
      )
      .slice(0, 5);
  }

  const homeForm = recentFormFor(displayMatch.homeClubId);
  const awayForm = recentFormFor(displayMatch.awayClubId);

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
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider ${
                  isLive ? "bg-red-500/10 text-red-600" : "bg-[#F2F4F7] text-zinc-500"
                }`}
              >
                {isLive && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                )}
                {statusPillLabel}
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
                {isLive || isMatchFinished ? (
                  <>
                    <div
                      className={`text-[9px] font-black uppercase tracking-[0.16em] ${
                        isLive ? "text-red-500" : "text-zinc-400"
                      }`}
                    >
                      {isLive
                        ? liveStatus?.status === "PAUSED"
                          ? "Half-time"
                          : liveStatus?.minute
                          ? `${liveStatus.minute}'`
                          : "Live"
                        : "Full-time"}
                    </div>
                    <div className="mt-1 whitespace-nowrap text-2xl font-black tracking-tight text-[#111318]">
                      {liveStatus?.homeScore ?? 0}
                      {" – "}
                      {liveStatus?.awayScore ?? 0}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Kickoff
                    </div>
                    <div className="mt-1 whitespace-nowrap text-xl font-black tracking-tight text-[#111318]">
                      {formatTime(displayMatch.kickoff)}
                    </div>
                  </>
                )}
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

            {leagueCode && (
              <div
                className="mt-8 overflow-hidden rounded-[26px] p-5"
                style={{
                  background: `linear-gradient(135deg, ${withAlpha(
                    displayMatch.homeColor,
                    "40"
                  )}, ${withAlpha(displayMatch.awayColor, "40")})`,
                }}
              >
                <div className="mb-4 flex items-center justify-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: displayMatch.homeColor }}
                  />
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-600">
                    Head-to-head
                  </span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: displayMatch.awayColor }}
                  />
                </div>
                {historyLoading ? (
                  <div className="rounded-2xl bg-white/85 py-4 text-center text-xs font-bold text-zinc-400">
                    Loading history…
                  </div>
                ) : headToHeadMatches.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {headToHeadMatches.map((m) => (
                      <HeadToHeadRow
                        key={m.id}
                        match={m}
                        homeColor={displayMatch.homeColor}
                        awayColor={displayMatch.awayColor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/85 py-4 text-center text-[12px] font-medium text-zinc-500">
                    These two haven&apos;t met in the last two seasons.
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div
                    className="rounded-2xl p-3 shadow-sm"
                    style={{ backgroundColor: withAlpha(displayMatch.homeColor, "1f") }}
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: displayMatch.homeColor }}
                      />
                      <span className="truncate text-[10px] font-black uppercase tracking-wider text-zinc-600">
                        {displayMatch.homeName} form
                      </span>
                    </div>
                    <FormPills matches={homeForm} clubId={displayMatch.homeClubId} />
                  </div>
                  <div
                    className="rounded-2xl p-3 shadow-sm"
                    style={{ backgroundColor: withAlpha(displayMatch.awayColor, "1f") }}
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: displayMatch.awayColor }}
                      />
                      <span className="truncate text-[10px] font-black uppercase tracking-wider text-zinc-600">
                        {displayMatch.awayName} form
                      </span>
                    </div>
                    <FormPills matches={awayForm} clubId={displayMatch.awayClubId} />
                  </div>
                </div>
              </div>
            )}

            {!isLive && !isMatchFinished && (
              <div className="mt-8 text-center text-[11px] font-medium text-zinc-300">
                Live score updates automatically once kickoff arrives.
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}