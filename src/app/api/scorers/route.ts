import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";

// How many players per league to ask football-data.org for. Was 50
// (known to work). Trying 100 here - the general shape of their docs
// mentions 100 as a common default for list endpoints, but doesn't
// confirm a max specifically for this endpoint, and 100 is the exact
// value that broke this route once before (see git history: "Revert
// scorers limit back to 50 - 100 broke the whole list"). Trying it again
// now that this route has a safety net it didn't have last time: getOrSet
// below serves the last known-good list instead of nothing if this fails,
// and the cache key includes the limit value specifically so this change
// gets its own fresh cache slot - old scorers:{competition}:50 entries
// are untouched, so reverting this one line instantly falls back to
// whatever was already cached under that key, no gap.
const SCORERS_LIMIT = 100;

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition");
  if (!competition) {
    return NextResponse.json(
      { error: "Missing competition code" },
      { status: 400 }
    );
  }

  try {
    // Same reasoning as standings/route.ts: the shared Redis cache
    // (getOrSet) falls back to the last known-good scorers list instead of
    // showing nothing when a live request lands during football-data.org's
    // shared rate limit, instead of Next's own fetch cache which has no
    // such fallback.
    const data = await getOrSet(
      `scorers:${competition}:${SCORERS_LIMIT}`,
      6 * 60 * 60 * 1000,
      async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/scorers?limit=${SCORERS_LIMIT}`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(
            `football-data.org returned ${response.status} for limit=${SCORERS_LIMIT}`
          );
        }
        return response.json();
      }
    );
    return NextResponse.json(data);
  } catch (error) {
    // Logged with the exact limit that failed, so if this experiment
    // doesn't pan out, Vercel's Logs (Project -> Logs, filter for
    // "scorers failed") will show exactly why - the real HTTP status
    // football-data.org returned, not a guess.
    console.error(
      `scorers failed for competition=${competition} limit=${SCORERS_LIMIT}`,
      error
    );
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
