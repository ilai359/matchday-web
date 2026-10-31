"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClubs } from "../context/ClubsContext";
import { getClub } from "../lib/clubHelpers";
import {
  fetchFinishedMatches,
  fetchStandings,
  leaguesToCodes,
  FinishedMatch,
  StandingsRow,
} from "../lib/footballApi";
import { createRecapShareImage, shareOrDownloadImage } from "../lib/shareImage";
import ClubBadge from "./ClubBadge";
import { useNow } from "../lib/useNow";

// "Your matchday": the morning after your clubs have played, one card at
// the top of Home with each club's latest result and where that left
// them in the table. Weekend or midweek - it follows the matches, not
// the day of the week. Shown for 3 days, or until dismissed.

const DISMISSED_KEY = "clubside-recap-dismissed";
const POSITIONS_KEY = "clubside-positions";
const RECENT_MS = 4 * 24 * 60 * 60 * 1000;
const SHOW_FOR_MS = 3 * 24 * 60 * 60 * 1000;

type PositionLog = Record<string, Array<{ position: number; at: number }>>;

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

type Row = {
  clubId: string;
  match: FinishedMatch;
  result: "W" | "D" | "L";
  tableLine?: string;
};

export default function MatchdayRecap() {
  const { selectedIds, loaded } = useClubs();
  const [matches, setMatches] = useState<FinishedMatch[]>([]);
  const [tables, setTables] = useState<Record<string, StandingsRow[]>>({});
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

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
    Promise.all(codes.map((code) => fetchFinishedMatches(code, season).catch(() => [])))
      .then((lists) => {
        if (!cancelled) setMatches(lists.flat());
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
    const now = Date.now();
    for (const clubId of selectedIds) {
      const row = allRows.find((r) => r.clubId === clubId);
      if (!row) continue;
      const history = log[clubId] ?? [];
      const last = history[history.length - 1];
      if (!last || last.position !== row.position || now - last.at > 6 * 60 * 60 * 1000) {
        history.push({ position: row.position, at: now });
      }
      log[clubId] = history.slice(-12);
    }
    writeJson(POSITIONS_KEY, log);
  }, [tables, selectedIds]);

  const now = useNow(60_000);
  const rows: Row[] = [];
  const allTableRows = Object.values(tables).flat();
  const positionLog = typeof window === "undefined" ? {} : readJson<PositionLog>(POSITIONS_KEY, {});
  for (const clubId of selectedIds) {
    const latest = matches
      .filter(
        (m) =>
          (m.homeClubId === clubId || m.awayClubId === clubId) &&
          m.homeScore !== null &&
          m.awayScore !== null &&
          now - new Date(m.kickoff).getTime() < RECENT_MS
      )
      .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())[0];
    if (!latest) continue;
    const isHome = latest.homeClubId === clubId;
    const own = (isHome ? latest.homeScore : latest.awayScore) as number;
    const other = (isHome ? latest.awayScore : latest.homeScore) as number;
    const result = own > other ? "W" : own < other ? "L" : "D";

    let tableLine: string | undefined;
    const tableRow = allTableRows.find((r) => r.clubId === clubId);
    if (tableRow) {
      const kickoff = new Date(latest.kickoff).getTime();
      const before = (positionLog[clubId] ?? []).filter((p) => p.at < kickoff).pop();
      const moved = before ? before.position - tableRow.position : 0;
      tableLine =
        moved > 0
          ? `Now ${ordinal(tableRow.position)} · up ${moved}`
          : moved < 0
            ? `Now ${ordinal(tableRow.position)} · down ${-moved}`
            : `Now ${ordinal(tableRow.position)}`;
    }
    rows.push({ clubId, match: latest, result, tableLine });
  }

  if (rows.length === 0) return null;
  const lastKickoff = Math.max(...rows.map((r) => new Date(r.match.kickoff).getTime()));
  const showFrom = nextMorning(lastKickoff + 2 * 60 * 60 * 1000);
  if (now < showFrom || now > showFrom + SHOW_FOR_MS) return null;
  const recapKey = rows.map((r) => r.match.id).sort().join(",");
  if (dismissedKey === recapKey) return null;

  const firstDay = new Date(Math.min(...rows.map((r) => new Date(r.match.kickoff).getTime())));
  const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const title =
    dayLabel(firstDay) === dayLabel(new Date(lastKickoff))
      ? dayLabel(firstDay)
      : `${dayLabel(firstDay)} – ${dayLabel(new Date(lastKickoff))}`;

  function dismiss() {
    writeJson(DISMISSED_KEY, recapKey);
    setDismissedKey(recapKey);
  }

  async function share() {
    setSharing(true);
    try {
      const blob = await createRecapShareImage(
        title,
        rows.map((r) => {
          const club = getClub(r.clubId);
          return {
            clubName: club?.shortName ?? "",
            clubColor: club?.primaryColor ?? "#3B82F6",
            homeName: r.match.homeClubId ? getClub(r.match.homeClubId)?.shortName ?? r.match.homeTeamName : r.match.homeTeamName,
            awayName: r.match.awayClubId ? getClub(r.match.awayClubId)?.shortName ?? r.match.awayTeamName : r.match.awayTeamName,
            homeScore: r.match.homeScore as number,
            awayScore: r.match.awayScore as number,
            homeCrest: (r.match.homeClubId && getClub(r.match.homeClubId)?.crest) || r.match.homeCrest || undefined,
            awayCrest: (r.match.awayClubId && getClub(r.match.awayClubId)?.crest) || r.match.awayCrest || undefined,
            result: r.result,
            tableLine: r.tableLine,
          };
        })
      );
      if (blob) await shareOrDownloadImage(blob, "clubside-my-matchday.png", "My matchday - via Clubside");
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
              <h2 className="mt-1 text-xl font-black tracking-tight">Your matchday</h2>
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
                    crest={homeClub?.crest ?? r.match.homeCrest ?? undefined}
                    color={homeClub?.primaryColor ?? "#334155"}
                    size={28}
                  />
                  <span className="text-lg font-black tabular-nums">
                    {r.match.homeScore}–{r.match.awayScore}
                  </span>
                  <ClubBadge
                    name={r.match.awayTeamName}
                    crest={awayClub?.crest ?? r.match.awayCrest ?? undefined}
                    color={awayClub?.primaryColor ?? "#334155"}
                    size={28}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black">
                      {homeClub?.shortName ?? r.match.homeTeamName} – {awayClub?.shortName ?? r.match.awayTeamName}
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
            {sharing ? "Preparing image…" : "Share my matchday"}
          </button>
        </div>
      </div>
    </section>
  );
}
