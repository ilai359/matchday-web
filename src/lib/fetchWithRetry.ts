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
  let lastResponse: Response | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }
      lastResponse = response;
    } catch (error) {
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
