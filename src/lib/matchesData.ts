import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { slimMatchesResponse } from "@/lib/slimFootballData";
import { getOrSet } from "@/lib/cache";
import { COMPETITIONS } from "@/lib/competitions";

// football-data.org's docs only ever show a single status value in their
// examples, so combining values in one request isn't confirmed to work -
// each status is asked for separately and merged. LIVE is their
// pseudo-status covering both IN_PLAY and PAUSED.
const STATUSES = ["SCHEDULED", "LIVE"];

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

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dateFrom = yesterday.toISOString().slice(0, 10);
  const dateTo = today.toISOString().slice(0, 10);

  const requests = requestedCompetitions.flatMap((code) => [
    ...STATUSES.map((status) =>
      // LIVE refreshes every minute (scores change). SCHEDULED - the list
      // of upcoming fixtures - every 10: kickoff times barely change, and
      // a match that just started already shows up via LIVE (the
      // dedupe below keeps the more advanced copy). Re-fetching every
      // league's whole fixture list every minute was a big share of the
      // 10-requests-a-minute data limit, and running out of it is what
      // makes pages slow or fail to load.
      getOrSet(`matches:${code}:${status}`, status === "LIVE" ? 60 * 1000 : 10 * 60 * 1000, async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${code}/matches?status=${status}`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return slimMatchesResponse(await response.json());
      }).catch(() => FAILED)
    ),
    getOrSet(
      `matches:${code}:FINISHED:recent`,
      60 * 1000,
      async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${code}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return slimMatchesResponse(await response.json());
      }
    ).catch(() => FAILED),
  ]);

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
