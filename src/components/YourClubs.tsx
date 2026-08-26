"use client";

import { useEffect, useState } from "react";
import { useClubs } from "../context/ClubsContext";
import { getClub } from "../lib/clubHelpers";
import {
  fetchStandings,
  fetchScorers,
  LEAGUE_TO_CODE,
  StandingsRow,
  Scorer,
} from "../lib/footballApi";
import { Club } from "../data/clubs";
import ClubBadge from "./ClubBadge";

type LeagueData = {
  standings: StandingsRow[];
  scorers: Scorer[];
};

export default function YourClubs() {
  const { selectedIds } = useClubs();
  const [leagueData, setLeagueData] = useState<Record<string, LeagueData>>({});
  const [loading, setLoading] = useState(true);

  const followedClubs = selectedIds
    .map((id) => getClub(id))
    .filter((club): club is Club => Boolean(club));

  const supportedLeagues = Array.from(
    new Set(
      followedClubs
        .map((club) => club.league)
        .filter((league) => LEAGUE_TO_CODE[league])
    )
  );
  const leaguesKey = supportedLeagues.join(",");

  useEffect(() => {
    if (supportedLeagues.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      supportedLeagues.map(async (league) => {
        const code = LEAGUE_TO_CODE[league];
        const [standings, scorers] = await Promise.all([
          fetchStandings(code).catch(() => []),
          fetchScorers(code).catch(() => []),
        ]);
        return [league, { standings, scorers }] as const;
      })
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, LeagueData> = {};
        for (const [league, data] of results) {
          next[league] = data;
        }
        setLeagueData(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaguesKey]);

  if (followedClubs.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[22px] font-black tracking-tight text-[#111318]">
            Your Clubs
          </h2>
          <p className="mt-0.5 text-xs font-medium text-zinc-400">
            League tables and top performers
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-sm text-white shadow-lg shadow-blue-500/20">
          🏆
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {followedClubs.map((club) => {
          const code = LEAGUE_TO_CODE[club.league];
          if (!code) {
            return (
              <div
                key={club.id}
                className="flex items-center gap-3 rounded-[24px] border border-dashed border-zinc-200 bg-white p-4"
              >
                <ClubBadge
                  name={club.name}
                  crest={club.crest}
                  color={club.primaryColor}
                  size={44}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-[#111318]">
                    {club.name}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-zinc-400">
                    Stats for {club.league} aren&apos;t available yet
                  </div>
                </div>
              </div>
            );
          }
          const data = leagueData[club.league];
          return (
            <ClubStatsCard
              key={club.id}
              club={club}
              standings={data?.standings ?? []}
              scorers={data?.scorers ?? []}
              loading={loading && !data}
            />
          );
        })}
      </div>
    </section>
  );
}

// Returns the top N by a stat, plus this club's own best player for that
// stat if they didn't already make the top N — so there's always
// something of the club's to highlight, even in a thin/early-season list.
// Ties go to the followed club's player first.
function topWithClubGuaranteed(
  scorers: Scorer[],
  clubId: string,
  stat: "goals" | "assists",
  limit: number
): Scorer[] {
  const eligible =
    stat === "assists"
      ? scorers.filter((s) => s.assists !== null && s.assists > 0)
      : scorers;
  const sorted = [...eligible].sort((a, b) => {
    const diff = (b[stat] ?? 0) - (a[stat] ?? 0);
    if (diff !== 0) return diff;
    if (a.clubId === clubId && b.clubId !== clubId) return -1;
    if (b.clubId === clubId && a.clubId !== clubId) return 1;
    return 0;
  });
  const top = sorted.slice(0, limit);
  const alreadyIncluded = top.some((s) => s.clubId === clubId);
  if (!alreadyIncluded) {
    const clubBest = sorted.find((s) => s.clubId === clubId);
    if (clubBest) {
      return [...top, clubBest];
    }
  }
  return top;
}

// The API groups tied teams under the same position number. Within each
// tied group, move the followed club's row to the front, then renumber
// everything sequentially so no two teams ever show the same position.
function applyClubTieBreak(
  rows: StandingsRow[],
  clubId: string
): StandingsRow[] {
  const groups: StandingsRow[][] = [];
  for (const row of rows) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].position === row.position) {
      lastGroup.push(row);
    } else {
      groups.push([row]);
    }
  }
  const reordered = groups.flatMap((group) => {
    if (group.length <= 1) return group;
    const clubRow = group.find((r) => r.clubId === clubId);
    if (!clubRow) return group;
    return [clubRow, ...group.filter((r) => r !== clubRow)];
  });
  return reordered.map((row, i) => ({ ...row, position: i + 1 }));
}

function rankBadgeClass(i: number): string {
  const base =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black";
  if (i === 0)
    return `${base} text-white bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/30`;
  if (i === 1)
    return `${base} text-white bg-gradient-to-br from-zinc-300 to-zinc-500 shadow-sm shadow-zinc-400/30`;
  if (i === 2)
    return `${base} text-white bg-gradient-to-br from-orange-400 to-orange-700 shadow-sm shadow-orange-500/30`;
  return `${base} text-zinc-400 bg-zinc-100`;
}

function StatPill({
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

function StatList({
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
  club: Club;
}) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i[statKey] ?? 0), 1);

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
          {title}
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => {
          const isClub = item.clubId === club.id;
          const value = item[statKey] ?? 0;
          return (
            <li key={`${item.playerName}-${i}`} className="flex items-center gap-2.5">
              <div className={rankBadgeClass(i)}>{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-[12px] leading-tight ${
                    isClub ? "font-black text-[#111318]" : "font-semibold text-zinc-500"
                  }`}
                >
                  {item.playerName}
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-zinc-100">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: `${(value / max) * 100}%`,
                      backgroundColor: isClub ? club.primaryColor : "#D4D4D8",
                    }}
                  />
                </div>
              </div>
              <div
                className={`shrink-0 text-xs font-black ${isClub ? "" : "text-zinc-400"}`}
                style={isClub ? { color: club.primaryColor } : undefined}
              >
                {value}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ClubStatsCard({
  club,
  standings,
  scorers,
  loading,
}: {
  club: Club;
  standings: StandingsRow[];
  scorers: Scorer[];
  loading: boolean;
}) {
  const rankedStandings = applyClubTieBreak(standings, club.id);
  const clubIndex = rankedStandings.findIndex((row) => row.clubId === club.id);
  const clubRow = clubIndex >= 0 ? rankedStandings[clubIndex] : undefined;

  const visibleRows =
    clubIndex >= 0
      ? rankedStandings.slice(Math.max(0, clubIndex - 2), clubIndex + 3)
      : rankedStandings.slice(0, 5);

  const topScorers = topWithClubGuaranteed(scorers, club.id, "goals", 5);
  const topAssists = topWithClubGuaranteed(scorers, club.id, "assists", 5);

  const hasStats =
    !loading &&
    (visibleRows.length > 0 || topScorers.length > 0 || topAssists.length > 0);

  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.1)]">
      <div
        className="relative overflow-hidden p-5 text-white"
        style={{
          background: `linear-gradient(135deg, ${club.primaryColor} 0%, #0B0F1A 130%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-[60px]" />
          <div className="absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-black/30 blur-[60px]" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="shrink-0 rounded-2xl bg-white p-1.5 shadow-lg">
            <ClubBadge
              name={club.name}
              crest={club.crest}
              color={club.primaryColor}
              size={48}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/80 backdrop-blur-md">
              {club.league}
            </div>
            <div className="truncate text-lg font-black leading-tight">
              {club.name}
            </div>
          </div>
          {clubRow && (
            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-center backdrop-blur-md">
              <div className="text-xl font-black leading-none">
                #{clubRow.position}
              </div>
              <div className="mt-1 text-[8px] font-black uppercase tracking-wider text-white/60">
                Place
              </div>
            </div>
          )}
        </div>
        {clubRow && (
          <div className="relative z-10 mt-4 grid grid-cols-4 gap-2">
            <StatPill label="P" value={clubRow.playedGames} />
            <StatPill label="W" value={clubRow.won} />
            <StatPill label="D" value={clubRow.draw} />
            <StatPill label="Pts" value={clubRow.points} highlight />
          </div>
        )}
      </div>

      {loading && (
        <div className="p-6 text-center text-xs font-medium text-zinc-400">
          Loading league info…
        </div>
      )}

      {!loading && !hasStats && (
        <div className="p-6 text-center text-xs font-medium text-zinc-400">
          No league info available right now.
        </div>
      )}

      {!loading && visibleRows.length > 0 && (
        <div className="p-4 pt-5">
          <div className="mb-2.5 flex items-center gap-1.5">
            <span className="text-sm">📊</span>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
              League table
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {visibleRows.map((row) => {
              const isClub = row.clubId === club.id;
              return (
                <div
                  key={row.teamName}
                  className="flex items-center gap-3 rounded-2xl px-2.5 py-2"
                  style={
                    isClub
                      ? {
                          backgroundColor: `${club.primaryColor}12`,
                          border: `1px solid ${club.primaryColor}33`,
                        }
                      : undefined
                  }
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                    style={{
                      backgroundColor: isClub ? club.primaryColor : "#D4D4D8",
                    }}
                  >
                    {row.position}
                  </div>
                  <div
                    className={`min-w-0 flex-1 truncate text-[13px] ${
                      isClub ? "font-black text-[#111318]" : "font-semibold text-zinc-600"
                    }`}
                  >
                    {row.teamName}
                  </div>
                                   <div className="flex shrink-0 items-center gap-3 text-[11px] font-bold text-zinc-400">
                    <span className="w-6 text-right">{row.playedGames}P</span>
                    <span className="w-7 text-right">
                      {row.goalDifference > 0
                        ? `+${row.goalDifference}`
                        : row.goalDifference}
                    </span>
                    <span
                      className={`w-12 text-right ${
                        isClub ? "font-black" : "font-bold text-zinc-500"
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
        </div>
      )}

      {!loading && (topScorers.length > 0 || topAssists.length > 0) && (
        <div className="grid grid-cols-1 gap-5 p-4 pt-5 sm:grid-cols-2">
          <StatList
            title="Top scorers"
            icon="⚽"
            items={topScorers}
            statKey="goals"
            club={club}
          />
          <StatList
            title="Top assists"
            icon="🎯"
            items={topAssists}
            statKey="assists"
            club={club}
          />
        </div>
      )}
    </div>
  );
}