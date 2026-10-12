import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet, isCompetitionLive, getStaleOnly } from "@/lib/cache";

// Runs on Vercel's Edge Runtime instead of the default Node.js serverless
// runtime. This route only does fetch() calls and talks to Upstash Redis over
// its REST API (@upstash/redis) - no Node-only APIs (crypto, fs, the web-push
// library) - so it's safe to run on the edge. The payoff: on a low-traffic app
// like this one, functions sit cold between visits most of the day, and edge
// functions start markedly faster from cold than Node serverless functions do,
// plus they run from a location close to the visitor instead of one fixed
// region. Routes that need Node-only APIs (check-goals, push/test, anything
// touching src/lib/pushSubscriptions.ts) intentionally stay on the default
// runtime.
export const runtime = "edge";


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
    // Hold the table still while a match in this competition is in
    // progress, and only let it move once nothing's live anymore - so
    // position/points never shift mid-match, only once a result is
    // actually final. Cheap to check: it reuses the matches data the app
    // is already keeping fresh, no extra request to football-data.org.
    if (await isCompetitionLive(competition)) {
      const held = await getStaleOnly(`standings:${competition}`);
      if (held !== null) {
        return NextResponse.json(held);
      }
      // No earlier snapshot to hold onto yet (e.g. first ever request
      // for this competition happens to land mid-match) - fall through
      // and fetch once rather than show nothing.
    }

    // Using the shared Redis cache (getOrSet) instead of Next's own fetch
    // cache. This matters here specifically: Next's fetch cache has no
    // fallback if a live request happens to land during football-data.org's
    // shared 10-requests/minute rate limit - it just fails and the league
    // table shows nothing. getOrSet instead serves the last known-good
    // table in that case (a rate limit clears within about a minute, so a
    // table that's a minute stale beats a blank one), and never caches the
    // failure itself. Same fix already applied to finished-matches and
    // team-info for the same reason.
    // Used to be 5 minutes. Once a match ends and the freeze above lifts,
    // this TTL is now the only thing standing between "match just
    // finished" and "table shows the real result" - 5 minutes made that
    // feel broken/slow. Matching the ~60s cadence everything else in the
    // app already updates on instead.
    const data = await getOrSet(
      `standings:${competition}`,
      60 * 1000,
      async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/standings`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return response.json();
      }
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error(`standings failed for competition=${competition}`, error);
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
