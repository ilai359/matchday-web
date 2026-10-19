// football-data.org sends a lot with every match: the season, area,
// referees, odds, half-time scores, team short names, competition
// emblems and more - none of which this app ever shows. Match lists get
// saved in the cache (Upstash Redis) and read back again and again, and
// carrying all of that extra weight on every read is what used up the
// cache's free monthly bandwidth (10 GB) and took the whole app down.
// Every match list is trimmed to only what the app actually uses before
// it's cached - usually well under half the size.

type RawTeam = { id?: number; name?: string; crest?: string } | null | undefined;
type RawMatch = Record<string, unknown> & {
  id?: number;
  utcDate?: string;
  status?: string;
  minute?: number | null;
  venue?: string | null;
  competition?: { name?: string; code?: string } | null;
  homeTeam?: RawTeam;
  awayTeam?: RawTeam;
  score?: { fullTime?: { home: number | null; away: number | null } | null } | null;
};

function slimTeam(team: RawTeam) {
  return { id: team?.id, name: team?.name ?? "", crest: team?.crest };
}

/** One match, trimmed to the fields the app reads. */
export function slimMatch(match: RawMatch) {
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    ...(match.minute !== undefined && match.minute !== null ? { minute: match.minute } : {}),
    ...(match.venue ? { venue: match.venue } : {}),
    competition: { name: match.competition?.name ?? "", code: match.competition?.code },
    homeTeam: slimTeam(match.homeTeam),
    awayTeam: slimTeam(match.awayTeam),
    score: {
      fullTime: {
        home: match.score?.fullTime?.home ?? null,
        away: match.score?.fullTime?.away ?? null,
      },
    },
  };
}

/** A football-data.org match-list response ({ matches: [...] }), trimmed. */
export function slimMatchesResponse(data: unknown) {
  const matches = (data as { matches?: unknown } | null)?.matches;
  return {
    matches: Array.isArray(matches) ? matches.map((m) => slimMatch(m as RawMatch)) : [],
  };
}
