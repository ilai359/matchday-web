import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet, invalidate } from "@/lib/cache";

// Top-scorer tables only ever change as a side effect of a match being
// played (someone scores, or doesn't), and matches for any one
// competition happen at most a handful of times a week - never
// continuously the way live scores do. There's no benefit to re-checking
// this more than a few times a day on a timer alone, so the passive TTL
// is long (24h). Freshness right when it matters (just after a match
// actually finishes) comes from refreshScorersAfterMatch below instead,
// called by check-goals the moment it confirms a match is over - not
// from shortening this TTL.
const SCORERS_TTL_MS = 24 * 60 * 60 * 1000;

function scorersCacheKey(competition: string): string {
  return `scorers:${competition}`;
}

async function fetchScorersFromApi(competition: string, apiKey: string) {
  const response = await fetchWithRetry(
    `https://api.football-data.org/v4/competitions/${competition}/scorers?limit=50`,
    { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error(`football-data.org returned ${response.status}`);
  }
  return response.json();
}

/**
 * Cached top-scorers list for a competition. Shared by /api/scorers
 * (real visitors) and check-goals (to force a refresh after a match) so
 * both always agree on the same cache key/TTL/fetch logic.
 */
export async function getScorers(competition: string, apiKey: string) {
  return getOrSet(scorersCacheKey(competition), SCORERS_TTL_MS, () =>
    fetchScorersFromApi(competition, apiKey)
  );
}

/**
 * Called by check-goals right after it confirms a match in `competition`
 * has finished. Clears the cached scorers list for that competition and
 * immediately re-fetches it, so anyone opening a club/competition page
 * afterwards sees goals from that match reflected right away, instead of
 * whatever was cached for up to another 24 hours. Errors are swallowed -
 * this is a nice-to-have freshness bump, never worth failing check-goals'
 * other, more important work (notifications) over.
 */
export async function refreshScorersAfterMatch(
  competition: string,
  apiKey: string
): Promise<void> {
  try {
    await invalidate(scorersCacheKey(competition));
    await getScorers(competition, apiKey);
  } catch (error) {
    console.error(
      `refreshScorersAfterMatch: failed to refresh scorers for ${competition}`,
      error
    );
  }
}
