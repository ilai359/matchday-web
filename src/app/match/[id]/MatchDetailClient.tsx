"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { matches } from "../../../data/matches";
import { useClubs } from "../../../context/ClubsContext";
import { getClub, getClubName } from "../../../lib/clubHelpers";
import {
  formatFullDate,
  formatFullDateWithYear,
  formatTime,
} from "../../../lib/dateHelpers";
import { formatCompetition } from "../../../lib/competitionNames";
import {
  fetchLiveMatches,
  fetchFinishedMatches,
  fetchLiveMatchStatus,
  fetchTeamInfo,
  extractTeamId,
  LiveMatch,
  FinishedMatch,
  LiveMatchStatus,
  LEAGUE_TO_CODE,
  fetchMatchById,
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
  // The score as already known from the initial fetch - not from live
  // polling (see liveStatus below). Needed so a match that finished a
  // while ago (reached e.g. from a club's "Recent form" list, well
  // outside the -15min/+180min window live polling even bothers with)
  // still shows its real final score instead of falling back to 0-0.
  homeScore: number | null;
  awayScore: number | null;
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
    homeScore: null,
    awayScore: null,
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
    // liveMatch.homeClubId/awayClubId are already either a real tracked
    // clubId, or (for a club we don't track) that team's own name used as
    // a stand-in ID - see mapRawMatch in footballApi.ts. `homeClub?.id`
    // was silently throwing that stand-in ID away for untracked clubs
    // (getClub() has nothing to find, so it returned undefined), which is
    // exactly why "recent form" and head-to-head always came up empty for
    // an opponent we don't track: there was no ID left for either of those
    // to match past matches against. Falling back to liveMatch's own
    // value keeps it for that case, while changing nothing for tracked
    // clubs (homeClub.id is already the same value there).
    homeClubId: homeClub?.id ?? liveMatch.homeClubId,
    awayClubId: awayClub?.id ?? liveMatch.awayClubId,
    kickoff: liveMatch.kickoff,
    venue: liveMatch.venue,
    city: liveMatch.city || undefined,
    statusLabel: liveMatch.status === "TIMED" ? "Scheduled" : liveMatch.status,
    homeScore: liveMatch.homeScore,
    awayScore: liveMatch.awayScore,
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
      <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
        No matches played in this competition yet
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
              : "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
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
        <div className="mt-2 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
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
    <div className="rounded-2xl bg-white/85 px-3 py-3 shadow-sm dark:bg-white/[0.08] dark:shadow-none">
      <div className="mb-2 text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
        {formatFullDateWithYear(match.kickoff)}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span
            className={`truncate text-[13px] ${
              homeWin
                ? "font-black text-[#111318] dark:text-white"
                : "font-medium text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {homeShort}
          </span>
          <ClubBadge name={homeShort} crest={homeCrest} color={homeColor} size={34} />
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#F5F6F8] px-3 py-1 dark:bg-white/10">
          <span
            className="text-base font-black"
            style={{ color: homeWin ? homeColor : "#A1A1AA" }}
          >
            {match.homeScore}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">–</span>
          <span
            className="text-base font-black"
            style={{ color: awayWin ? awayColor : "#A1A1AA" }}
          >
            {match.awayScore}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <ClubBadge name={awayShort} crest={awayCrest} color={awayColor} size={34} />
          <span
            className={`truncate text-[13px] ${
              awayWin
                ? "font-black text-[#111318] dark:text-white"
                : "font-medium text-zinc-400 dark:text-zinc-500"
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
  const router = useRouter();

  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [liveLoading, setLiveLoading] = useState(!mockMatch);

  useEffect(() => {
    if (mockMatch) return;
    fetchLiveMatches()
      .then((live) => {
        const found = live.find((m) => m.id === id) ?? null;
        if (found) return found;
        // Not upcoming or live - but that doesn't mean it isn't a real
        // match. fetchLiveMatches deliberately only covers what's
        // happening now or coming up soon, so a match that's already
        // finished (e.g. someone tapping a result from a club's "Recent
        // form" list) would otherwise come up empty here even though it
        // really happened. Look it up directly by id before giving up.
        return fetchMatchById(id);
      })
      .then((found) => setLiveMatch(found))
      .catch(() => setLiveMatch(null))
      .finally(() => setLiveLoading(false));
  }, [id, mockMatch]);

  const displayMatch: DisplayMatch | null = mockMatch
    ? buildFromMock(mockMatch)
    : liveMatch
    ? buildFromLive(liveMatch)
    : null;

  // Last-resort venue lookup for an opponent outside our own 132-club list
  // (e.g. a Champions League team we don't otherwise track), only used
  // when nothing else already gave us a venue: not this match's own data,
  // and not our hand-checked stadiums.ts (which only covers clubs we
  // track). A match is always played at the home side's ground, so it's
  // always the home team's info we need, never the away team's. City is
  // deliberately not attempted here - see fetchTeamInfo's comment.
  const [fallbackVenue, setFallbackVenue] = useState<string | undefined>(undefined);
  const needsFallbackVenue = Boolean(displayMatch && !displayMatch.venue);
  const homeCrestForLookup = needsFallbackVenue ? displayMatch?.homeCrest : undefined;

  useEffect(() => {
    if (!homeCrestForLookup) return;
    const teamId = extractTeamId(homeCrestForLookup);
    if (!teamId) return;
    let cancelled = false;
    fetchTeamInfo(teamId).then((info) => {
      if (!cancelled && info?.venue) setFallbackVenue(info.venue);
    });
    return () => {
      cancelled = true;
    };
  }, [homeCrestForLookup]);

  // Kept separate on purpose: head-to-head history looks back two seasons,
  // but "recent form" pills should only ever reflect the current season.
  //
  // Head-to-head looks back 3 seasons total (this one + the 2 before it) so
  // there's enough history to actually show something for rivalries that
  // don't meet every single year.
  const [currentSeasonMatches, setCurrentSeasonMatches] = useState<FinishedMatch[]>([]);
  const [previousSeasonMatches, setPreviousSeasonMatches] = useState<FinishedMatch[]>([]);
  const [twoSeasonsAgoMatches, setTwoSeasonsAgoMatches] = useState<FinishedMatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const rawCompetition = displayMatch?.rawCompetition;
  const homeClubId = displayMatch?.homeClubId;
  const awayClubId = displayMatch?.awayClubId;
  const leagueCode = rawCompetition ? LEAGUE_TO_CODE[rawCompetition] : undefined;
  useEffect(() => {
    // Only leagueCode is actually required to fetch this competition's
    // matches. We used to also require both clubs to be ones we recognize,
    // but that meant a match against a club we don't have in our list
    // (e.g. Fenerbahçe) silently hid the OTHER team's form too, even
    // though we know exactly who they are and could show it fine.
    if (!leagueCode) {
      return;
    }
    let cancelled = false;
    // This is the standard "start loading, then resolve" data-fetching
    // pattern: mark loading true right as the fetch kicks off, then false
    // in .finally() below once it settles. The linter would rather this
    // state change happen outside the effect entirely, but there's no
    // meaningful downside to the extra render here, and restructuring this
    // well-understood, safe pattern just to satisfy it would only make the
    // code harder to follow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistoryLoading(true);
    const currentSeasonYear = getSeasonStartYear(new Date());
    const previousSeasonYear = currentSeasonYear - 1;
    const twoSeasonsAgoYear = currentSeasonYear - 2;
    Promise.all([
      fetchFinishedMatches(leagueCode, String(currentSeasonYear)),
      fetchFinishedMatches(leagueCode, String(previousSeasonYear)),
      fetchFinishedMatches(leagueCode, String(twoSeasonsAgoYear)),
    ])
      .then(([current, previous, twoAgo]) => {
        if (!cancelled) {
          setCurrentSeasonMatches(current);
          setPreviousSeasonMatches(previous);
          setTwoSeasonsAgoMatches(twoAgo);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentSeasonMatches([]);
          setPreviousSeasonMatches([]);
          setTwoSeasonsAgoMatches([]);
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

    // Date.now() here is intentional and safe: this whole block only runs
    // inside this effect (never during render), which is exactly where
    // reading the real current time belongs - it decides whether it's
    // worth polling at all, it doesn't affect what gets rendered directly.
    // eslint-disable-next-line react-hooks/purity
    const minutesSinceKickoff = (Date.now() - kickoffTime) / 60000;
    const withinLiveWindow = minutesSinceKickoff >= -15 && minutesSinceKickoff <= 180;
    if (!withinLiveWindow) return;

    let cancelled = false;

    function poll() {
      fetchLiveMatchStatus(id)
        .then((result) => {
          if (cancelled || !result) return;
          setLiveStatus(result);
          if (result.status === "FINISHED") {
            clearInterval(intervalId);
          }
        })
        .catch(() => {});
    }

    poll();
    const intervalId = setInterval(poll, 45000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [id, kickoffForPolling]);

  if (!mockMatch && liveLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F6F8] dark:bg-[#0B0D12]">
        <div className="text-sm font-bold text-zinc-400 dark:text-zinc-500">Loading match…</div>
      </main>
    );
  }

  // Prefer real browser back-navigation so the Matches page keeps its
  // scroll position (Next.js restores scroll on back/forward). Only if
  // there's no history to go back to (e.g. someone opened this match via
  // a direct link) do we fall back to a normal push to /matches.
  function goBackToMatches() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/matches");
    }
  }

  if (!displayMatch) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F5F6F8] px-5 text-center dark:bg-[#0B0D12]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl dark:bg-white/10">
          ⚽
        </div>
        <h1 className="text-lg font-black text-[#111318] dark:text-white">Match not found</h1>
        <p className="max-w-xs text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          This match may have already been played or the link is out of date.
        </p>
        <button
          type="button"
          onClick={goBackToMatches}
          className="rounded-2xl bg-[#111318] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] dark:bg-white dark:text-[#111318]"
        >
          Back to Matches
        </button>
      </main>
    );
  }

  const isHomeFollowed = displayMatch.homeClubId
    ? selectedIds.includes(displayMatch.homeClubId)
    : false;
  const isAwayFollowed = displayMatch.awayClubId
    ? selectedIds.includes(displayMatch.awayClubId)
    : false;

  // Falls back to the status we already knew about the match (from the
  // list it was found in, or the by-id lookup) whenever the dedicated
  // live-status poll hasn't returned anything yet - otherwise a match
  // that's already known to be live shows as "not started" for the few
  // seconds before that poll's first response comes back, which is
  // exactly the confusing gap Ilai ran into.
  const isLive =
    liveStatus?.status === "IN_PLAY" ||
    liveStatus?.status === "PAUSED" ||
    (!liveStatus &&
      (displayMatch.statusLabel === "IN_PLAY" ||
        displayMatch.statusLabel === "PAUSED"));
  const isMatchFinished =
    liveStatus?.status === "FINISHED" || displayMatch.statusLabel === "FINISHED";
  const statusPillLabel = isLive
    ? liveStatus?.status === "PAUSED"
      ? "Half-time"
      : "Live"
    : isMatchFinished
    ? "Full-time"
    : displayMatch.statusLabel;

  const headToHeadMatches = [
    ...currentSeasonMatches,
    ...previousSeasonMatches,
    ...twoSeasonsAgoMatches,
  ]
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
    .slice(0, 2);

  function recentFormFor(clubId?: string): FinishedMatch[] {
    if (!clubId) return [];
    return currentSeasonMatches
      .filter((m) => m.homeClubId === clubId || m.awayClubId === clubId)
      // Newest first so `.slice(0, 5)` keeps the 5 most recent matches...
      .sort(
        (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()
      )
      .slice(0, 5)
      // ...then flipped back to oldest-first for display, so the pills
      // read left-to-right in normal chronological order (most recent
      // match on the right, matching how "form" is conventionally shown).
      .reverse();
  }

  const homeForm = recentFormFor(displayMatch.homeClubId);
  const awayForm = recentFormFor(displayMatch.awayClubId);

  // When there's no leagueCode, the history effect above never runs at all
  // (nothing to fetch), so `historyLoading` would otherwise be stuck at its
  // initial `true` forever. Rather than have the effect reach in and flip
  // that state itself (which just adds an extra render for no benefit),
  // it's simpler and just as correct to fold that condition in here.
  const isHistoryLoading = historyLoading && Boolean(leagueCode);

  const effectiveVenue = displayMatch.venue || fallbackVenue;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24 dark:bg-[#0B0D12]">
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 pt-8">
          <button
            type="button"
            onClick={goBackToMatches}
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-white/60 transition hover:text-white/90"
          >
            ← Back to Matches
          </button>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
            {displayMatch.competition}
          </div>
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.03em]">
            {displayMatch.homeName} vs {displayMatch.awayName}
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <article className="relative overflow-hidden rounded-[30px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
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
                  isLive
                    ? "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                    : "bg-[#F2F4F7] text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
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
                      ? "text-[16px] font-black text-[#111318] dark:text-white"
                      : "text-[14px] font-medium text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {displayMatch.homeName}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Home
                </div>
              </div>
              <div className="pt-3 text-center">
                {isLive || isMatchFinished ? (
                  <>
                    <div
                      className={`text-[9px] font-black uppercase tracking-[0.16em] ${
                        isLive ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"
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
                    <div className="mt-1 whitespace-nowrap text-2xl font-black tracking-tight text-[#111318] dark:text-white">
                      {liveStatus?.homeScore ?? displayMatch.homeScore ?? 0}
                      {" – "}
                      {liveStatus?.awayScore ?? displayMatch.awayScore ?? 0}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                      Kickoff
                    </div>
                    <div className="mt-1 whitespace-nowrap text-xl font-black tracking-tight text-[#111318] dark:text-white">
                      {formatTime(displayMatch.kickoff)}
                    </div>
                  </>
                )}
                <div className="mx-auto mt-2 w-fit rounded-full bg-[#F2F4F7] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:bg-white/10 dark:text-zinc-500">
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
                      ? "text-[16px] font-black text-[#111318] dark:text-white"
                      : "text-[14px] font-medium text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {displayMatch.awayName}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Away
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-white/10">
              <div className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Match details
              </div>

              {/* A different treatment on purpose - everywhere else on this
                  page is a white/dark-surface card with a thin color
                  stripe (see the ticket-stub version this replaced). This
                  one is a dark panel that matches the header's dark
                  background instead, with soft team-color glows behind a
                  simple icon/label/value row layout. It stays dark
                  regardless of light/dark mode on purpose - the point was
                  to look and feel distinct, not like a themed variant of
                  the same card pattern used everywhere else. */}
              <div className="relative overflow-hidden rounded-[28px] bg-[#0B0E16] p-6 text-white shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
                <div
                  className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl"
                  style={{ backgroundColor: withAlpha(displayMatch.homeColor, "55") }}
                />
                <div
                  className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full blur-3xl"
                  style={{ backgroundColor: withAlpha(displayMatch.awayColor, "55") }}
                />

                <div className="relative">
                  <div className="mb-5 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white/80">
                    {displayMatch.competition}
                  </div>

                  <div
                    className={
                      effectiveVenue || displayMatch.city
                        ? "grid grid-cols-1 gap-5 sm:grid-cols-3"
                        : "grid grid-cols-1 gap-5 sm:grid-cols-2"
                    }
                  >
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/45">
                        📅 Date
                      </div>
                      <div className="mt-1.5 text-sm font-black leading-snug">
                        {formatFullDate(displayMatch.kickoff)}
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/45">
                        🕐 Kickoff
                      </div>
                      <div className="mt-1.5 text-sm font-black leading-snug tabular-nums">
                        {formatTime(displayMatch.kickoff)}
                      </div>
                    </div>

                    {(effectiveVenue || displayMatch.city) && (
                      <div className="border-t border-white/10 pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/45">
                          📍 Venue
                        </div>
                        <div className="mt-1.5 text-sm font-black leading-snug">
                          {[effectiveVenue, displayMatch.city].filter(Boolean).join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-200">
                    Head-to-head
                  </span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: displayMatch.awayColor }}
                  />
                </div>
                {isHistoryLoading ? (
                  <div className="rounded-2xl bg-white/85 py-4 text-center text-xs font-bold text-zinc-400 dark:bg-white/[0.08] dark:text-zinc-300">
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
                  <div className="rounded-2xl bg-white/85 py-4 text-center text-[12px] font-medium text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400">
                    These two haven&apos;t met in the last three seasons.
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div
                    className="rounded-2xl p-3 shadow-sm dark:shadow-none"
                    style={{ backgroundColor: withAlpha(displayMatch.homeColor, "1f") }}
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: displayMatch.homeColor }}
                      />
                      <span className="truncate text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-200">
                        {displayMatch.homeName} form
                      </span>
                    </div>
                    <FormPills matches={homeForm} clubId={displayMatch.homeClubId} />
                  </div>
                  <div
                    className="rounded-2xl p-3 shadow-sm dark:shadow-none"
                    style={{ backgroundColor: withAlpha(displayMatch.awayColor, "1f") }}
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: displayMatch.awayColor }}
                      />
                      <span className="truncate text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-200">
                        {displayMatch.awayName} form
                      </span>
                    </div>
                    <FormPills matches={awayForm} clubId={displayMatch.awayClubId} />
                  </div>
                </div>
              </div>
            )}

            {!isLive && !isMatchFinished && (
              <div className="mt-8 text-center text-[11px] font-medium text-zinc-300 dark:text-zinc-600">
                Live score updates automatically once kickoff arrives.
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}