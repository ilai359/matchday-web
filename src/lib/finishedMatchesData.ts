import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { slimMatchesResponse } from "@/lib/slimFootballData";
import { getOrSet } from "@/lib/cache";

/**
 * Cached finished-matches list for a competition+season, shared by
 * /api/finished-matches (real visitors) and /api/club-bundle (the Club
 * page's aggregated fetch) so both agree on the same cache key/TTL.
 */
export async function getFinishedMatches(
  competition: string,
  season: string | null,
  apiKey: string
) {
  const seasonParam = season ? `&season=${season}` : "";

  const now = new Date();
  const currentSeasonYear =
    now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const isCurrentSeason = !season || Number(season) === currentSeasonYear;
  // Past seasons never change once they're over, so they're cached much
  // longer than the current season (which still gets new results added).
  const ttlMs = isCurrentSeason ? 5 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

  const cacheKey = `finished-matches:${competition}:${season ?? "current"}`;

  return getOrSet(cacheKey, ttlMs, async () => {
    const response = await fetchWithRetry(
      `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED${seasonParam}`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`football-data.org returned ${response.status}`);
    }
    return slimMatchesResponse(await response.json());
  }, { serveStale: true });
}
