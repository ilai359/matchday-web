import {
  FootballDataBusyError,
  isFootballDataUrl,
  noteFootballDataResponse,
  reserveFootballDataCall,
} from "@/lib/footballBudget";

// Retries a fetch a couple of times before giving up, instead of failing
// on the very first hiccup.
//
// football-data.org's free tier only allows 10 requests per minute,
// shared across every visitor to this app - and a single busy page (the
// match detail page especially, which can fire off 4-5 of these calls at
// once for live status, team info, and season history) can occasionally
// bump into that limit on its own. Before this, a single 429 (rate
// limited) or transient 5xx failure meant that section of the page just
// silently showed nothing, with no way to recover short of the user
// manually refreshing and hoping the timing worked out better - which is
// exactly the "Form/Head-to-Head doesn't show up at first" symptom this
// fixes. This generalizes the same retry idea already used for the news
// feed (see fetchNewsWithRetry in api/news/route.ts) so every
// football-data.org- and API-Football-backed route gets the same
// resilience, not just news.
//
// Only retries failures that stand a real chance of succeeding a moment
// later - a rate limit (429) or a server-side error (5xx). A 4xx like a
// bad API key (401) or an unknown competition code (404) will never
// succeed no matter how many times it's retried, so those are returned
// immediately instead of wasting attempts (and, for API-Football
// specifically, wasting its much smaller daily quota).
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  attempts = 3,
  delayMs = 600
): Promise<Response> {
  const footballData = isFootballDataUrl(url);
  let lastResponse: Response | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      // football-data.org: check the app-wide allowance first (throws
      // FootballDataBusyError if it's used up - see footballBudget.ts).
      if (footballData) await reserveFootballDataCall();
      const response = await fetch(url, init);
      if (footballData) await noteFootballDataResponse(response);
      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }
      lastResponse = response;
      // Retrying football-data.org's "too many requests" a split second
      // later can't work - the limit is per minute - and each retry only
      // uses up more of it. Give up on this one; the saved copy is used.
      if (footballData && response.status === 429) return response;
    } catch (error) {
      if (error instanceof FootballDataBusyError) throw error;
      if (i === attempts - 1) throw error;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Every attempt came back with a retryable failure (never a thrown
  // network error, or we'd have thrown above) - hand back the last
  // response so the caller can still read its status/body as normal.
  return lastResponse as Response;
}
