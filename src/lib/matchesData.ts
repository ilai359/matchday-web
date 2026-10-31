import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { slimMatchesResponse, slimMatch } from "@/lib/slimFootballData";

type SlimMatch = ReturnType<typeof slimMatch>;
import { getOrSet, setLiveCompetitions } from "@/lib/cache";
import { COMPETITIONS } from "@/lib/competitions";


// A match's real status only ever moves forward (scheduled -> live ->
// finished, never back), so when the same id shows up more than once
// across independently-cached status buckets, keeping whichever copy
// reports the more advanced status is always correct.
function statusRank(status: unknown): number {
  if (status === "FINISHED") return 2;
  if (status === "IN_PLAY" || status === "PAUSED") return 1;
  return 0;
}

// Marks a request that failed outright, so a real empty answer ("no
// matches today") can be told apart from "couldn't load anything".
const FAILED = Symbol("failed");

// If football-data.org ever refuses the all-leagues list (e.g. a plan
// change), stop asking for it for a while instead of wasting a request
// every minute - the per-league requests are used meanwhile.
let allLeaguesUnsupportedUntil = 0;

// The window of "recent" matches: yesterday, today and tomorrow. Asking
// football-data.org's all-leagues list for "yesterday to today" left
// today's own matches out, which is why matches being played right now
// (and ones that finished earlier today) vanished from the app once the
// live list started coming from this request. Ending the range at
// tomorrow always includes today.
function recentWindow(): { dateFrom: string; dateTo: string } {
  const now = Date.now();
  return {
    dateFrom: new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    dateTo: new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  };
}

/**
 * Every live, just-finished and today's upcoming match in all of our
 * leagues, from ONE football-data.org request shared by everyone (cached
 * for a minute). Used by the Matches page and by the notification check,
 * so both see the same matches at the same moment - two games kicking off
 * at once are noticed together.
 */
export async function getRecentAllMatches(apiKey: string): Promise<{ matches: SlimMatch[] }> {
  const { dateFrom, dateTo } = recentWindow();
  return getOrSet(`matches:all:window:${dateFrom}`, 60 * 1000, async () => {
    // Checked in here (not before getOrSet) so that even then, the last
    // saved copy of the list is still served. Throwing before getOrSet
    // made live matches vanish for everyone until a fresh copy came in.
    if (Date.now() < allLeaguesUnsupportedUntil) {
      throw new Error("All-leagues match list unavailable");
    }
    const response = await fetchWithRetry(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
    );
    if (!response.ok) {
      if (response.status === 400 || response.status === 403) {
        allLeaguesUnsupportedUntil = Date.now() + 10 * 60 * 1000;
      }
      throw new Error(`football-data.org returned ${response.status}`);
    }
    const all = slimMatchesResponse(await response.json());
    // Only our leagues (the plan also includes a few others).
    const slim = {
      matches: all.matches.filter((m) => COMPETITIONS.includes(String(m.competition.code))),
    };
    const liveCodes = new Set<string>();
    for (const match of slim.matches) {
      if ((match.status === "IN_PLAY" || match.status === "PAUSED") && match.competition.code) {
        liveCodes.add(match.competition.code);
      }
    }
    await setLiveCompetitions([...liveCodes]);
    return slim;
  });
}

function dedupeByMostAdvancedStatus(matches: unknown[]): unknown[] {
  const byId = new Map<string | number, { match: unknown; rank: number }>();
  for (const match of matches) {
    const id = (match as { id?: string | number } | null)?.id;
    if (id === undefined || id === null) continue;
    const rank = statusRank((match as { status?: unknown } | null)?.status);
    const existing = byId.get(id);
    if (!existing || rank >= existing.rank) {
      byId.set(id, { match, rank });
    }
  }
  return Array.from(byId.values(), (entry) => entry.match);
}

/**
 * Scheduled/live/recently-finished matches for a set of competitions,
 * deduplicated. Shared by /api/matches (real visitors) and
 * /api/club-bundle (the Club page's aggregated fetch) so both agree on
 * the same cache keys/TTLs/dedup logic.
 */
export async function getMatches(
  leagueCodes: string[],
  apiKey: string
): Promise<{ matches: unknown[] }> {
  const requestedCompetitions = leagueCodes.filter((code) =>
    COMPETITIONS.includes(code)
  );

  const recentAll =
    requestedCompetitions.length === 0
      ? FAILED
      : await getRecentAllMatches(apiKey).catch(() => FAILED);

  const recentForRequested =
    recentAll === FAILED
      ? null
      : {
          matches: ((recentAll as { matches?: unknown[] }).matches ?? []).filter((match) =>
            requestedCompetitions.includes(
              String((match as { competition?: { code?: string } }).competition?.code)
            )
          ),
        };

  const { dateFrom, dateTo } = recentWindow();

  const perLeague = (code: string, status: string, url: string, ttlMs: number) =>
    getOrSet(
      `matches:${code}:${status}`,
      ttlMs,
      async () => {
        const response = await fetchWithRetry(url, {
          headers: { "X-Auth-Token": apiKey },
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return slimMatchesResponse(await response.json());
      },
      // Upcoming fixtures barely change, so an older saved copy is fine
      // to show while a fresh one loads. Live scores aren't - those are
      // always fetched fresh.
      { serveStale: status === "SCHEDULED" }
    ).catch(() => FAILED);

  const requests: Promise<unknown>[] = requestedCompetitions.flatMap((code) => [
    // Upcoming fixtures: every 10 minutes - kickoff times barely change,
    // and a match that just started already shows up via the live list.
    perLeague(
      code,
      "SCHEDULED",
      `https://api.football-data.org/v4/competitions/${code}/matches?status=SCHEDULED`,
      10 * 60 * 1000
    ),
    ...(recentForRequested
      ? []
      : [
          perLeague(
            code,
            "LIVE",
            `https://api.football-data.org/v4/competitions/${code}/matches?status=LIVE`,
            60 * 1000
          ),
          perLeague(
            code,
            "FINISHED:recent",
            `https://api.football-data.org/v4/competitions/${code}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`,
            60 * 1000
          ),
        ]),
  ]);
  if (recentForRequested) requests.push(Promise.resolve(recentForRequested));

  const results = await Promise.all(requests);
  // If EVERY request failed (data source unreachable or rate-limited, and
  // no saved copy to fall back on), say so instead of answering "no
  // matches": the app then keeps showing the matches it already has on
  // the phone rather than replacing them with an empty screen.
  if (results.length > 0 && results.every((result) => result === FAILED)) {
    throw new Error("Couldn't load any match data right now");
  }
  const rawMatches = results.flatMap((result) =>
    result === FAILED ? [] : (result as { matches?: unknown[] }).matches ?? []
  );
  const allMatches = dedupeByMostAdvancedStatus(rawMatches);

  return { matches: allMatches };
}
