import { NextResponse } from "next/server";
import { cdnCacheHeaders } from "@/lib/httpCache";
import { getMatches } from "@/lib/matchesData";
import { COMPETITIONS } from "@/lib/competitions";

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

  // Only ask football-data.org for the leagues someone's actually
  // watching (their followed clubs' leagues), instead of always asking
  // for all 8. "leagues" present but empty means the caller genuinely
  // has nothing to ask for yet (e.g. no clubs followed) - fetch nothing.
  // "leagues" missing entirely (an older cached page that doesn't send
  // it yet, or a direct call) falls back to the full list.
  const { searchParams } = new URL(request.url);
  const leaguesParam = searchParams.get("leagues");
  const requestedCompetitions =
    leaguesParam === null
      ? COMPETITIONS
      : leaguesParam.split(",").map((code) => code.trim());

  try {
    // Fetch/cache/dedup logic now lives in src/lib/matchesData.ts,
    // shared with /api/club-bundle - see that file.
    const data = await getMatches(requestedCompetitions, apiKey);
    return NextResponse.json(data, { headers: cdnCacheHeaders(30, 60) });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
