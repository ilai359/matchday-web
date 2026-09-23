import { clubs } from "../data/clubs";
import { STADIUMS } from "../data/stadiums";
export type LiveMatch = {
  id: string;
  competition: string;
  homeClubId: string;
  awayClubId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoff: string;
  venue: string;
  city: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
};
const CLUB_ALIASES: Record<string, string[]> = {
  arsenal: ["arsenal fc", "arsenal"],
  "real-madrid": ["real madrid cf", "real madrid"],
  barcelona: ["fc barcelona", "barcelona"],
  "fc-zurich": ["fc zürich", "fc zurich"],
  "fc-basel": ["fc basel 1893", "fc basel"],
  "bayern-munich": ["fc bayern münchen", "fc bayern munich", "bayern munich"],
  liverpool: ["liverpool fc", "liverpool"],
  "manchester-city": ["manchester city fc", "manchester city"],
  "paris-saint-germain": ["paris saint-germain fc", "paris saint-germain", "psg"],
  juventus: ["juventus fc", "juventus"],
  "borussia-dortmund": ["borussia dortmund"],
  "young-boys": ["bsc young boys", "young boys"],
  ajax: ["afc ajax", "ajax"],
  psv: ["psv", "psv eindhoven"],
  porto: ["fc porto", "porto"],
  benfica: ["sl benfica", "benfica", "sport lisboa e benfica"],
  "sporting-cp": ["sporting clube de portugal", "sporting cp"],
  "aston-villa": ["aston villa fc", "aston villa"],
  chelsea: ["chelsea fc", "chelsea"],
  everton: ["everton fc", "everton"],
  fulham: ["fulham fc", "fulham"],
  "manchester-united": ["manchester united fc", "manchester united", "man united"],
  "newcastle-united": ["newcastle united fc", "newcastle united", "newcastle"],
  sunderland: ["sunderland afc", "sunderland"],
  tottenham: ["tottenham hotspur fc", "tottenham hotspur", "tottenham", "spurs"],
  "hull-city": ["hull city afc", "hull city"],
  "leeds-united": ["leeds united fc", "leeds united"],
  "ipswich-town": ["ipswich town fc", "ipswich town"],
  "nottingham-forest": ["nottingham forest fc", "nottingham forest"],
  "crystal-palace": ["crystal palace fc", "crystal palace"],
  brighton: ["brighton & hove albion fc", "brighton & hove albion", "brighton"],
  brentford: ["brentford fc", "brentford"],
  bournemouth: ["afc bournemouth", "bournemouth"],
  "coventry-city": ["coventry city fc", "coventry city"],
  "athletic-bilbao": ["athletic club", "athletic bilbao", "athletic"],
  "atletico-madrid": ["club atlético de madrid", "atletico madrid", "atlético madrid", "atleti"],
  osasuna: ["ca osasuna", "osasuna"],
  espanyol: ["rcd espanyol de barcelona", "espanyol"],
  getafe: ["getafe cf", "getafe"],
  malaga: ["málaga cf", "malaga", "málaga"],
  "rayo-vallecano": ["rayo vallecano de madrid", "rayo vallecano"],
  levante: ["levante ud", "levante"],
  "real-betis": ["real betis balompié", "real betis"],
  "real-sociedad": ["real sociedad de fútbol", "real sociedad"],
  villarreal: ["villarreal cf", "villarreal"],
  valencia: ["valencia cf", "valencia"],
  alaves: ["deportivo alavés", "deportivo alaves", "alavés", "alaves"],
  elche: ["elche cf", "elche"],
  "celta-vigo": ["rc celta de vigo", "celta vigo", "celta"],
  sevilla: ["sevilla fc", "sevilla"],
  "deportivo-la-coruna": ["rc deportivo la coruña", "deportivo la coruna", "deportivo la coruña", "deportivo"],
  "racing-santander": ["real racing club de santander", "racing santander"],
  "fc-koln": ["1. fc köln", "1. fc koln", "fc köln", "fc koln"],
  hoffenheim: ["tsg 1899 hoffenheim", "tsg hoffenheim", "hoffenheim"],
  "bayer-leverkusen": ["bayer 04 leverkusen", "bayer leverkusen", "leverkusen"],
  "schalke-04": ["fc schalke 04", "schalke 04", "schalke"],
  "hamburger-sv": ["hamburger sv", "hsv"],
  "vfb-stuttgart": ["vfb stuttgart", "stuttgart"],
  "werder-bremen": ["sv werder bremen", "werder bremen", "bremen"],
  "mainz-05": ["1. fsv mainz 05", "mainz 05", "mainz"],
  "fc-augsburg": ["fc augsburg", "augsburg"],
  "sc-freiburg": ["sc freiburg", "freiburg"],
  "borussia-monchengladbach": ["borussia mönchengladbach", "borussia monchengladbach", "m'gladbach", "mgladbach"],
  "eintracht-frankfurt": ["eintracht frankfurt", "frankfurt"],
  "union-berlin": ["1. fc union berlin", "union berlin"],
  "sc-paderborn": ["sc paderborn 07", "sc paderborn", "paderborn"],
  "sv-elversberg": ["sv 07 elversberg", "sv elversberg", "elversberg"],
  "rb-leipzig": ["rb leipzig"],
  toulouse: ["toulouse fc", "toulouse"],
  brest: ["stade brestois 29", "stade brestois", "brest"],
  marseille: ["olympique de marseille", "marseille"],
  auxerre: ["aj auxerre", "auxerre"],
  lille: ["lille osc", "lille"],
  nice: ["ogc nice", "nice"],
  lyon: ["olympique lyonnais", "lyon"],
  lorient: ["fc lorient", "lorient"],
  rennes: ["stade rennais fc 1901", "stade rennais", "rennes"],
  troyes: ["es troyes ac", "troyes"],
  angers: ["angers sco", "angers"],
  "le-havre": ["le havre ac", "le havre"],
  "le-mans": ["le mans fc", "le mans"],
  "rc-lens": ["racing club de lens", "rc lens", "lens"],
  monaco: ["as monaco fc", "as monaco", "monaco"],
  strasbourg: ["rc strasbourg alsace", "rc strasbourg", "strasbourg"],
  "paris-fc": ["paris fc"],
  "ac-milan": ["ac milan", "milan"],
  fiorentina: ["acf fiorentina", "fiorentina"],
  "as-roma": ["as roma", "roma"],
  atalanta: ["atalanta bc", "atalanta"],
  bologna: ["bologna fc 1909", "bologna"],
  cagliari: ["cagliari calcio", "cagliari"],
  genoa: ["genoa cfc", "genoa"],
  "inter-milan": ["fc internazionale milano", "inter milan", "inter"],
  lazio: ["ss lazio", "lazio"],
  parma: ["parma calcio 1913", "parma"],
  napoli: ["ssc napoli", "napoli"],
  udinese: ["udinese calcio", "udinese"],
  venezia: ["venezia fc", "venezia"],
  frosinone: ["frosinone calcio", "frosinone"],
  sassuolo: ["us sassuolo calcio", "sassuolo"],
  torino: ["torino fc", "torino"],
  lecce: ["us lecce", "lecce"],
  monza: ["ac monza", "monza"],
  como: ["como 1907", "como"],
  "fc-twente": ["fc twente '65", "fc twente", "twente"],
  excelsior: ["sbv excelsior", "excelsior"],
  "willem-ii": ["willem ii tilburg", "willem ii"],
  heerenveen: ["sc heerenveen", "heerenveen"],
  feyenoord: ["feyenoord rotterdam", "feyenoord"],
  "fc-utrecht": ["fc utrecht", "utrecht"],
  "fc-groningen": ["fc groningen", "groningen"],
  "ado-den-haag": ["ado den haag", "den haag"],
  "az-alkmaar": ["az", "az alkmaar"],
  "pec-zwolle": ["pec zwolle", "zwolle"],
  "go-ahead-eagles": ["go ahead eagles", "go ahead"],
  cambuur: ["sc cambuur-leeuwarden", "sc cambuur", "cambuur"],
  telstar: ["telstar 1963", "telstar"],
  "nec-nijmegen": ["nec", "nec nijmegen"],
  "fortuna-sittard": ["fortuna sittard", "sittard"],
  "sparta-rotterdam": ["sparta rotterdam", "sparta"],
  "rio-ave": ["rio ave fc", "rio ave"],
  "estoril-praia": ["gd estoril praia", "estoril praia"],
  moreirense: ["moreirense fc", "moreirense"],
  arouca: ["fc arouca", "arouca"],
  "academico-viseu": ["académico de viseu fc", "academico de viseu", "académico de viseu"],
  nacional: ["cd nacional", "nacional"],
  "santa-clara": ["cd santa clara", "santa clara"],
  famalicao: ["fc famalicão", "famalicao", "famalicão"],
  "gil-vicente": ["gil vicente fc", "gil vicente"],
  "vitoria-sc": ["vitória sc", "vitoria sc"],
  maritimo: ["cs marítimo", "cs maritimo", "marítimo", "maritimo"],
  braga: ["sporting clube de braga", "braga"],
  "casa-pia": ["casa pia ac", "casa pia"],
  alverca: ["fc alverca", "alverca"],
  "estrela-amadora": ["cf estrela da amadora", "estrela da amadora", "amadora"],
};
export function matchClubId(apiTeamName: string): string | null {
  const normalized = apiTeamName.toLowerCase().trim();
  for (const club of clubs) {
    const aliases = CLUB_ALIASES[club.id] ?? [club.name.toLowerCase()];
    if (aliases.includes(normalized)) {
      return club.id;
    }
  }
  return null;
}

// Pulls the numeric football-data.org team ID out of one of our own crest
// URLs (e.g. "https://crests.football-data.org/341.png" -> "341"). A club
// without a crest, or with a non-numeric placeholder crest, returns null.
export function extractTeamId(crestUrl?: string): string | null {
  if (!crestUrl) return null;
  const match = crestUrl.match(/\/(\d+)\.png(?:\?.*)?$/);
  return match ? match[1] : null;
}

export type TeamInfo = { venue?: string };

// Only meant as a last-resort lookup for a club outside our own 132-club
// list (e.g. an opponent in a European competition), when neither this
// match's own data nor our hand-checked stadiums.ts had a venue for them.
// Deliberately venue-only, no city: football-data.org doesn't give us a
// clean city field for a club we don't otherwise track, only a free-text
// address, and guessing turned out unreliable enough that showing nothing
// is better than risking a wrong one. Returns null on any failure -
// callers should just fall back to showing nothing, the same as before
// this existed.
export async function fetchTeamInfo(teamId: string): Promise<TeamInfo | null> {
  try {
    const response = await fetch(`/api/team-info?id=${teamId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return { venue: data.venue ?? undefined };
  } catch {
    return null;
  }
}

// Same last-resort venue lookup as fetchTeamInfo, but for a whole list of
// matches at once (the home page and Matches page show several matches,
// not just one) - only ever looks up a club once even if it appears as
// the home side in several of the given matches, and skips any match that
// already has a venue from somewhere else. Returns a map from that club's
// football-data.org team ID (see extractTeamId) to their real stadium
// name, so a caller can look up `venueFallback[extractTeamId(match.homeCrest)]`
// for whichever matches came back without one.
export async function fetchVenueFallbacks(
  matchesNeedingLookup: { homeCrest?: string | null; venue?: string }[]
): Promise<Record<string, string>> {
  const teamIds = new Set<string>();
  for (const m of matchesNeedingLookup) {
    if (m.venue) continue;
    const teamId = extractTeamId(m.homeCrest ?? undefined);
    if (teamId) teamIds.add(teamId);
  }
  if (teamIds.size === 0) return {};
  const entries = await Promise.all(
    Array.from(teamIds).map(async (teamId) => {
      const info = await fetchTeamInfo(teamId);
      return [teamId, info?.venue] as const;
    })
  );
  const result: Record<string, string> = {};
  for (const [teamId, venue] of entries) {
    if (venue) result[teamId] = venue;
  }
  return result;
}

type RawApiMatch = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  venue?: string;
  competition: { name: string };
  homeTeam: { name: string; crest?: string };
  awayTeam: { name: string; crest?: string };
  score?: {
    fullTime?: { home: number | null; away: number | null };
  };
};

function mapRawMatch(match: RawApiMatch): LiveMatch {
  const homeClubId = matchClubId(match.homeTeam.name);
  const awayClubId = matchClubId(match.awayTeam.name);
  // football-data.org (our main provider) frequently leaves "venue" blank
  // for matches that haven't kicked off yet, especially further out from
  // kickoff. Rather than show nothing, fall back to the home club's own
  // real stadium - a match is always played at the home team's ground, so
  // this is never a guess, just a more reliable source for the same fact.
  const homeStadium = homeClubId ? STADIUMS[homeClubId] : undefined;
  const venue =
    match.venue && match.venue.trim().length > 0
      ? match.venue
      : homeStadium?.name ?? "";
  return {
    id: String(match.id),
    competition: match.competition.name,
    homeClubId: homeClubId ?? match.homeTeam.name,
    awayClubId: awayClubId ?? match.awayTeam.name,
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    homeCrest: match.homeTeam.crest ?? null,
    awayCrest: match.awayTeam.crest ?? null,
    kickoff: match.utcDate,
    venue,
    city: homeStadium?.city ?? "",
    status: match.status,
    homeScore: match.score?.fullTime?.home ?? null,
    awayScore: match.score?.fullTime?.away ?? null,
    minute: match.minute ?? null,
  };
}

// Fetches JSON from one of our own API routes, retrying a couple of times
// on failure (a transient network blip, or an occasional rate-limit from
// football-data.org) before giving up - so a single hiccup doesn't leave
// the page silently stuck on empty data until someone manually refreshes.
async function fetchJsonWithRetry<T = unknown>(
  url: string,
  attempts = 3,
  delayMs = 700
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return (await response.json()) as T;
      }
      lastError = new Error(`Request to ${url} failed with status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

// Matches worth showing on the Matches page: not yet started (TIMED /
// SCHEDULED), or currently being played (IN_PLAY / PAUSED at half-time).
// Finished matches are deliberately left out here - this list is about
// what's coming up or happening right now, not match history.
const VISIBLE_STATUSES = new Set(["TIMED", "SCHEDULED", "IN_PLAY", "PAUSED"]);

// A single match by its own id, regardless of status - unlike
// fetchLiveMatches (which deliberately only returns what's upcoming or
// live right now), this works for a match that's already finished too.
// Reuses /api/match-live, the same route the live-score poller already
// calls: it's just football-data.org's own "one match by id" lookup,
// which was never restricted to live matches in the first place - only
// the client-side polling helper (fetchLiveMatchStatus) that also calls
// it only ever looked at the score/status fields it returned. Returns
// null if the id isn't a real football-data.org match (e.g. a Europa/
// Conference League match, which uses API-Football's own ids instead).
export async function fetchMatchById(matchId: string): Promise<LiveMatch | null> {
  try {
    const response = await fetch(`/api/match-live?id=${matchId}`);
    if (!response.ok) return null;
    const data: RawApiMatch = await response.json();
    return mapRawMatch(data);
  } catch {
    return null;
  }
}

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  const response = await fetch("/api/matches");
  if (!response.ok) {
    throw new Error("Failed to fetch live matches");
  }
  const data = await response.json();
  const rawMatches: RawApiMatch[] = data.matches ?? [];
  return rawMatches
    .map(mapRawMatch)
    .filter((match) => VISIBLE_STATUSES.has(match.status));
}

// Every upcoming or in-progress match for one club, across every
// competition our football-data.org plan gives us access to (not just
// their main league) - so cup runs and continental competitions show up
// too, whenever the plan covers them.
export async function fetchTeamMatches(teamId: string): Promise<LiveMatch[]> {
  const response = await fetch(`/api/team-matches?id=${teamId}`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  const rawMatches: RawApiMatch[] = data.matches ?? [];
  return rawMatches
    .map(mapRawMatch)
    .filter((match) => VISIBLE_STATUSES.has(match.status));
}

// --- League table & top scorers/assists ---

export const LEAGUE_TO_CODE: Record<string, string> = {
  "Premier League": "PL",
  "La Liga": "PD",
  "Primera Division": "PD",
  Bundesliga: "BL1",
  "Ligue 1": "FL1",
  "Serie A": "SA",
  Eredivisie: "DED",
  "Primeira Liga": "PPL",
  "UEFA Champions League": "CL",
};

export type StandingsRow = {
  position: number;
  teamName: string;
  clubId: string | null;
  crest?: string;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalDifference: number;
};

type RawStandingsResponse = {
  standings?: {
    type: string;
    table: {
      position: number;
      team: { name: string; crest?: string };
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalDifference: number;
    }[];
  }[];
};

export async function fetchStandings(
  competitionCode: string
): Promise<StandingsRow[]> {
  const response = await fetch(`/api/standings?competition=${competitionCode}`);
  if (!response.ok) {
    throw new Error("Failed to fetch standings");
  }
  const data: RawStandingsResponse = await response.json();
  const totalTable =
    data.standings?.find((s) => s.type === "TOTAL")?.table ?? [];
  return totalTable.map((row) => {
    const clubId = matchClubId(row.team.name);
    // Prefer our own crest for a club we track (consistent branding,
    // already used everywhere else in the app) and only fall back to
    // whatever football-data.org sent for a club we don't track - same
    // convention as crestFor() on the match detail page.
    const ownCrest = clubId ? clubs.find((c) => c.id === clubId)?.crest : undefined;
    return {
      position: row.position,
      teamName: row.team.name,
      clubId,
      crest: ownCrest ?? row.team.crest ?? undefined,
      playedGames: row.playedGames,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      points: row.points,
      goalDifference: row.goalDifference,
    };
  });
}

// The API groups tied teams under the same position number. Within each
// tied group, move the given club's row to the front, then renumber
// everything sequentially so no two teams ever show the same position.
// Shared by anything that needs a specific club's actual league position
// (the Your Clubs cards, the Settings stats) so they always agree.
export function applyClubTieBreak(
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

export type Scorer = {
  playerName: string;
  teamName: string;
  clubId: string | null;
  goals: number;
  assists: number | null;
};

type RawScorersResponse = {
  scorers?: {
    player: { name: string };
    team: { name: string };
    goals: number;
    assists: number | null;
  }[];
};

export async function fetchScorers(competitionCode: string): Promise<Scorer[]> {
  const response = await fetch(`/api/scorers?competition=${competitionCode}`);
  if (!response.ok) {
    throw new Error("Failed to fetch scorers");
  }
  const data: RawScorersResponse = await response.json();
  const rawScorers = data.scorers ?? [];
  return rawScorers.map((s) => ({
    playerName: s.player.name,
    teamName: s.team.name,
    clubId: matchClubId(s.team.name),
    goals: s.goals,
    assists: s.assists ?? null,
  }));
}

// --- Finished matches (head-to-head history & recent form) ---

export type FinishedMatch = {
  id: string;
  competition: string;
  homeClubId: string | null;
  awayClubId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string;
};

type RawFinishedMatch = {
  id: number;
  utcDate: string;
  competition: { name: string };
  homeTeam: { name: string; crest?: string };
  awayTeam: { name: string; crest?: string };
  score?: {
    fullTime?: { home: number | null; away: number | null };
  };
};

export async function fetchFinishedMatches(
  competitionCode: string,
  season?: string
): Promise<FinishedMatch[]> {
  const seasonParam = season ? `&season=${season}` : "";
  const data = await fetchJsonWithRetry<{ matches?: RawFinishedMatch[] }>(
    `/api/finished-matches?competition=${competitionCode}${seasonParam}`
  );
  const rawMatches: RawFinishedMatch[] = data.matches ?? [];
  return rawMatches.map((match) => ({
    id: String(match.id),
    competition: match.competition.name,
    // Same fallback as mapRawMatch above: if this team isn't one of our
    // 132 tracked clubs, use their name itself as a stand-in ID rather than
    // null. Without this, a tracked club's own "recent form" pills would
    // wrongly come up empty for every match they played against a club we
    // don't track (e.g. a Champions League game vs. Galatasaray), because
    // this list of past matches couldn't be matched back to the club at all.
    homeClubId: matchClubId(match.homeTeam.name) ?? match.homeTeam.name,
    awayClubId: matchClubId(match.awayTeam.name) ?? match.awayTeam.name,
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    homeCrest: match.homeTeam.crest ?? null,
    awayCrest: match.awayTeam.crest ?? null,
    homeScore: match.score?.fullTime?.home ?? null,
    awayScore: match.score?.fullTime?.away ?? null,
    kickoff: match.utcDate,
  }));
}

// --- Live match polling (for the match detail page) ---

export type LiveMatchStatus = {
  status: string;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
};

type RawSingleMatch = {
  status: string;
  minute?: number | null;
  score?: {
    fullTime?: { home: number | null; away: number | null };
  };
};

export async function fetchLiveMatchStatus(
  matchId: string
): Promise<LiveMatchStatus | null> {
  const response = await fetch(`/api/match-live?id=${matchId}`);
  if (!response.ok) {
    return null;
  }
  const data: RawSingleMatch = await response.json();
  return {
    status: data.status,
    minute: data.minute ?? null,
    homeScore: data.score?.fullTime?.home ?? null,
    awayScore: data.score?.fullTime?.away ?? null,
  };
}

