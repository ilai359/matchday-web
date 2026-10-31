import { NextResponse } from "next/server";
import { cdnCacheHeaders } from "@/lib/httpCache";
import { getMatches } from "@/lib/matchesData";
import { LEAGUE_TO_CODE, matchClubId } from "@/lib/footballApi";
import { clubs } from "@/data/clubs";

// Runs on Vercel's Edge Runtime - see the other API routes for why.
export const runtime = "edge";

// Data for the iPhone home-screen widget (ios/App/ClubsideWidget) and the
// app's offline screen: for each followed club, its live match (if one is
// on), its next match and its most recent result. Uses the exact same
// shared match lists as the Matches page, so it adds no extra requests to
// football-data.org - and the CDN shares one copy between everyone who
// follows the same clubs.

type SlimTeam = { name?: string; shortName?: string; tla?: string; crest?: string };
type SlimMatch = {
  id: number | string;
  utcDate: string;
  status: string;
  minute?: number;
  competition?: { name?: string; code?: string };
  homeTeam?: SlimTeam;
  awayTeam?: SlimTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
};

type WidgetTeam = { name: string; shortName?: string; crest?: string };
type WidgetMatch = {
  id: string;
  utcDate: string;
  status: string;
  minute?: number;
  competition: string;
  home: WidgetTeam;
  away: WidgetTeam;
  homeScore: number | null;
  awayScore: number | null;
};

const MAX_CLUBS = 6;

function teamFor(team: SlimTeam | undefined): WidgetTeam {
  const name = team?.name ?? "";
  const clubId = name ? matchClubId(name) : null;
  const club = clubId ? clubs.find((c) => c.id === clubId) : undefined;
  return {
    name: club?.name ?? name,
    shortName: club?.shortName ?? team?.shortName ?? team?.tla ?? undefined,
    crest: club?.crest ?? team?.crest ?? undefined,
  };
}

function toWidgetMatch(match: SlimMatch): WidgetMatch {
  return {
    id: String(match.id),
    utcDate: match.utcDate,
    status: match.status,
    ...(typeof match.minute === "number" ? { minute: match.minute } : {}),
    competition: match.competition?.name ?? "",
    home: teamFor(match.homeTeam),
    away: teamFor(match.awayTeam),
    homeScore: match.score?.fullTime?.home ?? null,
    awayScore: match.score?.fullTime?.away ?? null,
  };
}

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const requested = (searchParams.get("clubs") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const followed = Array.from(new Set(requested))
    .map((id) => clubs.find((c) => c.id === id))
    .filter((club): club is (typeof clubs)[number] => Boolean(club))
    .slice(0, MAX_CLUBS);

  if (followed.length === 0) {
    return NextResponse.json({ generatedAt: new Date().toISOString(), clubs: [] });
  }

  const codes = new Set<string>();
  for (const club of followed) {
    const code = LEAGUE_TO_CODE[club.league];
    if (code) codes.add(code);
  }
  if (codes.size > 0) codes.add("CL");

  const data = await getMatches(Array.from(codes), apiKey).catch(() => ({ matches: [] }));
  const all = ((data.matches ?? []) as SlimMatch[]).filter((m) => m && m.utcDate);

  // The same match can come from more than one list - keep the most
  // advanced copy of each (finished > live > scheduled).
  const rank = (status: string) =>
    status === "FINISHED" ? 2 : status === "IN_PLAY" || status === "PAUSED" ? 1 : 0;
  const byId = new Map<string, SlimMatch>();
  for (const match of all) {
    const key = String(match.id);
    const existing = byId.get(key);
    if (!existing || rank(match.status) > rank(existing.status)) byId.set(key, match);
  }
  const matches = Array.from(byId.values());
  const now = Date.now();

  const result = followed.map((club) => {
    const own = matches.filter(
      (m) =>
        (m.homeTeam?.name && matchClubId(m.homeTeam.name) === club.id) ||
        (m.awayTeam?.name && matchClubId(m.awayTeam.name) === club.id)
    );
    const byKickoff = (a: SlimMatch, b: SlimMatch) =>
      new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();

    const live = own.find((m) => m.status === "IN_PLAY" || m.status === "PAUSED");
    const next = own
      .filter(
        (m) =>
          (m.status === "SCHEDULED" || m.status === "TIMED") &&
          new Date(m.utcDate).getTime() > now - 15 * 60 * 1000
      )
      .sort(byKickoff)[0];
    const finished = own.filter((m) => m.status === "FINISHED").sort(byKickoff);
    const last = finished[finished.length - 1];

    return {
      id: club.id,
      name: club.name,
      shortName: club.shortName,
      color: club.primaryColor,
      ...(club.crest ? { crest: club.crest } : {}),
      live: live ? toWidgetMatch(live) : null,
      next: next ? toWidgetMatch(next) : null,
      last: last ? toWidgetMatch(last) : null,
    };
  });

  // Most relevant club first: the small widget and the lock screen only
  // show the first one, the medium widget the first two. A live match
  // comes first, then whichever club plays soonest - not simply the club
  // that was followed first.
  const kickoffOf = (club: (typeof result)[number]) =>
    club.next ? new Date(club.next.utcDate).getTime() : Number.MAX_SAFE_INTEGER;
  const sorted = result
    .map((club, index) => ({ club, index }))
    .sort((a, b) => {
      const liveA = a.club.live ? 0 : 1;
      const liveB = b.club.live ? 0 : 1;
      if (liveA !== liveB) return liveA - liveB;
      const byKickoff = kickoffOf(a.club) - kickoffOf(b.club);
      return byKickoff !== 0 ? byKickoff : a.index - b.index;
    })
    .map(({ club }) => club);

  return NextResponse.json(
    { generatedAt: new Date().toISOString(), clubs: sorted },
    { headers: cdnCacheHeaders(60) }
  );
}
