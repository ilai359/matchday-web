"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClubs } from "../context/ClubsContext";
import { getClub } from "../lib/clubHelpers";
import {
  fetchFinishedMatches,
  fetchLiveMatches,
  fetchStandings,
  leaguesToCodes,
  StandingsRow,
} from "../lib/footballApi";
import { createRecapShareImage, shareOrDownloadImage } from "../lib/shareImage";
import ClubBadge from "./ClubBadge";
import { useNow } from "../lib/useNow";

// "Your weekend" / "Your midweek": once ALL your clubs have played their
// matches of a round, the next morning one card at the top of Home shows
// each club's result and where it left them in the table. A round is
// Friday-Monday (weekend) or Tuesday-Thursday (midweek), so a Wednesday
// match never gets mixed in with the weekend's. Shown for 3 days, or
// until dismissed.

const DISMISSED_KEY = "clubside-recap-dismissed";
const POSITIONS_KEY = "clubside-positions";
const LOOK_BACK_MS = 8 * 24 * 60 * 60 * 1000;
const SHOW_FOR_MS = 3 * 24 * 60 * 60 * 1000;

type PositionLog = Record<string, Array<{ position: number; at: number }>>;

type AnyMatch = {
  id: string;
  kickoff: string;
  status: string;
  homeClubId: string | null;
  awayClubId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

type Round = { kind: "weekend" | "midweek"; start: number; end: number };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked - not worth failing over.
  }
}

function currentSeason(): string {
  const now = new Date();
  return String(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1);
}

function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** 06:00 local time on the day after `time`. */
function nextMorning(time: number): number {
  const d = new Date(time);
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return d.getTime();
}

/** Friday-Monday = weekend round, Tuesday-Thursday = midweek round (local time). */
function roundOf(iso: string): Round {
  const d = new Date(iso);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const weekend = day === 5 || day === 6 || day === 0 || day === 1;
  const offset = weekend
    ? ({ 5: 0, 6: 1, 0: 2, 1: 3 } as Record<number, number>)[day]
    : ({ 2: 0, 3: 1, 4: 2 } as Record<number, number>)[day];
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(end.getDate() + (weekend ? 4 : 3));
  return { kind: weekend ? "weekend" : "midweek", start: start.getTime(), end: end.getTime() };
}

type Row = {
  clubId: string;
  match: AnyMatch;
  result: "W" | "D" | "L";
  tableLine?: string;
};

export default function MatchdayRecap() {
  const { selectedIds, loaded } = useClubs();
  const [matches, setMatches] = useState<AnyMatch[]>([]);
  const [tables, setTables] = useState<Record<string, StandingsRow[]>>({});
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const now = useNow(60_000);

  const leagues = selectedIds
    .map((id) => getClub(id)?.league)
    .filter((league): league is string => Boolean(league));
  const codes = leaguesToCodes(leagues);
  const codesKey = codes.slice().sort().join(",");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissedKey(readJson<string | null>(DISMISSED_KEY, null));
  }, []);

  useEffect(() => {
    if (!loaded || codes.length === 0) return;
    let cancelled = false;
    const season = currentSeason();
    // Two sources: the season's results (older matches) and the list the
    // Matches page uses (updated every minute - yesterday's results and
    // what's still to come this round). The fresher copy wins.
    Promise.all([
      Promise.all(codes.map((code) => fetchFinishedMatches(code, season).catch(() => []))),
      fetchLiveMatches(codes, { includeRecentlyFinished: true }).catch(() => []),
    ])
      .then(([finishedLists, live]) => {
        if (cancelled) return;
        const byId = new Map<string, AnyMatch>();
        for (const m of finishedLists.flat()) {
          byId.set(m.id, { ...m, status: "FINISHED" });
        }
        for (const m of live) {
          const existing = byId.get(m.id);
          if (existing && existing.status === "FINISHED" && m.status !== "FINISHED") continue;
          byId.set(m.id, {
            id: m.id,
            kickoff: m.kickoff,
            status: m.status,
            homeClubId: m.homeClubId,
            awayClubId: m.awayClubId,
            homeTeamName: m.homeTeamName,
            awayTeamName: m.awayTeamName,
            homeCrest: m.homeCrest,
            awayCrest: m.awayCrest,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
          });
        }
        setMatches(Array.from(byId.values()));
      })
      .catch(() => {});
    Promise.all(
      codes
        .filter((code) => code !== "CL")
        .map(async (code) => [code, await fetchStandings(code).catch(() => [])] as const)
    )
      .then((entries) => {
        if (!cancelled) setTables(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, codesKey]);

  // Keep a small history of each followed club's table position on the
  // phone, so the recap can say how far a club moved.
  useEffect(() => {
    const allRows = Object.values(tables).flat();
    if (allRows.length === 0) return;
    const log = readJson<PositionLog>(POSITIONS_KEY, {});
    const at = Date.now();
    for (const clubId of selectedIds) {
      const row = allRows.find((r) => r.clubId === clubId);
      if (!row) continue;
      const history = log[clubId] ?? [];
      const last = history[history.length - 1];
      if (!last || last.position !== row.position || at - last.at > 6 * 60 * 60 * 1000) {
        history.push({ position: row.position, at });
      }
      log[clubId] = history.slice(-12);
    }
    writeJson(POSITIONS_KEY, log);
  }, [tables, selectedIds]);

  const involves = (m: AnyMatch, clubId: string) => m.homeClubId === clubId || m.awayClubId === clubId;
  const followedMatches = matches.filter((m) => selectedIds.some((id) => involves(m, id)));
  const finished = followedMatches
    .filter(
      (m) =>
        m.status === "FINISHED" &&
        m.homeScore !== null &&
        m.awayScore !== null &&
        now - new Date(m.kickoff).getTime() < LOOK_BACK_MS
    )
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime());
  if (finished.length === 0) return null;

  // The round of the most recent result - only matches from that round.
  const round = roundOf(finished[0].kickoff);
  const inRound = (m: AnyMatch) => {
    const t = new Date(m.kickoff).getTime();
    return t >= round.start && t < round.end;
  };

  // Wait until every followed club has played its match of this round.
  const stillToPlay = followedMatches.some(
    (m) =>
      inRound(m) &&
      (m.status === "SCHEDULED" || m.status === "TIMED" || m.status === "IN_PLAY" || m.status === "PAUSED")
  );
  if (stillToPlay) return null;

  const allTableRows = Object.values(tables).flat();
  const positionLog = readJson<PositionLog>(POSITIONS_KEY, {});
  const rows: Row[] = [];
  for (const clubId of selectedIds) {
    const match = finished.find((m) => involves(m, clubId) && inRound(m));
    if (!match) continue;
    const isHome = match.homeClubId === clubId;
    const own = (isHome ? match.homeScore : match.awayScore) as number;
    const other = (isHome ? match.awayScore : match.homeScore) as number;
    const result = own > other ? "W" : own < other ? "L" : "D";

    let tableLine: string | undefined;
    const tableRow = allTableRows.find((r) => r.clubId === clubId);
    if (tableRow) {
      const kickoff = new Date(match.kickoff).getTime();
      const before = (positionLog[clubId] ?? []).filter((p) => p.at < kickoff).pop();
      const moved = before ? before.position - tableRow.position : 0;
      tableLine =
        moved > 0
          ? `Now ${ordinal(tableRow.position)} · up ${moved}`
          : moved < 0
            ? `Now ${ordinal(tableRow.position)} · down ${-moved}`
            : `Now ${ordinal(tableRow.position)}`;
    }
    rows.push({ clubId, match, result, tableLine });
  }
  if (rows.length === 0) return null;

  const kickoffs = rows.map((r) => new Date(r.match.kickoff).getTime());
  const lastKickoff = Math.max(...kickoffs);
  const showFrom = nextMorning(lastKickoff + 2 * 60 * 60 * 1000);
  if (now < showFrom || now > showFrom + SHOW_FOR_MS) return null;
  const recapKey = rows.map((r) => r.match.id).sort().join(",");
  if (dismissedKey === recapKey) return null;

  const heading = round.kind === "weekend" ? "Your weekend" : "Your midweek";
  const dayLabel = (t: number) =>
    new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const firstKickoff = Math.min(...kickoffs);
  const title =
    dayLabel(firstKickoff) === dayLabel(lastKickoff)
      ? dayLabel(firstKickoff)
      : `${dayLabel(firstKickoff)} – ${dayLabel(lastKickoff)}`;

  function dismiss() {
    writeJson(DISMISSED_KEY, recapKey);
    setDismissedKey(recapKey);
  }

  const nameFor = (clubId: string | null, fallback: string) =>
    (clubId && getClub(clubId)?.shortName) || fallback;
  const crestFor = (clubId: string | null, fallback: string | null) =>
    (clubId && getClub(clubId)?.crest) || fallback || undefined;

  async function share() {
    setSharing(true);
    try {
      const blob = await createRecapShareImage(
        title,
        rows.map((r) => ({
          clubName: getClub(r.clubId)?.shortName ?? "",
          clubColor: getClub(r.clubId)?.primaryColor ?? "#3B82F6",
          homeName: nameFor(r.match.homeClubId, r.match.homeTeamName),
          awayName: nameFor(r.match.awayClubId, r.match.awayTeamName),
          homeScore: r.match.homeScore as number,
          awayScore: r.match.awayScore as number,
          homeCrest: crestFor(r.match.homeClubId, r.match.homeCrest),
          awayCrest: crestFor(r.match.awayClubId, r.match.awayCrest),
          result: r.result,
          tableLine: r.tableLine,
        })),
        round.kind === "weekend" ? "My weekend" : "My midweek"
      );
      if (blob) {
        await shareOrDownloadImage(
          blob,
          `clubside-my-${round.kind}.png`,
          `${round.kind === "weekend" ? "My weekend" : "My midweek"} - via Clubside`
        );
      }
    } finally {
      setSharing(false);
    }
  }

  const pill = { W: "bg-emerald-500", D: "bg-zinc-400", L: "bg-red-500" } as const;

  return (
    <section className="mb-6">
      <div className="relative overflow-hidden rounded-[30px] bg-[#0B0E16] p-4 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-[80px]" />
        <div className="relative z-10">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">{title}</div>
              <h2 className="mt-1 text-xl font-black tracking-tight">{heading}</h2>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Hide recap"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white/70"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const homeClub = r.match.homeClubId ? getClub(r.match.homeClubId) : undefined;
              const awayClub = r.match.awayClubId ? getClub(r.match.awayClubId) : undefined;
              return (
                <Link
                  key={r.match.id}
                  href={`/match/${r.match.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2.5"
                >
                  <ClubBadge
                    name={r.match.homeTeamName}
                    crest={crestFor(r.match.homeClubId, r.match.homeCrest)}
                    color={homeClub?.primaryColor ?? "#334155"}
                    size={28}
                  />
                  <span className="text-lg font-black tabular-nums">
                    {r.match.homeScore}–{r.match.awayScore}
                  </span>
                  <ClubBadge
                    name={r.match.awayTeamName}
                    crest={crestFor(r.match.awayClubId, r.match.awayCrest)}
                    color={awayClub?.primaryColor ?? "#334155"}
                    size={28}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black">
                      {nameFor(r.match.homeClubId, r.match.homeTeamName)} –{" "}
                      {nameFor(r.match.awayClubId, r.match.awayTeamName)}
                    </div>
                    {r.tableLine && <div className="text-xs font-semibold text-white/55">{r.tableLine}</div>}
                  </div>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${pill[r.result]}`}>
                    {r.result}
                  </span>
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            onClick={share}
            disabled={sharing}
            className="mt-3 w-full rounded-2xl bg-white py-3 text-xs font-black uppercase tracking-wide text-[#0B0E16] active:scale-[0.98] disabled:opacity-60"
          >
            {sharing ? "Preparing image…" : `Share my ${round.kind}`}
          </button>
        </div>
      </div>
    </section>
  );
}
