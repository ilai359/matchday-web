import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet, isCompetitionLive, getStaleOnly } from "@/lib/cache";

/**
 * Cached league table for a competition, shared by /api/standings (real
 * visitors) and /api/club-bundle (the Club page's aggregated fetch) so
 * both always agree on the same cache key/TTL/freeze logic - see the
 * comments inline for what each piece does.
 */
export async function getStandings(competition: string, apiKey: string) {
  // Hold the table still while a match in this competition is in
  // progress, and only let it move once nothing's live anymore - so
  // position/points never shift mid-match, only once a result is
  // actually final. Cheap to check: it reuses the matches data the app
  // is already keeping fresh, no extra request to football-data.org.
  if (await isCompetitionLive(competition)) {
    const held = await getStaleOnly(`standings:${competition}`);
    if (held !== null) {
      return held;
    }
    // No earlier snapshot to hold onto yet (e.g. first ever request for
    // this competition happens to land mid-match) - fall through and
    // fetch once rather than show nothing.
  }

  // Using the shared Redis cache (getOrSet) instead of Next's own fetch
  // cache - it serves the last known-good table instead of showing
  // nothing if a live request lands during football-data.org's shared
  // rate limit, and never caches the failure itself.
  // 5 minutes: a table only moves when a match ends, and re-asking every
  // minute for every league was a big slice of the shared 10-a-minute
  // football-data.org allowance.
  return getOrSet(`standings:${competition}`, 5 * 60 * 1000, async () => {
    const response = await fetchWithRetry(
      `https://api.football-data.org/v4/competitions/${competition}/standings`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`football-data.org returned ${response.status}`);
    }
    return response.json();
  }, { serveStale: true });
}
