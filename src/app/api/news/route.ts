import { NextResponse } from "next/server";

const LEAGUE_QUERIES = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Ligue 1",
  "Serie A",
  "Eredivisie",
  "Primeira Liga",
];

// NewsData.io's "sports" category covers every sport, not just football -
// wrestling, cricket, tennis, motorsport etc. are all tagged "sports" too.
// Since some club names collide with unrelated things (a WWE wrestler's
// stage name is "Chelsea Green", for example), require football/soccer
// context explicitly in the search itself rather than relying only on
// the category filter.
function buildQuery(term: string): string {
  return `"${term}" AND (football OR soccer)`;
}

// Fetches one club/league's articles, retrying a couple of times on failure
// (a rate limit or network blip from NewsData.io) before giving up. Without
// this, a single failed request for one club would silently return no
// articles for that club - with nothing telling the page to try again -
// which is exactly what caused "needs a few refreshes" symptoms: with
// several clubs all queried at once, the odds that at least one of them
// hiccups goes up the more clubs you follow.
async function fetchNewsWithRetry(
  url: string,
  attempts = 3,
  delayMs = 600
): Promise<{ results?: unknown[] }> {
  for (let i = 0; i < attempts; i++) {
    try {
      // NewsData.io's free plan already delays articles by ~12 hours before
      // they're even available, so checking more often than that buys no
      // real freshness - it just burns through the free daily quota faster.
      // Refreshing every 3 hours still catches newly-available articles
      // promptly relative to that 12-hour delay, at a fraction of the cost.
      const res = await fetch(url, { next: { revalidate: 3 * 60 * 60 } });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fall through to retry
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return { results: [] };
}

export async function GET(request: Request) {
  const apiKey = process.env.NEWS_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const clubsParam = searchParams.get("clubs");
  const clubNames = clubsParam
    ? clubsParam
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const queries = clubNames.length > 0 ? clubNames : LEAGUE_QUERIES;

  try {
    const requests = queries.map((query) =>
      fetchNewsWithRetry(
        `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(
          buildQuery(query)
        )}&language=en&category=sports&size=10`
      )
    );

    const results = await Promise.all(requests);
    const allArticles = results.flatMap((result) => result.results ?? []);

    return NextResponse.json({ articles: allArticles });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}