// Server-only helper for calling API-Football (api-sports.io). Used only
// for UEFA Europa League and UEFA Europa Conference League - the two
// competitions football-data.org (our main data source, everywhere else
// in this app) doesn't offer at all, on any plan.
//
// API-Football's free plan is a much smaller daily quota (100 requests a
// day, total, shared across every visitor and every competition) than
// football-data.org's. To live within that, every call here leans hard
// on Next.js's fetch cache (`next: { revalidate }`) so many visitors -
// and both the "upcoming fixtures" and "finished matches" features -
// share one upstream call instead of each paying for their own. A
// finished season's results never change, so those are cached far
// longer than the current, still-in-progress season.

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

export type EuroCompetitionCode = "EL" | "ECL";

export const EURO_COMPETITION_NAMES: Record<EuroCompetitionCode, string> = {
  EL: "UEFA Europa League",
  ECL: "UEFA Europa Conference League",
};

// European club seasons run roughly July-June, same convention API-Football
// itself uses for its "season" parameter (the year the season started).
export function getCurrentSeasonYear(date: Date = new Date()): number {
  const month = date.getMonth(); // 0 = January, 6 = July
  const year = date.getFullYear();
  return month >= 6 ? year : year - 1;
}

// League ids on API-Football virtually never change, so one lookup
// settles it for a long time.
const LEAGUE_ID_CACHE_SECONDS = 7 * 24 * 60 * 60;
// The current season's fixtures still change (new results, rescheduled
// dates), but they don't change often - a couple of checks a day is
// plenty, and keeps us far under the daily request quota. Deliberately
// not a full day: a match's real status can change (kicked off,
// finished) well before a once-a-day check would notice, and showing an
// already-finished match as still "upcoming" is worse than spending a
// couple of extra requests.
const CURRENT_SEASON_CACHE_SECONDS = 12 * 60 * 60;
// A season that has already ended is done changing - safe to cache for
// a long time.
const PAST_SEASON_CACHE_SECONDS = 30 * 24 * 60 * 60;

type ApiFootballLeagueEntry = {
  league?: { id?: number; name?: string };
};

async function searchLeagues(
  apiKey: string,
  searchTerm: string
): Promise<ApiFootballLeagueEntry[]> {
  try {
    const response = await fetch(
      `${API_FOOTBALL_BASE}/leagues?search=${encodeURIComponent(searchTerm)}`,
      {
        headers: { "x-apisports-key": apiKey },
        next: { revalidate: LEAGUE_ID_CACHE_SECONDS },
      }
    );
    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[apiFootball] /leagues?search=${searchTerm} returned ${response.status}:`,
        body.slice(0, 500)
      );
      return [];
    }
    const data = await response.json();
    if (Array.isArray(data.errors) ? data.errors.length > 0 : data.errors) {
      // API-Football can return HTTP 200 even when something's wrong (bad
      // key, quota exceeded, an account that isn't fully activated yet) -
      // the real problem shows up in this field, not the status code.
      console.error(
        `[apiFootball] /leagues?search=${searchTerm} reported errors:`,
        data.errors
      );
    }
    return data.response ?? [];
  } catch (error) {
    console.error(`[apiFootball] /leagues?search=${searchTerm} threw:`, error);
    return [];
  }
}

// Matched loosely (by substring, not an exact string) since we don't know
// in advance exactly how API-Football spells each name (with or without
// a "UEFA" prefix, for instance). Europa League specifically has to
// exclude anything that also mentions "conference" - the Conference
// League's full name ("UEFA Europa Conference League") contains "Europa
// League" as a substring too, so a plain substring match on its own would
// wrongly match both competitions to the same entry.
export async function resolveLeagueId(
  apiKey: string,
  code: EuroCompetitionCode
): Promise<number | null> {
  const entries = await searchLeagues(
    apiKey,
    code === "EL" ? "Europa League" : "Conference League"
  );
  const match = entries.find((entry) => {
    const name = entry.league?.name?.toLowerCase() ?? "";
    if (code === "EL") {
      return name.includes("europa league") && !name.includes("conference");
    }
    return name.includes("conference league");
  });
  if (!match) {
    console.error(
      `[apiFootball] Couldn't find a league named like "${code}" among`,
      entries.length,
      "results. Names seen:",
      entries.map((e) => e.league?.name)
    );
  }
  return match?.league?.id ?? null;
}

// API-Football's own short status codes, mapped onto the status
// vocabulary the rest of this app already understands (the same one
// football-data.org uses) - so fixtures from either source look
// identical by the time they reach the UI.
const STATUS_MAP: Record<string, string> = {
  NS: "SCHEDULED",
  TBD: "SCHEDULED",
  "1H": "IN_PLAY",
  "2H": "IN_PLAY",
  ET: "IN_PLAY",
  P: "IN_PLAY",
  LIVE: "IN_PLAY",
  BT: "PAUSED",
  HT: "PAUSED",
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  AWD: "FINISHED",
  WO: "FINISHED",
};

// Postponed/cancelled/abandoned/interrupted fixtures aren't a real
// upcoming match or a real result - leave them out entirely rather than
// forcing them into either bucket.
const IGNORED_STATUSES = new Set(["PST", "CANC", "ABD", "SUSP", "INT"]);

type ApiFootballFixture = {
  fixture?: {
    id?: number;
    date?: string;
    status?: { short?: string };
    venue?: { name?: string | null } | null;
  };
  teams?: {
    home?: { name?: string; logo?: string };
    away?: { name?: string; logo?: string };
  };
  goals?: { home?: number | null; away?: number | null };
};

// The shape our own /api/matches and /api/finished-matches routes already
// return to the client (mirroring football-data.org's own match shape) -
// so the existing client code (mapRawMatch, fetchFinishedMatches) can
// handle these fixtures without any changes at all.
export type NormalizedMatch = {
  id: number;
  utcDate: string;
  status: string;
  venue: string;
  competition: { name: string };
  homeTeam: { name: string; crest?: string };
  awayTeam: { name: string; crest?: string };
  score: { fullTime: { home: number | null; away: number | null } };
};

function normalizeFixture(
  fixture: ApiFootballFixture,
  competitionName: string
): NormalizedMatch | null {
  const id = fixture.fixture?.id;
  const date = fixture.fixture?.date;
  const shortStatus = fixture.fixture?.status?.short;
  const homeName = fixture.teams?.home?.name;
  const awayName = fixture.teams?.away?.name;
  if (!id || !date || !shortStatus || !homeName || !awayName) return null;
  if (IGNORED_STATUSES.has(shortStatus)) return null;

  const status = STATUS_MAP[shortStatus];
  if (!status) return null;

  return {
    id,
    utcDate: date,
    status,
    venue: fixture.fixture?.venue?.name ?? "",
    competition: { name: competitionName },
    homeTeam: { name: homeName, crest: fixture.teams?.home?.logo },
    awayTeam: { name: awayName, crest: fixture.teams?.away?.logo },
    score: {
      fullTime: {
        home: fixture.goals?.home ?? null,
        away: fixture.goals?.away ?? null,
      },
    },
  };
}

// Fetches every fixture (any status) for one league/season combination.
// Deliberately not filtered by status server-side - a single cached call
// serves both the "what's upcoming" and "what already happened" views,
// which halves our request count versus fetching them separately.
async function fetchSeasonFixtures(
  apiKey: string,
  leagueId: number,
  season: string,
  competitionName: string,
  isCurrentSeason: boolean
): Promise<NormalizedMatch[]> {
  try {
    const response = await fetch(
      `${API_FOOTBALL_BASE}/fixtures?league=${leagueId}&season=${season}`,
      {
        headers: { "x-apisports-key": apiKey },
        next: {
          revalidate: isCurrentSeason
            ? CURRENT_SEASON_CACHE_SECONDS
            : PAST_SEASON_CACHE_SECONDS,
        },
      }
    );
    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[apiFootball] /fixtures?league=${leagueId}&season=${season} returned ${response.status}:`,
        body.slice(0, 500)
      );
      return [];
    }
    const data = await response.json();
    if (Array.isArray(data.errors) ? data.errors.length > 0 : data.errors) {
      // API-Football returns HTTP 200 even for some errors (bad key,
      // quota exceeded, unconfirmed account) - the actual problem is
      // buried in this field instead of the status code.
      console.error(
        `[apiFootball] /fixtures?league=${leagueId}&season=${season} reported errors:`,
        data.errors
      );
    }
    const raw: ApiFootballFixture[] = data.response ?? [];
    console.error(
      `[apiFootball] league ${leagueId}, season ${season}: got ${raw.length} raw fixtures from API-Football`
    );
    return raw
      .map((fixture) => normalizeFixture(fixture, competitionName))
      .filter((match): match is NormalizedMatch => match !== null);
  } catch (error) {
    console.error(
      `[apiFootball] /fixtures?league=${leagueId}&season=${season} threw:`,
      error
    );
    return [];
  }
}

export async function fetchUpcomingFixtures(
  apiKey: string,
  leagueId: number,
  competitionName: string
): Promise<NormalizedMatch[]> {
  const season = String(getCurrentSeasonYear());
  const all = await fetchSeasonFixtures(apiKey, leagueId, season, competitionName, true);
  return all.filter(
    (match) =>
      match.status === "SCHEDULED" ||
      match.status === "IN_PLAY" ||
      match.status === "PAUSED"
  );
}

export async function fetchFinishedFixtures(
  apiKey: string,
  leagueId: number,
  season: string,
  competitionName: string
): Promise<NormalizedMatch[]> {
  const isCurrentSeason = Number(season) === getCurrentSeasonYear();
  const all = await fetchSeasonFixtures(
    apiKey,
    leagueId,
    season,
    competitionName,
    isCurrentSeason
  );
  return all.filter((match) => match.status === "FINISHED");
}
