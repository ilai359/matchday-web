"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getClub } from "../../../lib/clubHelpers";
import { formatDate, formatTime } from "../../../lib/dateHelpers";
import { formatCompetition } from "../../../lib/competitionNames";
import { useClubs } from "../../../context/ClubsContext";
import { clubSpotlights } from "../../../data/clubSpotlights";
import { categoryStyles } from "../../../lib/categoryStyles";
import { fetchLiveUpdates, NewsUpdate } from "../../../lib/newsApi";
import {
  fetchStandings,
  fetchScorers,
  fetchFinishedMatches,
  fetchLiveMatches,
  LEAGUE_TO_CODE,
  StandingsRow,
  Scorer,
  FinishedMatch,
  LiveMatch,
} from "../../../lib/footballApi";
import ClubBadge from "../../../components/ClubBadge";

// Same rule as the match detail page: European club seasons run roughly
// July-June, so from July onward the season "starts" this calendar year.
function getSeasonStartYear(date: Date): number {
  const month = date.getMonth();
  const year = date.getFullYear();
  return month >= 6 ? year : year - 1;
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

type MatchLike = {
  homeClubId: string | null;
  awayClubId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: string | null;
  awayCrest: string | null;
};

// Works for both a live/upcoming match and a finished one - whichever side
// isn't this club is "the opponent", and this figures out their best
// available name/crest/color regardless of whether they're one of our own
// 132 tracked clubs or not.
function opponentOf(match: MatchLike, clubId: string) {
  const isHome = match.homeClubId === clubId;
  const oppClubId = isHome ? match.awayClubId : match.homeClubId;
  const oppRawName = isHome ? match.awayTeamName : match.homeTeamName;
  const oppRawCrest = isHome ? match.awayCrest : match.homeCrest;
  const oppClub = oppClubId ? getClub(oppClubId) : undefined;
  return {
    isHome,
    name: oppClub?.name ?? oppRawName,
    crest: oppClub?.crest ?? oppRawCrest ?? undefined,
    color: oppClub?.primaryColor ?? "#94A3B8",
  };
}

function resultPillClass(result: "W" | "D" | "L" | null): string {
  if (result === "W")
    return "bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)]";
  if (result === "L")
    return "bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)]";
  return "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
}

// Small "H"/"A" chip shown before an opponent's name on the results and
// fixtures lists. Given its own background/color (rather than just plain
// text jammed next to the club name) so it reads as a separate label at a
// glance instead of blurring into the name - and home vs away get
// different colors too, so which is which is visible without reading it.
function VenueTag({ isHome }: { isHome: boolean }) {
  return (
    <span
      className={`mr-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-[5px] px-1 text-[9px] font-black tracking-wide ${
        isHome
          ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
          : "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
      }`}
    >
      {isHome ? "H" : "A"}
    </span>
  );
}

export default function ClubDetailClient({ id }: { id: string }) {
  const club = getClub(id);
  const { selectedIds, toggleClub } = useClubs();
  const router = useRouter();
  const isFollowed = selectedIds.includes(id);
  const code = club ? LEAGUE_TO_CODE[club.league] : undefined;

  // News for this page reuses the exact same club-name list the Updates
  // page queries with (every club the user follows), rather than asking
  // for just this one club on its own. Asking about a single club in
  // isolation was producing weaker results - fewer genuinely-relevant
  // articles for the AI step to choose from, so lower-quality matches
  // occasionally slipped through. Querying the full followed list (same
  // as Updates page) reuses that page's well-tested, already-cached
  // result whenever this club is one the user follows, which is the only
  // way to reach this page today. This club's own name is always added
  // too, so a club that isn't followed (reachable by a direct link) still
  // gets its own coverage searched for.
  const followedClubNames = selectedIds
    .map((cid) => getClub(cid)?.name)
    .filter((name): name is string => Boolean(name));
  // Extra search terms for fetchLiveUpdates below - every followed club's
  // league, plus this page's own club's league - purely to widen the raw
  // pool of news articles searched. See the comment on fetchLiveUpdates
  // for why this can't loosen which articles count as relevant.
  const followedLeagues = Array.from(
    new Set(
      selectedIds
        .map((cid) => getClub(cid)?.league)
        .filter((league): league is string => Boolean(league))
        .concat(club?.league ? [club.league] : [])
    )
  );

  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [recentMatches, setRecentMatches] = useState<FinishedMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<LiveMatch[]>([]);
  const [news, setNews] = useState<NewsUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExpanded, setTableExpanded] = useState(false);

  useEffect(() => {
    // No `loading` to reset here if there's no club: the component
    // returns its own "not found" page below before this ever reaches
    // anything that reads `loading`.
    if (!club) {
      return;
    }
    let cancelled = false;
    // This is the standard "start loading, then resolve" data-fetching
    // pattern: mark loading true right as the fetch kicks off, then false
    // in .finally() below once it settles. The linter would rather this
    // happen outside the effect entirely, but there's no real downside to
    // the extra render here, and restructuring this well-understood, safe
    // pattern just to satisfy it would only make the code harder to
    // follow (same reasoning as the identical case in
    // MatchDetailClient.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const currentSeasonYear = String(getSeasonStartYear(new Date()));
    const newsQueryNames = Array.from(
      new Set([...followedClubNames, club.name])
    );
    Promise.all([
      code ? fetchStandings(code).catch(() => []) : Promise.resolve([]),
      code ? fetchScorers(code).catch(() => []) : Promise.resolve([]),
      code
        ? fetchFinishedMatches(code, currentSeasonYear).catch(() => [])
        : Promise.resolve([]),
      fetchLiveMatches().catch(() => []),
      fetchLiveUpdates(newsQueryNames, followedLeagues).catch(() => []),
    ])
      .then(([standingsRes, scorersRes, finishedRes, liveRes, newsRes]) => {
        if (cancelled) return;
        setStandings(standingsRes);
        setScorers(scorersRes);
        setRecentMatches(finishedRes);
        setUpcomingMatches(liveRes);
        // fetchLiveUpdates already tags every article with the specific
        // club(s) it's genuinely about (that's how the Updates page shows
        // each article under the right club) - so getting this club's news
        // is just keeping the ones tagged for this club, not a new lookup.
        setNews(newsRes.filter((update) => update.clubId === club.id));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // followedClubNames intentionally excluded: it's derived fresh from
    // selectedIds every render, and including it (a new array each time)
    // would refetch on every render. club.id/club.name/code already cover
    // when this page's own data actually needs to change; the follow list
    // is read fresh at the moment this effect runs regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id, club?.name, code]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/clubs");
    }
  }

  if (!club) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F5F6F8] px-5 text-center dark:bg-[#0B0D12]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl dark:bg-white/10">
          🏟️
        </div>
        <h1 className="text-lg font-black text-[#111318] dark:text-white">
          Club not found
        </h1>
        <button
          type="button"
          onClick={goBack}
          className="rounded-2xl bg-[#111318] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] dark:bg-white dark:text-[#111318]"
        >
          Go back
        </button>
      </main>
    );
  }

  const clubRow = standings.find((row) => row.clubId === club.id);

  const clubResults = recentMatches
    .filter((m) => m.homeClubId === club.id || m.awayClubId === club.id)
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
    .slice(0, 5);
  const formResults = [...clubResults].reverse();

  const clubUpcoming = upcomingMatches
    .filter((m) => m.homeClubId === club.id || m.awayClubId === club.id)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .slice(0, 5);

  const clubScorers = scorers
    .filter((s) => s.clubId === club.id)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);
  const clubAssists = scorers
    .filter((s) => s.clubId === club.id && (s.assists ?? 0) > 0)
    .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))
    .slice(0, 5);

  const spotlight = clubSpotlights.find((s) => s.clubId === club.id);

  // Collapsed view: 5 rows centered on the club's own position, not just
  // the top of the table - a mid-table or relegation-zone club (like most
  // of them, most of the time) previously never appeared in its own
  // collapsed table at all, which was the actual point of putting a
  // league table on a club's own page. Falls back to the top 5 only if
  // this club's row isn't in the standings at all (shouldn't normally
  // happen). Clamped at both ends so a club near #1 or the very bottom
  // still gets a full 5-row window instead of running off the table.
  const COLLAPSED_TABLE_ROWS = 5;
  const thisClubId = club.id;
  function centeredTableRows(rows: StandingsRow[], count: number): StandingsRow[] {
    if (rows.length <= count) return rows;
    const idx = rows.findIndex((row) => row.clubId === thisClubId);
    if (idx === -1) return rows.slice(0, count);
    let start = idx - Math.floor(count / 2);
    start = Math.max(0, Math.min(start, rows.length - count));
    return rows.slice(start, start + count);
  }
  const tableRows = tableExpanded
    ? standings
    : centeredTableRows(standings, COLLAPSED_TABLE_ROWS);

  const hasAnyData =
    !loading &&
    (clubRow ||
      clubResults.length > 0 ||
      clubUpcoming.length > 0 ||
      clubScorers.length > 0 ||
      news.length > 0);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-4 dark:bg-[#0B0D12]">
      <header
        className="relative overflow-hidden text-white"
        style={{
          background: `linear-gradient(135deg, ${club.primaryColor} 0%, #0B0F1A 130%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-[80px]" />
          <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-black/30 blur-[80px]" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-5 pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg backdrop-blur-md transition hover:bg-white/20 active:scale-95"
              aria-label="Go back"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => toggleClub(club.id)}
              className={`rounded-2xl px-4 py-2.5 text-xs font-black backdrop-blur-md transition active:scale-95 ${
                isFollowed
                  ? "border border-white/15 bg-white/15 text-white hover:bg-white/25"
                  : "bg-white text-[#111318] hover:bg-white/90"
              }`}
            >
              {isFollowed ? "✓ Following" : "+ Follow"}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-2xl bg-white p-2 shadow-lg">
              <ClubBadge
                name={club.name}
                crest={club.crest}
                color={club.primaryColor}
                size={56}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/80 backdrop-blur-md">
                {club.league}
              </div>
              <h1 className="truncate text-2xl font-black leading-tight">
                {club.name}
              </h1>
              <div className="mt-1 text-xs font-medium text-white/50">
                {club.country}
              </div>
            </div>
            {clubRow && (
              <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-center backdrop-blur-md">
                <div className="text-2xl font-black leading-none">
                  #{clubRow.position}
                </div>
                <div className="mt-1 text-[8px] font-black uppercase tracking-wider text-white/60">
                  Place
                </div>
              </div>
            )}
          </div>
          {clubRow && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              <HeaderStat label="P" value={clubRow.playedGames} />
              <HeaderStat label="W" value={clubRow.won} />
              <HeaderStat label="D" value={clubRow.draw} />
              <HeaderStat label="L" value={clubRow.lost} />
              <HeaderStat label="Pts" value={clubRow.points} highlight />
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-4">
        {loading && (
          <div className="animate-pulse" aria-hidden="true">
            <div className="mb-6">
              <div className="mb-3 h-3.5 w-28 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
              <div className="mb-3 flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
                  />
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-black/[0.045] bg-white px-3.5 py-3 shadow-sm dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none"
                  >
                    <div className="h-7 w-7 shrink-0 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                    <div className="h-8 w-8 shrink-0 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 h-3 w-2/3 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                      <div className="h-2.5 w-1/3 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
                    </div>
                    <div className="h-4 w-10 shrink-0 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 h-3.5 w-32 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
              <div className="overflow-hidden rounded-2xl border border-black/[0.045] bg-white dark:border-white/[0.06] dark:bg-[#14171F]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-black/[0.03] px-3.5 py-3 last:border-b-0 dark:border-white/[0.04]"
                  >
                    <div className="h-5 w-5 shrink-0 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                    <div className="h-4 w-4 shrink-0 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                    <div className="h-3 flex-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                    <div className="h-3 w-6 shrink-0 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !hasAnyData && (
          <div className="rounded-[28px] border border-black/[0.04] bg-white px-6 py-8 text-center shadow-sm dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl dark:bg-white/10">
              🏟️
            </div>
            <h2 className="mb-2 text-lg font-black text-[#111318] dark:text-white">
              No data available right now
            </h2>
            <p className="mx-auto max-w-xs text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              We couldn&apos;t load stats for {club.name} at the moment.
            </p>
          </div>
        )}

        {/* AI SPOTLIGHT */}
        {!loading && spotlight && (
          <section className="mb-4">
            <div className="overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 p-4 dark:border-blue-500/20 dark:from-blue-500/[0.06] dark:to-violet-500/[0.06]">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-500 dark:text-blue-400">
                ✨ AI Summary · written {formatDate(spotlight.writtenAt)}
              </div>
              <h3 className="mb-1.5 text-base font-black text-[#111318] dark:text-white">
                {spotlight.title}
              </h3>
              <p className="text-[13px] leading-[1.7] text-zinc-600 dark:text-zinc-300">
                {spotlight.summary}
              </p>
            </div>
          </section>
        )}

        {/* RECENT FORM + RESULTS */}
        {!loading && clubResults.length > 0 && (
          <section className="mb-4">
            <SectionHeading icon="📈" title="Recent form" />
            <div className="mb-3 flex gap-1.5">
              {formResults.map((m) => {
                const result = resultFor(m, club.id);
                const opp = opponentOf(m, club.id);
                return (
                  <div
                    key={m.id}
                    title={`${opp.isHome ? club.name : opp.name} ${m.homeScore}-${m.awayScore} ${
                      opp.isHome ? opp.name : club.name
                    }`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black ${resultPillClass(
                      result
                    )}`}
                  >
                    {result ?? "–"}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              {clubResults.map((m) => {
                const result = resultFor(m, club.id);
                const opp = opponentOf(m, club.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl border border-black/[0.045] bg-white px-3.5 py-3 shadow-sm dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none"
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${resultPillClass(
                        result
                      )}`}
                    >
                      {result ?? "–"}
                    </div>
                    <ClubBadge name={opp.name} crest={opp.crest} color={opp.color} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center truncate text-[13px] font-bold text-[#111318] dark:text-white">
                        <VenueTag isHome={opp.isHome} />
                        {opp.name}
                      </div>
                      <div className="truncate text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                        {formatDate(m.kickoff)} · {formatCompetition(m.competition)}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-black text-[#111318] dark:text-white">
                      {opp.isHome ? `${m.homeScore}–${m.awayScore}` : `${m.awayScore}–${m.homeScore}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* UPCOMING FIXTURES */}
        {!loading && clubUpcoming.length > 0 && (
          <section className="mb-4">
            <SectionHeading icon="📅" title="Upcoming fixtures" />
            <div className="flex flex-col gap-2">
              {clubUpcoming.map((m) => {
                const opp = opponentOf(m, club.id);
                return (
                  <Link
                    key={m.id}
                    href={`/match/${m.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-black/[0.045] bg-white px-3.5 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none"
                  >
                    <ClubBadge name={opp.name} crest={opp.crest} color={opp.color} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center truncate text-[13px] font-bold text-[#111318] dark:text-white">
                        <VenueTag isHome={opp.isHome} />
                        {opp.name}
                      </div>
                      <div className="truncate text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                        {formatDate(m.kickoff)} · {formatCompetition(m.competition)}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs font-black text-[#111318] dark:text-white">
                      {formatTime(m.kickoff)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* LEAGUE TABLE */}
        {!loading && standings.length > 0 && (
          <section className="mb-4">
            <SectionHeading icon="📊" title="League table" />
            <div className="overflow-hidden rounded-[24px] border border-black/[0.045] bg-white p-3 shadow-sm dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
              <div className="flex flex-col gap-0.5">
                {tableRows.map((row) => {
                  const isClub = row.clubId === club.id;
                  // Besides the club this page is about (filled highlight
                  // above), also mark any *other* team in this table that
                  // the person follows - just a light outline in that
                  // team's own color, so it doesn't compete with the main
                  // highlight but is still easy to spot at a glance.
                  const followedClub =
                    !isClub && row.clubId && selectedIds.includes(row.clubId)
                      ? getClub(row.clubId)
                      : null;
                  return (
                    <div
                      key={row.teamName}
                      className="flex items-center gap-2 rounded-xl px-2 py-1.5"
                      style={
                        isClub
                          ? {
                              backgroundColor: `${club.primaryColor}12`,
                              border: `1px solid ${club.primaryColor}33`,
                            }
                          : followedClub
                          ? {
                              backgroundColor: `${followedClub.primaryColor}0A`,
                              border: `1px solid ${followedClub.primaryColor}30`,
                            }
                          : undefined
                      }
                    >
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                        style={{
                          backgroundColor: isClub
                            ? club.primaryColor
                            : followedClub
                            ? followedClub.primaryColor
                            : "#D4D4D8",
                        }}
                      >
                        {row.position}
                      </div>
                      {row.crest ? (
                        <Image
                          src={row.crest}
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 shrink-0 object-contain"
                        />
                      ) : (
                        // Keeps every row's team name aligned to the same
                        // starting position whether or not that row has a
                        // crest to show, instead of names shifting left on
                        // rows for a club we don't track.
                        <div className="h-4 w-4 shrink-0" />
                      )}
                      <div
                        className={`min-w-0 flex-1 truncate text-[12px] ${
                          isClub
                            ? "font-black text-[#111318] dark:text-white"
                            : followedClub
                            ? "font-bold text-[#111318] dark:text-white"
                            : "font-semibold text-zinc-600 dark:text-zinc-300"
                        }`}
                      >
                        {row.teamName}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                        <span className="w-5 text-right">{row.playedGames}P</span>
                        <span className="w-6 text-right">
                          {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </span>
                        <span
                          className={`w-10 text-right ${
                            isClub ? "font-black" : "font-bold text-zinc-500 dark:text-zinc-400"
                          }`}
                          style={isClub ? { color: club.primaryColor } : undefined}
                        >
                          {row.points} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {standings.length > COLLAPSED_TABLE_ROWS && (
                <button
                  type="button"
                  onClick={() => setTableExpanded((v) => !v)}
                  className="mt-2 w-full rounded-xl py-2 text-center text-[11px] font-black text-zinc-400 transition hover:bg-[#F5F6F8] dark:text-zinc-500 dark:hover:bg-white/5"
                >
                  {tableExpanded ? "Show less ↑" : `Show full table (${standings.length}) ↓`}
                </button>
              )}
            </div>
          </section>
        )}

        {/* TOP SCORERS / ASSISTS */}
        {!loading && (clubScorers.length > 0 || clubAssists.length > 0) && (
          <section className="mb-4">
            <SectionHeading icon="⚽" title="Club stats (League)" />
            <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-black/[0.045] bg-white p-3.5 shadow-sm dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
              <PlayerStatList title="Top scorers" icon="⚽" items={clubScorers} statKey="goals" club={club} />
              <PlayerStatList title="Top assists" icon="🎯" items={clubAssists} statKey="assists" club={club} />
            </div>
          </section>
        )}

        {/* NEWS */}
        {!loading && news.length > 0 && (
          <section className="mb-4">
            <SectionHeading icon="⚡" title="Latest news" />
            <div className="flex flex-col gap-2.5">
              {news.slice(0, 4).map((update) => {
                const style = categoryStyles[update.category] ?? categoryStyles.Club;
                return (
                  <a
                    key={update.id}
                    href={update.link || undefined}
                    target={update.link ? "_blank" : undefined}
                    rel={update.link ? "noopener noreferrer" : undefined}
                    className="block rounded-[22px] border border-black/[0.045] bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none"
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                        style={{ backgroundColor: style.background, color: style.color }}
                      >
                        {style.icon}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {update.category}
                      </span>
                    </div>
                    <div className="text-[13px] font-black leading-snug text-[#111318] dark:text-white">
                      {update.title}
                    </div>
                  </a>
                );
              })}
            </div>
            <Link
              href="/updates"
              className="mt-3 block rounded-2xl bg-[#F1F3F7] py-2.5 text-center text-xs font-black text-zinc-500 transition hover:bg-[#E4E7EC] dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15"
            >
              See all updates →
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5 px-1">
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
        {title}
      </span>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 px-2 py-2 text-center backdrop-blur-md ${
        highlight ? "bg-white/20" : "bg-white/5"
      }`}
    >
      <div className="text-sm font-black leading-none text-white">{value}</div>
      <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/60">
        {label}
      </div>
    </div>
  );
}

function PlayerStatList({
  title,
  icon,
  items,
  statKey,
  club,
}: {
  title: string;
  icon: string;
  items: Scorer[];
  statKey: "goals" | "assists";
  club: { id: string; primaryColor: string };
}) {
  if (items.length === 0) {
    return (
      <div>
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
            {title}
          </span>
        </div>
        <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          No data yet this season.
        </p>
      </div>
    );
  }
  const max = Math.max(...items.map((i) => i[statKey] ?? 0), 1);
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
          {title}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => {
          const value = item[statKey] ?? 0;
          return (
            <li key={`${item.playerName}-${i}`} className="flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-black text-zinc-400 dark:bg-white/10 dark:text-zinc-400">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold text-[#111318] dark:text-white">
                  {item.playerName}
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-zinc-100 dark:bg-white/10">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{ width: `${(value / max) * 100}%`, backgroundColor: club.primaryColor }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-xs font-black" style={{ color: club.primaryColor }}>
                {value}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
